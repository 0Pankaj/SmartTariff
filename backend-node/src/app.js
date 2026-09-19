const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const config = require("./config/env");
const { checkDatabaseConnection } = require("./config/db");
const { apiSuccess } = require("./utils/response");
const apiV1Router = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
app.set("trust proxy", 1);

// ── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ── CORS Configuration ────────────────────────────────────────────────────────
// Strict CORS matching allowed frontend origins with credentials support
const rawOrigins = (config.frontendUrl || "").split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://smart-tariff-frontend.vercel.app",
];
const allowedOrigins = Array.from(new Set([...rawOrigins, ...defaultOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1|.*smart-tariff.*\.vercel\.app|.*\.vercel\.app)(:\d+)?$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    maxAge: 600,
  })
);

// ── Request Parsing & Cookies ────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── HTTP Logging ─────────────────────────────────────────────────────────────
if (config.nodeEnv !== "test") {
  app.use(morgan(config.isProduction ? "combined" : "dev"));
}

// ── Root & Health Endpoints ──────────────────────────────────────────────────
app.get("/", (req, res) => {
  return apiSuccess(
    res,
    {
      name: "SmartTariff API (Node.js + Express + Prisma)",
      version: "2.0.0",
      health: "/health",
      apiV1: "/api/v1",
    },
    "SmartTariff API is running",
    200
  );
});

// Primary health check endpoint
app.get(["/health", "/api/v1/health"], async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  return apiSuccess(
    res,
    {
      status: "ok",
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      database: dbStatus.connected ? "connected" : "disconnected",
    },
    "SmartTariff API is healthy",
    200
  );
});

// ── Mount API v1 Routes ──────────────────────────────────────────────────────
app.use("/api/v1", apiV1Router);

// ── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
