const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { prisma } = require("../config/db");
const { apiError } = require("../utils/response");

/**
 * Authentication Middleware:
 * Extracts Bearer token from Authorization header, verifies JWT,
 * and fetches the corresponding User from PostgreSQL.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return apiError(res, "Not authenticated. Please log in.", 401);
    }

    const token = authHeader.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, config.jwtAccessSecret);
    } catch {
      return apiError(res, "Invalid or expired token. Please log in again.", 401);
    }

    const userId = payload.id ? parseInt(payload.id, 10) : null;
    if (!userId) {
      return apiError(res, "Invalid token payload.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return apiError(res, "User belonging to this token no longer exists.", 401);
    }

    if (!user.isActive) {
      return apiError(res, "This account has been deactivated. Contact support.", 403);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional Authentication Middleware:
 * If Bearer token is present, sets req.user. If absent, proceeds without failing.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }
    const token = authHeader.split(" ")[1];
    try {
      const payload = jwt.verify(token, config.jwtAccessSecret);
      const userId = payload.id ? parseInt(payload.id, 10) : null;
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && user.isActive) {
          req.user = user;
        }
      }
    } catch {
      // Ignore token verification errors for optional auth
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-Based Authorization Middleware:
 * Requires req.user to have one of the allowed roles.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return apiError(res, "Not authenticated. Please log in.", 401);
    }
    if (!roles.includes(req.user.role)) {
      return apiError(res, `Access denied. Required role: ${roles.join(" or ")}.`, 403);
    }
    next();
  };
}

const requireAdmin = requireRole("admin");

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
};
