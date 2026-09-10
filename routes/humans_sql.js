const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const bcrypt = require("bcrypt");

const Pool = require("../db");
const validate = require("../lib/validate");
const httpError = require("../lib/http-error");
const buildPartialUpdate = require("../lib/partial-update");
const { authLimiter } = require("../lib/rate-limit");

const BCRYPT_ROUNDS = 12;

// Columns a client is allowed to change through PATCH /update/:humanId.
// `password` (needs hashing), `online` (set by signin/logout) and `id` stay out.
const HUMAN_UPDATABLE_COLUMNS = ["username", "email"];

const idParam = (name) =>
	param(name).isInt({ min: 1 }).withMessage("Identifiant invalide");

const stripPassword = (row) => {
	if (!row) return row;
	const { password, ...rest } = row;
	return rest;
};

// GET /humans - Récupérer tous les users
router.get("/", async (req, res) => {
	const sqlResult = await Pool.query("SELECT * FROM humans ORDER BY id");
	const allHumans = sqlResult.rows.map(stripPassword);
	res.status(200).json({
		result: true,
		nbOfHumans: allHumans.length,
		allHumans,
	});
});

// POST /humans/signup - Inscription nouveau user
router.post(
	"/signup",
	authLimiter,
	[
		body("username").notEmpty().withMessage("Indiquer un nom d'utilisateur"),
		body("email")
			.notEmpty()
			.withMessage("Indiquer une adresse e-mail")
			.isEmail()
			.withMessage("Indiquer une adresse e-mail valide"),
		body("password").notEmpty().withMessage("Indiquer un mot de passe"),
	],
	validate,
	async (req, res) => {
		const { username, email, password } = req.body;

		const checkEmail = await Pool.query(
			"SELECT username FROM humans WHERE lower(email) = lower($1)",
			[email],
		);
		if (checkEmail.rowCount > 0) {
			throw httpError(409, "Un compte existe déjà avec cet email.");
		}

		const hashPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
		const sqlResult = await Pool.query(
			"INSERT INTO humans (username, email, password) VALUES ($1, $2, $3) RETURNING *",
			[username, email, hashPassword],
		);

		const savedUser = stripPassword(sqlResult.rows[0]);
		res.status(200).json({
			result: true,
			savedUser,
			message: `Bienvenue ${savedUser.username} !`,
		});
	},
);

// POST /humans/signin - Connexion user
router.post(
	"/signin",
	authLimiter,
	[
		body("email")
			.notEmpty()
			.withMessage("Indiquer une adresse e-mail")
			.isEmail()
			.withMessage("Indiquer une adresse e-mail valide"),
		body("password").notEmpty().withMessage("Indiquer un mot de passe"),
	],
	validate,
	async (req, res) => {
		const { email, password } = req.body;

		const sqlResult = await Pool.query(
			"SELECT * FROM humans WHERE lower(email) = lower($1)",
			[email],
		);
		const user = sqlResult.rows[0];

		// Same response whether the email is unknown or the password is wrong.
		const passwordOk =
			user && (await bcrypt.compare(password, user.password));
		if (!passwordOk) {
			throw httpError(401, "Identifiants non reconnus");
		}

		const onlineUser = await Pool.query(
			"UPDATE humans SET online = true WHERE id = $1 RETURNING *",
			[user.id],
		);

		const connectedUser = stripPassword(onlineUser.rows[0]);
		res.status(200).json({
			result: true,
			connectedUser,
			message: `Bienvenue ${connectedUser.username} !`,
		});
	},
);

// PATCH /humans/logout/:humanId - Passer le statut hors ligne
router.patch(
	"/logout/:humanId",
	[idParam("humanId")],
	validate,
	async (req, res) => {
		const sqlResult = await Pool.query(
			"UPDATE humans SET online = false WHERE id = $1 RETURNING *",
			[req.params.humanId],
		);

		if (sqlResult.rowCount === 0) {
			throw httpError(404, "Humain.e non trouvé.e");
		}

		const { email, ...offlineUser } = stripPassword(sqlResult.rows[0]);
		res.status(200).json({
			result: true,
			message: "Statut : Hors ligne",
			offlineUser,
		});
	},
);

// DELETE /humans/:humanId - Supprimer un user
router.delete(
	"/:humanId",
	[idParam("humanId")],
	validate,
	async (req, res) => {
		const sqlResult = await Pool.query(
			"DELETE FROM humans WHERE id = $1 RETURNING *",
			[req.params.humanId],
		);
		if (sqlResult.rowCount === 0) {
			throw httpError(404, "Humain.e non trouvé.e");
		}
		res.status(200).json({
			result: true,
			deletedUser: stripPassword(sqlResult.rows[0]),
		});
	},
);

// PATCH /humans/update/:humanId - Mettre à jour un user
router.patch(
	"/update/:humanId",
	[idParam("humanId")],
	validate,
	async (req, res) => {
		const { text, values } = buildPartialUpdate(
			"humans",
			HUMAN_UPDATABLE_COLUMNS,
			req.body,
			req.params.humanId,
		);

		const sqlResult = await Pool.query(text, values);
		if (sqlResult.rowCount === 0) {
			throw httpError(404, "Humain.e non trouvé.e");
		}

		res.status(200).json({
			result: true,
			updatedUser: stripPassword(sqlResult.rows[0]),
			message: "Profil mis à jour !",
		});
	},
);

module.exports = router;
