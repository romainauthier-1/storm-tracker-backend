const httpError = require("./http-error");

// Builds a parameterised partial UPDATE from a request body.
//
// - `table` and the entries of `allowedColumns` are hard-coded identifiers from
//   our own source, never user input, so interpolating them is safe.
// - Any body key outside `allowedColumns` is rejected (blocks SQL injection via
//   column names and mass-assignment of e.g. password / id / online).
// - The row id is always passed as a bound parameter.
//
// Returns { text, values } ready for pool.query(text, values).
module.exports = function buildPartialUpdate(table, allowedColumns, body, id) {
	const keys = Object.keys(body || {});
	const rejected = keys.filter((key) => !allowedColumns.includes(key));
	if (rejected.length > 0) {
		throw httpError(400, `Champs non modifiables : ${rejected.join(", ")}`);
	}
	if (keys.length === 0) {
		throw httpError(400, "Aucun champ à mettre à jour");
	}

	const assignments = keys.map((key, index) => `${key} = $${index + 1}`);
	const values = keys.map((key) => body[key]);
	values.push(id);

	return {
		text: `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = $${values.length} RETURNING *`,
		values,
	};
};
