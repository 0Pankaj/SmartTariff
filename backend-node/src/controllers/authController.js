const authService = require("../services/authService");
const { apiSuccess, apiError } = require("../utils/response");
const { setRefreshCookie, clearRefreshCookie } = require("../utils/token");
const { serializeUser } = require("../utils/serializer");

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password, phone } = req.body;
      const result = await authService.register({ name, email, password, phone });
      setRefreshCookie(res, result.refreshToken);
      return apiSuccess(res, { user: result.user, token: result.token }, "Registration successful", 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      setRefreshCookie(res, result.refreshToken);
      return apiSuccess(res, { user: result.user, token: result.token }, "Login successful", 200);
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      clearRefreshCookie(res);
      return apiSuccess(res, null, "Logged out successfully", 200);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      return apiSuccess(res, serializeUser(req.user), "Current user details", 200);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        return apiError(res, "No refresh token found. Please log in again.", 401);
      }
      const result = await authService.refreshToken(refreshToken);
      setRefreshCookie(res, result.refreshToken);
      return apiSuccess(res, { token: result.token }, "Token refreshed", 200);
    } catch (err) {
      clearRefreshCookie(res);
      next(err);
    }
  }
}

module.exports = new AuthController();
