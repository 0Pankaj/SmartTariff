const { apiError } = require("../utils/response");
const config = require("../config/env");

/**
 * Handle 404 Not Found for unregistered routes
 */
function notFoundHandler(req, res, next) {
  return apiError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

/**
 * Global Centralized Error Handling Middleware
 * Handles malformed JSON, syntax errors, validation errors, and runtime exceptions.
 */
function errorHandler(err, req, res, next) {
  // 1. Handle JSON syntax errors (malformed body)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return apiError(res, "Malformed JSON body in request payload", 400);
  }

  // 2. Default status code & message
  const statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  // In production, do not expose raw internal server error details
  if (statusCode === 500 && config.isProduction) {
    message = "Internal server error";
  }

  if (!config.isProduction && statusCode === 500) {
    console.error("❌ Unhandled Error:", err);
  }

  return apiError(res, message, statusCode);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
