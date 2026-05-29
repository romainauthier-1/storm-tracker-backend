const express = require("express");
const router = express.Router();
const Pool = require("../db");

// GET /walks - Récupérer toutes les balades
router.get("/", async (req, res) => {
	try {
		const sqlResult = await Pool.query("SELECT * FROM walks");

		const walksWithDogName = await Pool.query(
			"SELECT walks.*, dogs.name AS dog_name FROM walks JOIN dogs ON walks.walked_dog = dogs.id",
		);

		res.status(200).json({
			result: true,
			nbOfWalks: walksWithDogName.rowCount,
			allWalks: walksWithDogName.rows,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// POST /walks - Ajouter une balade
router.post("/", async (req, res) => {
	const meetings = JSON.stringify(req.body.meetings);
	const {
		date,
		time,
		duration,
		walked_dog,
		walking_human,
		pooped,
		peed,
		notes,
	} = req.body;

	try {
		const sqlResult = await Pool.query(
			"INSERT INTO walks (date, time, duration, meetings, pooped, peed, walked_dog, walking_human, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
			[
				date,
				time,
				duration,
				meetings,
				pooped,
				peed,
				walked_dog,
				walking_human,
				notes,
			],
		);

		if (sqlResult.rowCount === 0) {
			return res
				.status(400)
				.json({ result: false, message: "Balade non ajoutée." });
		}

		const dogName = await Pool.query(
			"SELECT walks.*, dogs.name AS dog_name FROM walks JOIN dogs ON walks.walked_dog = dogs.id WHERE walks.id = $1",
			[sqlResult.rows[0].id],
		);

		res.status(200).json({
			result: true,
			savedWalk: dogName.rows[0],
			message: "Balade ajoutée !",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// UPDATE Mettre à jour une balade
router.patch("/update/:walkId", async (req, res) => {
	const { walkId } = req.params;
	const queryParts = []; // récupérer les strings avec $1, $2, etc pour SQL
	const queryValues = []; // récupérer les valeurs dans le même ordre

	try {
		for (const [key, value] of Object.entries(req.body)) {
			// [["duration": 15], ["notes": "Cool"]]
			queryValues.push(value);
			queryParts.push(`${key} = $${queryValues.length}`);
		}

		const queryString = queryParts.join(", ");

		const sqlResult = await Pool.query(
			`UPDATE walks SET ${queryString} WHERE id = ${walkId} RETURNING *`,
			queryValues,
		);

		if (sqlResult.rowCount === 0) {
			return res
				.status(404)
				.json({ result: false, message: "Balade non trouvée." });
		}

		res.status(200).json({
			result: true,
			updatedWalk: sqlResult.rows[0],
			message: "Balade mise à jour !",
		});
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
		res.status(200).json({
			result: true,
			deletedWalk: sqlResult.rows[0],
			message: "Balade supprimée !",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// GET /walks/:humanId - Récupérer toutes les balades d'un humain
router.get("/:humanId", async (req, res) => {
	const { humanId } = req.params;

	try {
		const sqlResult = await Pool.query(
			"SELECT * FROM walks WHERE walking_human = $1",
			[humanId],
		);

		if (sqlResult.rowCount === 0) {
			return res.status(404).json({
				result: false,
				message: "Pas de balades pour cet.te humain.e",
			});
		}

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

module.exports = router;
