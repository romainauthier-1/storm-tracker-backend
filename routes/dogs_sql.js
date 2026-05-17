const express = require("express");
const router = express.Router();
const Pool = require("../db");

// GET /dogs - Récupérer tous les chiens
router.get("/", async (req, res) => {
	try {
		const sqlResult = await Pool.query("SELECT * FROM dogs");
		// Vérifier qu'il y a une réponse (.length, propriété particulière SQL ?)
		res.status(200).json({
			result: true,
			allDogs: sqlResult.rows,
			nbOfDogs: sqlResult.rowCount,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// POST /dogs - Ajouter un nouveau chien
router.post("/", async (req, res) => {
	const { name, human, birth_date, gender, race1, race2 } = req.body;

	try {
		const sqlResult = await Pool.query(
			"INSERT INTO dogs (name, human, birth_date, gender, race1, race2) VALUES ($1, $2, $3, $4, $5, $6) RETURNING*",
			[name, human, birth_date, gender, race1, race2],
		);

		res.status(200).json({ result: true, savedDog: sqlResult.rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// DELETE Supprimer un chien
router.delete("/:dogId", async (req, res) => {
	const { dogId } = req.params;

	try {
		const sqlResult = await Pool.query(
			"DELETE FROM dogs WHERE id = $1 RETURNING *",
			[dogId],
		);
		res.status(200).json({ result: true, deletedDog: sqlResult.rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

module.exports = router;
