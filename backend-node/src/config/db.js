const { PrismaClient } = require("@prisma/client");

let prismaInstance = null;

function getPrismaClient() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return prismaInstance;
}

const prisma = getPrismaClient();

/**
 * Test database connectivity gracefully without throwing unhandled exceptions.
 * @returns {Promise<{ connected: boolean, error: string | null }>}
 */
async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, error: null };
  } catch (err) {
    return {
      connected: false,
      error: err.message || "Database connection unavailable",
    };
  }
}

module.exports = {
  prisma,
  checkDatabaseConnection,
};
