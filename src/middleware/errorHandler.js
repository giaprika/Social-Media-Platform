// Basic error handler to standardize error responses
module.exports = function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ msg: message });
};
