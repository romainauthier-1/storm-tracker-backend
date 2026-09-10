const rateLimit = require("express-rate-limit");

// Brute-force guard for the credential routes (signin / signup).
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		result: false,
		message: "Trop de tentatives, réessayez dans quelques minutes.",
	},
});

module.exports = { authLimiter };
