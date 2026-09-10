const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const Pool = require("../db");

// --- helpers ---------------------------------------------------------------

async function pingDb(timeoutMs = 2000) {
	const timeout = new Promise((_, reject) =>
		setTimeout(() => reject(new Error("db timeout")), timeoutMs),
	);
	try {
		await Promise.race([Pool.query("SELECT 1"), timeout]);
		return true;
	} catch {
		return false;
	}
}

function healthPayload(dbOk) {
	const mem = process.memoryUsage();
	return {
		status: dbOk ? "ok" : "degraded",
		uptime_s: Math.round(process.uptime()),
		db: dbOk ? "ok" : "down",
		memory_mb: Math.round(mem.rss / 1048576),
		node: process.version,
		now: new Date().toISOString(),
	};
}

function safeEqual(a, b) {
	const bufA = Buffer.from(String(a));
	const bufB = Buffer.from(String(b));
	return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Guards /status and /status/data. 503 if unconfigured, 401 if token missing/wrong.
function requireStatusToken(req, res, next) {
	const expected = process.env.STATUS_TOKEN;
	if (!expected) {
		return res
			.status(503)
			.json({ result: false, message: "STATUS_TOKEN non configuré" });
	}
	const provided = req.query.token || req.get("x-status-token") || "";
	if (!safeEqual(provided, expected)) {
		return res.status(401).json({ result: false, message: "Token invalide" });
	}
	next();
}

// --- routes --------------------------------------------------------------

// Public liveness probe.
router.get("/health", async (req, res) => {
	const dbOk = await pingDb();
	res.status(dbOk ? 200 : 503).json(healthPayload(dbOk));
});

// Aggregated data for the dashboard (auth: token).
router.get("/status/data", requireStatusToken, async (req, res) => {
	const dbOk = await pingDb();

	const [totals, statusClasses, topRoutes, recent] = await Promise.all([
		Pool.query(`
			SELECT count(*)::int AS total,
			       coalesce(sum((status >= 500)::int), 0)::int AS server_errors,
			       coalesce(sum((status >= 400 AND status < 500)::int), 0)::int AS client_errors,
			       coalesce(round(avg(duration_ms)), 0)::int AS avg_ms
			FROM request_logs
			WHERE ts > now() - interval '24 hours'
		`),
		Pool.query(`
			SELECT (status / 100) * 100 AS class, count(*)::int AS hits
			FROM request_logs
			WHERE ts > now() - interval '24 hours'
			GROUP BY 1 ORDER BY 1
		`),
		Pool.query(`
			SELECT route,
			       count(*)::int AS hits,
			       coalesce(round(avg(duration_ms)), 0)::int AS avg_ms,
			       coalesce(
			         percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0
			       )::int AS p95_ms,
			       coalesce(sum((status >= 500)::int), 0)::int AS errors
			FROM request_logs
			WHERE ts > now() - interval '24 hours'
			GROUP BY route
			ORDER BY hits DESC
			LIMIT 10
		`),
		Pool.query(`
			SELECT ts, method, route, status, duration_ms
			FROM request_logs
			ORDER BY ts DESC
			LIMIT 50
		`),
	]);

	res.json({
		generated_at: new Date().toISOString(),
		health: healthPayload(dbOk),
		totals: totals.rows[0],
		statusClasses: statusClasses.rows,
		topRoutes: topRoutes.rows,
		recent: recent.rows,
	});
});

// The dashboard page. Self-contained; one relaxed CSP for this route only so the
// inline <style>/<script> run while everything else stays locked down.
router.get("/status", requireStatusToken, (req, res) => {
	res.setHeader(
		"Content-Security-Policy",
		"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'",
	);
	res.type("html").send(STATUS_PAGE_HTML);
});

const STATUS_PAGE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Storm Tracker — santé serveur</title>
<style>
	:root { color-scheme: light dark; --bg:#f7f7f8; --card:#fff; --ink:#1a1a1a; --mut:#666; --line:#e3e3e6; --ok:#1a7f37; --warn:#9a6700; --err:#cf222e; }
	@media (prefers-color-scheme: dark) {
		:root { --bg:#16171a; --card:#1f2024; --ink:#e8e8ea; --mut:#9a9aa2; --line:#33343a; --ok:#3fb950; --warn:#d29922; --err:#f85149; }
	}
	* { box-sizing:border-box; }
	body { margin:0; padding:24px; background:var(--bg); color:var(--ink); font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
	h1 { font-size:18px; margin:0 0 16px; }
	.muted { color:var(--mut); }
	.grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); margin-bottom:16px; }
	.card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; }
	.card .k { color:var(--mut); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
	.card .v { font-size:24px; font-weight:600; margin-top:4px; }
	table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
	th, td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--line); }
	th { color:var(--mut); font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
	tr:last-child td { border-bottom:none; }
	td.num { text-align:right; font-variant-numeric:tabular-nums; }
	.pill { display:inline-block; min-width:38px; text-align:center; padding:1px 6px; border-radius:6px; font-variant-numeric:tabular-nums; }
	.s2 { color:var(--ok); } .s3 { color:var(--mut); } .s4 { color:var(--warn); } .s5 { color:var(--err); font-weight:700; }
	.dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; }
	.dot.ok { background:var(--ok); } .dot.down { background:var(--err); }
	section { margin-bottom:24px; }
	h2 { font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--mut); margin:0 0 8px; }
	#err { color:var(--err); }
</style>
</head>
<body>
<h1>🐕 Storm Tracker — santé serveur <span class="muted" id="stamp"></span></h1>
<p id="err" hidden></p>

<div class="grid" id="health"></div>

<section>
	<h2>Dernières 24 h</h2>
	<div class="grid" id="totals"></div>
</section>

<section>
	<h2>Routes les plus demandées (24 h)</h2>
	<table id="routes"><thead><tr>
		<th>Route</th><th class="num">Hits</th><th class="num">Moy. ms</th><th class="num">p95 ms</th><th class="num">5xx</th>
	</tr></thead><tbody></tbody></table>
</section>

<section>
	<h2>50 dernières requêtes</h2>
	<table id="recent"><thead><tr>
		<th>Heure</th><th>Méthode</th><th>Route</th><th class="num">Statut</th><th class="num">ms</th>
	</tr></thead><tbody></tbody></table>
</section>

<script>
	var token = new URLSearchParams(location.search).get("token") || "";
	var errEl = document.getElementById("err");

	function statusClass(s) { return "s" + Math.floor(s / 100); }
	function esc(v) { return String(v).replace(/[&<>]/g, function (c) { return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" })[c]; }); }
	function card(k, v) { return '<div class="card"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>'; }

	function render(d) {
		errEl.hidden = true;
		document.getElementById("stamp").textContent = "· maj " + new Date(d.generated_at).toLocaleTimeString();

		var h = d.health;
		document.getElementById("health").innerHTML =
			'<div class="card"><div class="k">État</div><div class="v"><span class="dot ' + (h.db === "ok" ? "ok" : "down") + '"></span>' + esc(h.status) + '</div></div>' +
			card("Base de données", h.db) +
			card("Uptime", Math.floor(h.uptime_s / 3600) + "h " + Math.floor((h.uptime_s % 3600) / 60) + "m") +
			card("Mémoire (RSS)", h.memory_mb + " Mo") +
			card("Node", h.node);

		var t = d.totals || {};
		var byClass = {};
		(d.statusClasses || []).forEach(function (r) { byClass[r.class] = r.hits; });
		document.getElementById("totals").innerHTML =
			card("Requêtes", t.total || 0) +
			card("2xx", byClass[200] || 0) +
			card("4xx", t.client_errors || 0) +
			card("5xx", t.server_errors || 0) +
			card("Latence moy.", (t.avg_ms || 0) + " ms");

		document.querySelector("#routes tbody").innerHTML = (d.topRoutes || []).map(function (r) {
			return "<tr><td>" + esc(r.route) + '</td><td class="num">' + r.hits +
				'</td><td class="num">' + r.avg_ms + '</td><td class="num">' + r.p95_ms +
				'</td><td class="num ' + (r.errors ? "s5" : "") + '">' + r.errors + "</td></tr>";
		}).join("") || '<tr><td colspan="5" class="muted">Aucune donnée</td></tr>';

		document.querySelector("#recent tbody").innerHTML = (d.recent || []).map(function (r) {
			return "<tr><td>" + new Date(r.ts).toLocaleTimeString() + "</td><td>" + esc(r.method) +
				"</td><td>" + esc(r.route) + '</td><td class="num"><span class="pill ' + statusClass(r.status) + '">' +
				r.status + '</span></td><td class="num">' + r.duration_ms + "</td></tr>";
		}).join("") || '<tr><td colspan="5" class="muted">Aucune donnée</td></tr>';
	}

	function tick() {
		fetch("/status/data?token=" + encodeURIComponent(token))
			.then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
			.then(render)
			.catch(function (e) { errEl.hidden = false; errEl.textContent = "Erreur de chargement : " + e.message; });
	}

	tick();
	setInterval(tick, 5000);
</script>
</body>
</html>`;

module.exports = router;
