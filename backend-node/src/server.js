const app = require("./app");
const config = require("./config/env");
const { prisma } = require("./config/db");

const server = app.listen(config.port, () => {
  console.log("=================================================");
  console.log("🚀 SmartTariff Backend Server Running (Express)");
  console.log(`📡 Port:        ${config.port}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health:      http://localhost:${config.port}/health`);
  console.log(`📚 API v1:      http://localhost:${config.port}/api/v1`);
  console.log("=================================================");
});

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log("🔒 HTTP server closed.");
    try {
      await prisma.$disconnect();
      console.log("💾 Prisma client disconnected.");
    } catch (err) {
      console.error("⚠️ Error disconnecting Prisma client:", err);
    }
    process.exit(0);
  });

  // Force exit after 10 seconds timeout
  setTimeout(() => {
    console.error("⚠️ Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = server;
