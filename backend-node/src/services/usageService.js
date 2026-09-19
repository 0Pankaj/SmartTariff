const { prisma } = require("../config/db");
const { serializeUsage } = require("../utils/serializer");

class UsageService {
  async getMyUsage(customerId, { page = 1, limit = 10, month = "" }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where = { customerId };
    if (month) {
      where.month = month;
    }

    const [totalDocs, docs] = await Promise.all([
      prisma.usage.count({ where }),
      prisma.usage.findMany({
        where,
        orderBy: { month: "desc" },
        skip,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(totalDocs / limitNum) || 1;

    return {
      docs: docs.map(serializeUsage),
      page: pageNum,
      limit: limitNum,
      totalDocs,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };
  }

  async getMyLatestUsage(customerId) {
    const usage = await prisma.usage.findFirst({
      where: { customerId },
      orderBy: [
        { month: "desc" },
        { id: "desc" },
      ],
    });

    return usage ? serializeUsage(usage) : null;
  }

  async createUsage(customerId, body) {
    const dataUsage = Number(body.dataUsage || 0);
    const callMinutes = Number(body.callMinutes || 0);
    const smsCount = Number(body.smsCount || 0);
    const month = body.month || new Date().toISOString().slice(0, 7);

    let numberOfCalls = body.numberOfCalls !== undefined && body.numberOfCalls !== null ? Number(body.numberOfCalls) : null;
    if (!numberOfCalls && callMinutes) {
      numberOfCalls = Math.max(5, Math.round(callMinutes / 4));
    }

    let averageCallDuration = body.averageCallDuration !== undefined && body.averageCallDuration !== null ? Number(body.averageCallDuration) : null;
    if (callMinutes && numberOfCalls) {
      averageCallDuration = Math.round((callMinutes / numberOfCalls) * 10) / 10;
    }

    const usage = await prisma.usage.create({
      data: {
        customerId,
        dataUsage,
        callMinutes,
        smsCount,
        numberOfCalls: numberOfCalls || 0,
        averageCallDuration: averageCallDuration || 0,
        month,
      },
    });

    return serializeUsage(usage);
  }

  async updateUsage(usageId, customerId, userRole, body) {
    const usage = await prisma.usage.findUnique({
      where: { id: usageId },
    });

    if (!usage) {
      const err = new Error("Usage record not found.");
      err.statusCode = 404;
      throw err;
    }

    // Ownership check: must be owner or admin
    if (userRole !== "admin" && usage.customerId !== customerId) {
      const err = new Error("Access denied.");
      err.statusCode = 403;
      throw err;
    }

    const updateData = {};
    if (body.dataUsage !== undefined) updateData.dataUsage = Number(body.dataUsage);
    if (body.callMinutes !== undefined) updateData.callMinutes = Number(body.callMinutes);
    if (body.smsCount !== undefined) updateData.smsCount = Number(body.smsCount);
    if (body.numberOfCalls !== undefined) updateData.numberOfCalls = Number(body.numberOfCalls);
    if (body.averageCallDuration !== undefined) updateData.averageCallDuration = Number(body.averageCallDuration);
    if (body.month !== undefined) updateData.month = body.month;

    const updated = await prisma.usage.update({
      where: { id: usageId },
      data: updateData,
    });

    return serializeUsage(updated);
  }
}

module.exports = new UsageService();
