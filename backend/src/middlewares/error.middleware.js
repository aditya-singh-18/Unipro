export const errorHandler = (err, req, res, next) => {
	const status = err?.status || err?.statusCode || 500;

	// Never leak internal error details to the client in production
	const isProduction = process.env.NODE_ENV === 'production';
	const message = isProduction && status === 500
		? 'Internal server error'
		: err?.message || 'Internal server error';

	// eslint-disable-next-line no-console
	console.error(`[${new Date().toISOString()}] ${status} ${req.method} ${req.url} —`, err?.message);

	if (res.headersSent) return next(err);
	return res.status(status).json({ success: false, message });
};

