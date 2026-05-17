require("dotenv").config();
require("./models/connection");
const express = require("express");
const app = express();
const Balade = require("./models/balades");
const Chien = require("./models/chiens");
const cors = require("cors");
const chiensRouter = require("./routes/chiens");
const dogsRouter = require("./routes/dogs_sql");
const baladesRouter = require("./routes/balades");
const walksRouter = require("./routes/walks_sql");
const humansRouter = require("./routes/humans_sql");

app.use(cors());
app.use(express.json());

app.use("/chiens", chiensRouter);
app.use("/dogs", dogsRouter);
app.use("/balades", baladesRouter);
app.use("/walks", walksRouter);
app.use("/humans", humansRouter);

app.get("/", (req, res) => {
	res.json({ message: "Bienvenue sur l'API Storm Tracker !" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
