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

// POST /humans/signup - Inscription nouveau user
router.post(
	"/signup",
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
			const checkEmail = await Pool.query(
				"SELECT username FROM humans WHERE email = $1",
				[email],
			);

			if (checkEmail.rowCount > 0) {
				return res
					.status(400)
					.json({
						result: false,
						message: `Un compte existe déjà avec cet email, ${checkEmail.rows[0].username}.`,
					});
			}

			const hashPassword = await bcrypt.hashSync(password, 10);
			const sqlResult = await Pool.query(
				"INSERT INTO humans (username, email, password) VALUES ($1, $2, $3) RETURNING *",
				[username, email, hashPassword],
			);

			const { password: _, ...savedUser } = sqlResult.rows[0];
			res.status(200).json({
				result: true,
				savedUser,
				message: `Bienvenue ${savedUser.username} !`,
			});
		} catch (err) {
			console.error(err);
			res.status(500).json({ result: false, message: err.message });
		}
	},
);

// POST /humans/signin - Connexion user
router.post(
	"/signin",
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

		try {
			const checkPassword = async (passwordDB, passwordFrontend) => {
				const result = await bcrypt.compareSync(passwordDB, passwordFrontend);
				return result;
			};

			const sqlResult = await Pool.query(
				"SELECT * FROM humans WHERE email = $1",
				[email],
			);

			if (sqlResult.rowCount === 0) {
				return res
					.status(404)
					.json({ result: false, message: "Humain.e non trouvé.e" });
			}

			const user = sqlResult.rows[0];

			if (!checkPassword(user.password, password)) {
				return res
					.status(400)
					.json({ result: false, message: "Identifiants non reconnus" });
			}

			const onlineUser = await Pool.query(
				"UPDATE humans SET online = true WHERE id = $1 RETURNING *",
				[user.id],
			);

			const { password: _, ...connectedUser } = onlineUser.rows[0];
			res.status(200).json({
				result: true,
				connectedUser,
				message: `Bienvenue ${connectedUser.username} !`,
			});
		} catch (err) {
			console.error(err);
			res.status(500).json({ result: false, message: err.message });
		}
	},
);

// PATCH logout changer statut
router.patch("/logout/:humanId", async (req, res) => {
	const { humanId } = req.params;

	try {
		const sqlResult = await Pool.query(
			"UPDATE humans SET online = false WHERE id = $1 RETURNING *",
			[humanId],
		);

		if (sqlResult.rowcount === 0) {
			res.status(400).json({
				result: false,
				message: "Impossible de changer le statut de l'humain.e",
			});
		}

		const { password: _, email: __, ...offlineUser } = sqlResult.rows[0];
		res.status(200).json({
			result: true,
			message: "Statut : Hors ligne",
			offlineUser,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// DELETE Supprimer un user
router.delete("/:humanId", async (req, res) => {
	const { humanId } = req.params;

	try {
		const sqlResult = await Pool.query(
			"DELETE FROM humans WHERE id = $1 RETURNING *",
			[humanId],
		);
		res.status(200).json({ result: true, deletedUser: sqlResult.rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

// PATCH Mettre à jour un user
router.patch("/update/:humanId", async (req, res) => {
	const { humanId } = req.params;
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
			`UPDATE humans SET ${queryString} WHERE id = ${humanId} RETURNING *`,
			queryValues,
		);

		if (sqlResult.rowCount === 0) {
			return res
				.status(404)
				.json({ result: false, message: "Humain.e non trouvé.e" });
		}

		const { password: _, ...updatedUser } = sqlResult.rows[0];

		res.status(200).json({
			result: true,
			updatedUser,
			message: "Profil mis à jour !",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ result: false, message: err.message });
	}
});

module.exports = router;
