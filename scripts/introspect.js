// Photographie du schéma réel de la base (colonnes, contraintes, index,
// volumétrie) à comparer avec migrations/. Lit .env via dotenv (comme le
// serveur), donc aucun secret à passer en ligne de commande.
//
//   node scripts/introspect.js      (ou: yarn introspect)
require("dotenv").config({ quiet: true });
const Pool = require("../db");

const TABLES = [
	"humans",
	"dogs",
	"walks",
	"request_logs",
	"schema_migrations",
];

async function section(title, sql, params = []) {
	console.log(`\n=== ${title} ===`);
	const { rows } = await Pool.query(sql, params);
	if (rows.length === 0) {
		console.log("(vide)");
	} else {
		console.table(rows);
	}
}

(async () => {
	try {
		await section(
			"Colonnes",
			`SELECT table_name, ordinal_position AS pos, column_name,
			        data_type, udt_name, is_nullable, column_default
			 FROM information_schema.columns
			 WHERE table_schema = 'public' AND table_name = ANY($1)
			 ORDER BY table_name, ordinal_position`,
			[TABLES],
		);

		await section(
			"Types énumérés (enum)",
			`SELECT t.typname AS enum_type, e.enumlabel AS value
			 FROM pg_type t
			 JOIN pg_enum e ON e.enumtypid = t.oid
			 JOIN pg_namespace n ON n.oid = t.typnamespace
			 WHERE n.nspname = 'public'
			 ORDER BY t.typname, e.enumsortorder`,
		);

		await section(
			"Clauses CHECK",
			`SELECT rel.relname AS table_name, con.conname AS constraint_name,
			        pg_get_constraintdef(con.oid) AS definition
			 FROM pg_constraint con
			 JOIN pg_class rel ON rel.oid = con.conrelid
			 JOIN pg_namespace n ON n.oid = rel.relnamespace
			 WHERE n.nspname = 'public' AND con.contype = 'c'
			   AND rel.relname = ANY($1)
			 ORDER BY rel.relname, con.conname`,
			[TABLES],
		);

		await section(
			"Contraintes (PK / FK / UNIQUE / CHECK)",
			`SELECT tc.table_name, tc.constraint_type, tc.constraint_name,
			        kcu.column_name,
			        ccu.table_name  AS references_table,
			        ccu.column_name AS references_column
			 FROM information_schema.table_constraints tc
			 LEFT JOIN information_schema.key_column_usage kcu
			        ON kcu.constraint_name = tc.constraint_name
			       AND kcu.table_schema = tc.table_schema
			 LEFT JOIN information_schema.constraint_column_usage ccu
			        ON ccu.constraint_name = tc.constraint_name
			       AND ccu.table_schema = tc.table_schema
			 WHERE tc.table_schema = 'public' AND tc.table_name = ANY($1)
			 ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name`,
			[TABLES],
		);

		await section(
			"Index",
			`SELECT tablename, indexname, indexdef
			 FROM pg_indexes
			 WHERE schemaname = 'public' AND tablename = ANY($1)
			 ORDER BY tablename, indexname`,
			[TABLES],
		);

		console.log("\n=== Volumétrie ===");
		for (const table of ["humans", "dogs", "walks"]) {
			try {
				const { rows } = await Pool.query(
					`SELECT count(*)::int AS n FROM ${table}`,
				);
				console.log(`  ${table.padEnd(18)} ${rows[0].n}`);
			} catch (err) {
				console.log(`  ${table.padEnd(18)} (absente : ${err.message})`);
			}
		}
	} catch (err) {
		console.error("Échec :", err.message);
		process.exitCode = 1;
	} finally {
		await Pool.end();
	}
})();
