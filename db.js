const pg = require("pg");

let Pool;

if (process.env.DB_CONNECTION_STRING) {
	Pool = new pg.Pool({
		connectionString: process.env.EXPO_PUBLIC_DB_CONNECTION_STRING,
		ssl: { rejectUnauthorized: false },
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
