/**
 * Standard API success response envelope matching FastAPI / React expectations:
 * { success: true, message: string, data?: any }
 */
function apiSuccess(res, data = null, message = "OK", statusCode = 200) {
  const payload = {
    success: true,
    message,
  };
  if (data !== null && data !== undefined) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
}

/**
 * Standard API error response envelope matching FastAPI / React expectations:
 * { success: false, message: string }
 */
function apiError(res, message = "Internal server error", statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = {
  apiSuccess,
  apiError,
};
