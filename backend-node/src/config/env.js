const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "smarttariff_access_secret_key_2024",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "smarttariff_refresh_secret_key_2024",
  accessTokenExpiresMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRES_MINUTES || "10080", 10),
  refreshTokenExpiresDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  mlServiceUrl: process.env.ML_SERVICE_URL || "",
  isProduction: (process.env.NODE_ENV || "development") === "production",
};
