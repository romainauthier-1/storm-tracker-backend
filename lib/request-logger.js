const Pool = require("../db");

// Path segments that are all digits become ":id" so that /dogs/42 and /dogs/7
// aggregate under the same route in the dashboard.
function normalisePath(pathname) {
	return pathname
		.split("/")
		.map((segment) => (/^\d+$/.test(segment) ? ":id" : segment))
		.join("/");
}

async function insertLog(row) {
	try {
		await Pool.query(
			`INSERT INTO request_logs (method, path, route, status, duration_ms, ip)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[row.method, row.path, row.route, row.status, row.duration_ms, row.ip],
		);
	} catch (err) {
		// Never let observability break a request; just leave a server-side trace.
		console.error("request_logs insert failed:", err.message);
	}
}

// Records every finished request. Disabled with REQUEST_LOG=off. Skips the
// dashboard's own polling so it doesn't drown out real traffic.
//
// The full path is captured now, at middleware entry: Express rewrites req.url
// (and therefore req.path) as it descends into routers, and res "finish" fires
// after that, so reading req.path late would give the router-local path.
module.exports = function requestLogger(req, res, next) {
	const fullPath = (req.originalUrl || req.url || "").split("?")[0];

	if (process.env.REQUEST_LOG === "off" || fullPath.startsWith("/status")) {
		return next();
	}

	const method = req.method;
	const ip = req.ip || null;
	const startedAt = process.hrtime.bigint();

	res.on("finish", () => {
		const durationMs = Math.round(
			Number((process.hrtime.bigint() - startedAt) / 1000n) / 1000,
		);
		insertLog({
			method,
			path: fullPath.slice(0, 500),
			route: normalisePath(fullPath || "unknown").slice(0, 200),
			status: res.statusCode,
			duration_ms: durationMs,
			ip,
		});
	});

	next();
};
