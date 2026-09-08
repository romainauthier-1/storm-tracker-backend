// Minimal HTTP error helper. `expose: true` means the message is safe to send
// to the client; the central error handler hides messages for 5xx otherwise.
module.exports = function httpError(status, message) {
	const err = new Error(message);
	err.status = status;
	err.expose = status < 500;
	return err;
};
