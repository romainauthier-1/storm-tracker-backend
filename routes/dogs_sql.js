const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");

const Pool = require("../db");
const validate = require("../lib/validate");
const httpError = require("../lib/http-error");
const buildPartialUpdate = require("../lib/partial-update");

// Columns a client is allowed to change through PATCH /update/:dogId.
const DOG_UPDATABLE_COLUMNS = [
	"name",
	"human",
	"birth_date",
	"gender",
	"race1",
	"race2",
];

// dogs.gender is the Postgres enum gender_enum. Validate on write so a bad value
// returns a clean 400 instead of a 500 from the driver. (PATCH goes through the
// generic partial update and is not value-checked yet.)
const GENDER_VALUES = ["MALE", "FEMALE", "INCONNU"];

const idParam = (name) =>
	param(name).isInt({ min: 1 }).withMessage("Identifiant invalide");

// GET /dogs - Récupérer tous les chiens
router.get("/", async (req, res) => {
	const sqlResult = await Pool.query("SELECT * FROM dogs ORDER BY id");
	res.status(200).json({
		result: true,
		allDogs: sqlResult.rows,
		nbOfDogs: sqlResult.rowCount,
	});
});

// POST /dogs - Ajouter un nouveau chien
router.post(
	"/",
	[
		body("name")
			.notEmpty()
			.withMessage("Cette boule de poil a forcément un nom !"),
		body("human").notEmpty().withMessage("Impossible d'identifier l'humain.e"),
		body("gender")
			.optional({ values: "falsy" })
			.isIn(GENDER_VALUES)
			.withMessage("Genre invalide"),
	],
	validate,
	async (req, res) => {
		const { name, human, birth_date, gender, race1, race2 } = req.body;

		const checkDog = await Pool.query(
			"SELECT id FROM dogs WHERE human = $1 AND name = $2",
			[human, name],
		);
		if (checkDog.rowCount > 0) {
			throw httpError(
				409,
				"Un animal à ce nom existe déjà pour cet.te humain.e",
			);
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
	},
);

// DELETE /dogs/:dogId - Supprimer un chien
router.delete("/:dogId", [idParam("dogId")], validate, async (req, res) => {
	const sqlResult = await Pool.query(
		"DELETE FROM dogs WHERE id = $1 RETURNING *",
		[req.params.dogId],
	);
	if (sqlResult.rowCount === 0) {
		throw httpError(404, "Animal non trouvé");
	}
	res.status(200).json({ result: true, deletedDog: sqlResult.rows[0] });
});

// PATCH /dogs/update/:dogId - Mettre à jour un chien
router.patch(
	"/update/:dogId",
	[idParam("dogId")],
	validate,
	async (req, res) => {
		const { text, values } = buildPartialUpdate(
			"dogs",
			DOG_UPDATABLE_COLUMNS,
			req.body,
			req.params.dogId,
		);

		const sqlResult = await Pool.query(text, values);
		if (sqlResult.rowCount === 0) {
			throw httpError(404, "Animal non trouvé");
		}

		res.status(200).json({
			result: true,
			updatedDog: sqlResult.rows[0],
			message: "Profil animal mis à jour !",
		});
	},
);

// GET /dogs/mydogs/:humanId - Récupérer le(s) chien(s) d'un humain
router.get(
	"/mydogs/:humanId",
	[idParam("humanId")],
	validate,
	async (req, res) => {
		const sqlResult = await Pool.query(
			"SELECT * FROM dogs WHERE human = $1 ORDER BY id",
			[req.params.humanId],
		);

		if (sqlResult.rowCount === 0) {
			throw httpError(404, "Pas de chien pour cet.te humain.e");
		}

		res.status(200).json({ result: true, dogs: sqlResult.rows });
	},
);

module.exports = router;
