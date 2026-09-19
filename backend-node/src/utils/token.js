const jwt = require("jsonwebtoken");
const config = require("../config/env");

function createAccessToken(user) {
  const payload = {
    id: String(user.id),
    role: user.role,
    email: user.email ? user.email.toLowerCase() : "",
    name: user.name || "",
    phone: user.phone || "",
  };
  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: `${config.accessTokenExpiresMinutes}m`,
  });
}

function createRefreshToken(user) {
  const payload = {
    id: String(user.id),
    email: user.email ? user.email.toLowerCase() : "",
    role: user.role || "customer",
  };
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: `${config.refreshTokenExpiresDays}d`,
  });
}

function setRefreshCookie(res, token) {
  const maxAge = config.refreshTokenExpiresDays * 24 * 60 * 60 * 1000;
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? "strict" : "lax",
    maxAge,
    path: "/",
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? "strict" : "lax",
    path: "/",
  });
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
};
