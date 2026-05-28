const express = require("express");
const router = express.Router();
const Pool = require("../db");
const { body, validationResult } = require("express-validator");

const validate = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({
			result: false,
			message: errors.array()[0].msg,
		});
	}
	next();
};

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
router.post(
	"/",
	[
		body("name")
			.notEmpty()
			.withMessage("Cette boule de poil a forcément un nom !"),
		body("human").notEmpty().withMessage("Impossible d'itentifier l'humain.e"),
	],
	validate,
	async (req, res) => {
		const { name, human, birth_date, gender, race1, race2 } = req.body;

		try {
			const checkDog = await Pool.query(
				"SELECT * FROM dogs WHERE human = $1 AND name = $2",
				[human, name],
			);

			if (checkDog.rowsCount > 0) {
				return res.status(400).json({
					result: false,
					message: "Un animal à ce nom existe déjà pour cet.te humain.e",
				});
			}

			const sqlResult = await Pool.query(
				"INSERT INTO dogs (name, human, birth_date, gender, race1, race2) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
				[name, human, birth_date, gender, race1, race2],
			);

			res.status(200).json({
				result: true,
				savedDog: sqlResult.rows[0],
				message: `${sqlResult.rows[0].name} a été ajouté !`,
			});
		} catch (err) {
			console.error(err);
			res.status(500).json({ result: false, message: err.message });
		}
	},
);

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

// UPDATE Mettre à jour un chien
router.patch("/update/:dogId", async (req, res) => {
	const { dogId } = req.params;
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
			`UPDATE dogs SET ${queryString} WHERE id = ${dogId} RETURNING *`,
			queryValues,
		);

		if (sqlResult.rowCount === 0) {
			return res
				.status(404)
				.json({ result: false, message: "Animal non trouvé" });
		}

		res.status(200).json({
			result: true,
			updatedDog: sqlResult.rows[0],
			message: "Profil animal mis à jour !",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// GET Récupérer le(s) chien(s) selon l'id de l'humain
router.get("/mydogs/:humanId", async (req, res) => {
	const { humanId } = req.params;

	try {
		const sqlResult = await Pool.query("SELECT * FROM dogs WHERE human = $1", [
			humanId,
		]);

		if (sqlResult.rowCount === 0) {
			return res
				.status(404)
				.json({ result: false, message: "Pas d'humain pour cet animal." });
		}

		res.status(200).json({ result: true, dogs: sqlResult.rows });
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

module.exports = router;
