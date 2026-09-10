const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");

const Pool = require("../db");
const validate = require("../lib/validate");
const httpError = require("../lib/http-error");
const buildPartialUpdate = require("../lib/partial-update");

// Columns a client is allowed to change through PATCH /update/:walkId.
const WALK_UPDATABLE_COLUMNS = [
	"date",
	"time",
	"duration",
	"meetings",
	"pooped",
	"peed",
	"walked_dog",
	"walking_human",
	"notes",
	"dog_mood",
	"human_mood",
	"other",
	"coprophagie",
];

const idParam = (name) =>
	param(name).isInt({ min: 1 }).withMessage("Identifiant invalide");

const WALK_WITH_DOG_NAME =
	"SELECT walks.*, dogs.name AS dog_name FROM walks JOIN dogs ON walks.walked_dog = dogs.id";

// GET /walks - Récupérer toutes les balades
router.get("/", async (req, res) => {
	const sqlResult = await Pool.query(`${WALK_WITH_DOG_NAME} ORDER BY walks.id`);
	res.status(200).json({
		result: true,
		nbOfWalks: sqlResult.rowCount,
		allWalks: sqlResult.rows,
	});
});

// POST /walks - Ajouter une balade
router.post(
	"/",
	[
		body("date").notEmpty().withMessage("Indiquer une date"),
		body("walked_dog").isInt({ min: 1 }).withMessage("Chien invalide"),
		body("walking_human").isInt({ min: 1 }).withMessage("Humain.e invalide"),
	],
	validate,
	async (req, res) => {
		const meetings = JSON.stringify(req.body.meetings ?? []);
		const {
			date,
			time,
			duration,
			walked_dog,
			walking_human,
			pooped,
			peed,
			notes,
			coprophagie,
		} = req.body;
		// text[] NOT NULL DEFAULT '{}' en base — le front les envoie en tableaux ;
		// on retombe sur [] si un champ est absent pour éviter un échec NOT NULL.
		const dog_mood = req.body.dog_mood ?? [];
		const human_mood = req.body.human_mood ?? [];
		const other = req.body.other ?? [];

		const sqlResult = await Pool.query(
			"INSERT INTO walks (date, time, duration, meetings, pooped, peed, walked_dog, walking_human, notes, dog_mood, human_mood, other, coprophagie) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id",
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
				dog_mood,
				human_mood,
				other,
				coprophagie,
			],
		);

		const withDogName = await Pool.query(
			`${WALK_WITH_DOG_NAME} WHERE walks.id = $1`,
			[sqlResult.rows[0].id],
		);

		res.status(200).json({
			result: true,
			savedWalk: withDogName.rows[0],
			message: "Balade ajoutée !",
		});
	},
);

// PATCH /walks/update/:walkId - Mettre à jour une balade
router.patch(
	"/update/:walkId",
	[idParam("walkId")],
	validate,
	async (req, res) => {
		const patch = { ...req.body };
		if ("meetings" in patch) {
			patch.meetings = JSON.stringify(patch.meetings ?? []);
		}

		const { text, values } = buildPartialUpdate(
			"walks",
			WALK_UPDATABLE_COLUMNS,
			patch,
			req.params.walkId,
		);

		const sqlResult = await Pool.query(text, values);
		if (sqlResult.rowCount === 0) {
			throw httpError(404, "Balade non trouvée.");
		}

		res.status(200).json({
			result: true,
			updatedWalk: sqlResult.rows[0],
			message: "Balade mise à jour !",
		});
	},
);

// DELETE /walks/:walkId - Supprimer une balade
router.delete("/:walkId", [idParam("walkId")], validate, async (req, res) => {
	const sqlResult = await Pool.query(
		"DELETE FROM walks WHERE id = $1 RETURNING *",
		[req.params.walkId],
	);
	if (sqlResult.rowCount === 0) {
		throw httpError(404, "Balade non trouvée.");
	}
	res.status(200).json({
		result: true,
		deletedWalk: sqlResult.rows[0],
		message: "Balade supprimée !",
	});
});

// GET /walks/:humanId - Récupérer toutes les balades d'un humain
router.get("/:humanId", [idParam("humanId")], validate, async (req, res) => {
	const sqlResult = await Pool.query(
		`${WALK_WITH_DOG_NAME} WHERE walks.walking_human = $1 ORDER BY walks.date DESC, walks.id DESC`,
		[req.params.humanId],
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
});

module.exports = router;
