const { validationResult } = require("express-validator");

// Runs after an express-validator rules array. Sends the first error with the
// { result, message } shape the front-end already consumes.
module.exports = function validate(req, res, next) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({
			result: false,
			message: errors.array()[0].msg,
		});
	}
	next();
};
