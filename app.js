require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const requestLogger = require("./lib/request-logger");
const dogsRouter = require("./routes/dogs_sql");
const walksRouter = require("./routes/walks_sql");
const humansRouter = require("./routes/humans_sql");
const monitoringRouter = require("./routes/monitoring");

const app = express();

// Required behind Vercel so req.ip / req.protocol are correct (rate-limit keying,
// future redirect URIs).
app.set("trust proxy", 1);

// CORS_ORIGINS = comma-separated allowlist. Unset => reflect any origin (dev).
const corsOrigins = (process.env.CORS_ORIGINS || "")
	.split(",")
	.map((value) => value.trim())
	.filter(Boolean);
if (corsOrigins.length === 0) {
	console.warn("CORS_ORIGINS is not set — every origin is allowed.");
}
app.use(
	cors({
		origin: corsOrigins.length > 0 ? corsOrigins : true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}),
);

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(requestLogger);

app.get("/", (req, res) => {
	res.json("🐕 Bienvenue sur l'API Storm Tracker !");
});

app.use("/", monitoringRouter);
app.use("/dogs", dogsRouter);
app.use("/walks", walksRouter);
app.use("/humans", humansRouter);

// 404 — no route matched.
app.use((req, res) => {
	res.status(404).json({ result: false, message: "Route inconnue" });
});

// Central error handler. Never leaks raw driver messages for 5xx; translates the
// common Postgres error codes into friendly 4xx responses.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	const pgStatus = {
		"23505": [409, "Ressource déjà existante"],
		"23503": [400, "Référence invalide (chien ou humain inexistant)"],
		"23502": [400, "Champ obligatoire manquant"],
		"23514": [400, "Valeur hors des limites autorisées"],
		"22P02": [400, "Format de donnée invalide"],
	}[err.code];

	const status = pgStatus ? pgStatus[0] : err.status || err.statusCode || 500;

	if (status >= 500) {
		console.error(err);
	}

	const message = pgStatus
		? pgStatus[1]
		: err.expose && err.message
			? err.message
			: "Erreur serveur";

	res.status(status).json({ result: false, message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});

module.exports = app;
