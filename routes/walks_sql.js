const express = require("express");
const router = express.Router();
const Pool = require("../db");

// GET /walks - Récupérer toutes les balades
router.get("/", async (req, res) => {
	try {
		const sqlResult = await Pool.query("SELECT * FROM walks");

		res.status(200).json({
			result: true,
			nbOfWalks: sqlResult.rowCount,
			allWalks: sqlResult.rows,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// POST /walks - Ajouter une balade
router.post("/", async (req, res) => {
	const meetings = JSON.stringify(req.body.meetings);
	const { date, time, duration, walked_dog, walking_human, pooped, peed } =
		req.body;

	try {
		const sqlResult = await Pool.query(
			"INSERT INTO walks (date, time, duration, meetings, pooped, peed, walked_dog, walking_human) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
			[date, time, duration, meetings, pooped, peed, walked_dog, walking_human],
		);

		res.status(200).json({ result: true, savedBalade: sqlResult.rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// DELETE Supprimer une balade
router.delete("/:walkId", async (req, res) => {
	const { walkId } = req.params;

	try {
		const sqlResult = await Pool.query(
			"DELETE FROM walks WHERE id = $1 RETURNING *",
			[walkId],
		);
		res.status(200).json({ result: true, deletedWalk: sqlResult.rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

module.exports = router;
