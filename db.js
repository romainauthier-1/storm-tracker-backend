const pg = require("pg");

// Neon (and most hosted Postgres) require TLS, but a local disposable database
// for tests does not. SSL is on by default when a connection string is used;
// set DB_SSL=disable (or put sslmode=disable in the URL) to turn it off locally.
const connectionString = process.env.DB_CONNECTION_STRING;
const sslDisabled =
	process.env.DB_SSL === "disable" ||
	/[?&]sslmode=disable\b/.test(connectionString || "");

let Pool;

if (connectionString) {
	Pool = new pg.Pool({
		connectionString,
		ssl: sslDisabled ? false : { rejectUnauthorized: false },
	});
} else {
	Pool = new pg.Pool({
		user: process.env.DB_USER,
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		password: process.env.DB_PASSWORD,
		port: process.env.DB_PORT,
	});
}

module.exports = Pool;
