/**
 * Custom operational error class.
 * Distinguishes expected app errors from unexpected programming bugs.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // safe to expose to client
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
