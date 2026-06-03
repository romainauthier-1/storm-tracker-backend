require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const dogsRouter = require("./routes/dogs_sql");
const walksRouter = require("./routes/walks_sql");
const humansRouter = require("./routes/humans_sql");

app.use(
	cors({
		origin: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}),
);
app.use(express.json());

app.use("/dogs", dogsRouter);
app.use("/walks", walksRouter);
app.use("/humans", humansRouter);

app.get("/", (req, res) => {
	res.json("🐕 Bienvenue sur l'API Storm Tracker !");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
