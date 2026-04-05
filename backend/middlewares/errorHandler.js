import AppError from "../utils/AppError.js";

/**
 * Centralized Express error handler middleware.
 * Must be registered LAST (after all routes).
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    error = new AppError(message, 422);
  }

  // Convert Mongoose CastError (bad ObjectId)
  if (err.name === "CastError") {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // MongoDB duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(
      `${field.charAt(0).toUpperCase() + field.slice(1)} already in use.`,
      409
    );
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token. Please login again.", 401);
  }
  if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired. Please login again.", 401);
  }

  const statusCode = error.statusCode || 500;
  const message =
    error.isOperational ? error.message : "Internal server error.";

  if (statusCode === 500) {
    console.error("💥 Unhandled error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && !error.isOperational
      ? { stack: err.stack }
      : {}),
  });
};

export default errorHandler;
