// Tiny migration runner. Applies migrations/*.sql in filename order, once each,
// tracked in the schema_migrations table. Each file runs inside a transaction.
//
//   node scripts/migrate.js            apply pending migrations
//   node scripts/migrate.js --status   show applied / pending, apply nothing
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const Pool = require("../db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

async function ensureTable() {
	await Pool.query(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename   text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`);
}

function migrationFiles() {
	if (!fs.existsSync(MIGRATIONS_DIR)) return [];
	return fs
		.readdirSync(MIGRATIONS_DIR)
		.filter((name) => name.endsWith(".sql"))
		.sort();
}

async function appliedSet() {
	const { rows } = await Pool.query("SELECT filename FROM schema_migrations");
	return new Set(rows.map((row) => row.filename));
}

async function status() {
	const applied = await appliedSet();
	for (const file of migrationFiles()) {
		console.log(`${applied.has(file) ? "[x]" : "[ ]"} ${file}`);
	}
}

async function migrate() {
	const applied = await appliedSet();
	const pending = migrationFiles().filter((file) => !applied.has(file));

	if (pending.length === 0) {
		console.log("Aucune migration en attente.");
		return;
	}

	for (const file of pending) {
		const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
		const client = await Pool.connect();
		try {
			await client.query("BEGIN");
			await client.query(sql);
			await client.query(
				"INSERT INTO schema_migrations (filename) VALUES ($1)",
				[file],
			);
			await client.query("COMMIT");
			console.log(`applied ${file}`);
		} catch (err) {
			await client.query("ROLLBACK");
			console.error(`failed ${file}: ${err.message}`);
			throw err;
		} finally {
			client.release();
		}
	}
}

(async () => {
	try {
		await ensureTable();
		if (process.argv.includes("--status")) {
			await status();
		} else {
			await migrate();
		}
	} catch (err) {
		console.error(err.message);
		process.exitCode = 1;
	} finally {
		await Pool.end();
	}
})();
