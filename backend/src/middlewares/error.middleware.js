export const errorHandler = (err, req, res, next) => {
	// Basic centralized error handling
	const status = err?.status || err?.statusCode || 500;
	const message = err?.message || "Internal server error";

	// Log for server visibility
	// eslint-disable-next-line no-console
	console.error(err);

	if (res.headersSent) return next(err);
	return res.status(status).json({ success: false, message });
};

