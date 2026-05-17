const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Pool = require("../db");
const bcrypt = require("bcrypt");

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

// GET /humans - Récupérer tous les users
router.get("/", async (req, res) => {
	try {
		const sqlResult = await Pool.query("SELECT * FROM humans");
		const allHumansWithoutPassword = sqlResult.rows.map((human) => {
			const { password, ...humanWithoutPassword } = human;
			return humanWithoutPassword;
		});
		// Vérifier qu'il y a une réponse (.length, propriété particulière SQL ?)
		res.status(200).json({
			result: true,
			allHumans: allHumansWithoutPassword,
			nbOfHumans: allHumansWithoutPassword.length,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// POST /humans - Ajouter un nouveau user
router.post(
	"/",
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

		try {
			const hashPassword = await bcrypt.hashSync(password, 10);
			const sqlResult = await Pool.query(
				"INSERT INTO humans (username, email, password) VALUES ($1, $2, $3) RETURNING *",
				[username, email, hashPassword],
			);

			const { password: _, ...savedUser } = sqlResult.rows[0];
			res.status(200).json({ result: true, savedUser });
		} catch (err) {
			console.error(err);
			res.status(500).json({ result: false, message: err.message });
		}
	},
);

// DELETE Supprimer un user
router.delete("/:userId", async (req, res) => {
	const { userId } = req.params;

	try {
		const sqlResult = await Pool.query(
			"DELETE FROM humans WHERE id = $1 RETURNING *",
			[userId],
		);
		res.status(200).json({ result: true, deletedUser: sqlResult.rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

module.exports = router;
