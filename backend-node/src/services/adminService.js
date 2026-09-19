const { prisma } = require("../config/db");
const {
  serializeUser,
  serializeCustomerProfile,
  serializeUsage,
  serializeRecommendation,
  serializeFeedback,
  serializeTariffPlan,
} = require("../utils/serializer");

class AdminService {
  async getDashboard() {
    const [totalCustomers, activePlans, totalRecommendations, avgScoreResult] = await Promise.all([
      prisma.user.count({ where: { role: "customer" } }),
      prisma.tariffPlan.count({ where: { isActive: true } }),
      prisma.recommendation.count(),
      prisma.recommendationPlan.aggregate({ _avg: { score: true } }),
    ]);

    const avgScore = avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 0;

    // Customers over time (last 6 months)
    const customersOverTime = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = await prisma.user.count({
        where: {
          role: "customer",
          createdAt: { lt: nextMonth },
        },
      });
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
      customersOverTime.push({ month: label, customers: count });
    }

    // Most recommended plans
    const topPlansGroup = await prisma.recommendationPlan.groupBy({
      by: ["planId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    });

    const planIds = topPlansGroup.map((g) => g.planId);
    const plans = planIds.length > 0
      ? await prisma.tariffPlan.findMany({ where: { id: { in: planIds } } })
      : [];
    const planMap = {};
    plans.forEach((p) => {
      planMap[p.id] = p.name;
    });

    const mostRecommended = topPlansGroup.map((g) => ({
      name: planMap[g.planId] || "Unknown",
      count: g._count.id,
    }));

    // Plan category distribution
    const categoryGroup = await prisma.tariffPlan.groupBy({
      by: ["category"],
      _count: { id: true },
    });
    const usageDistribution = categoryGroup.map((g) => ({
      name: g.category || "Other",
      value: g._count.id,
    }));

    // Score distribution buckets
    const [bucket1, bucket2, bucket3, bucket4] = await Promise.all([
      prisma.recommendationPlan.count({ where: { score: { lt: 50 } } }),
      prisma.recommendationPlan.count({ where: { score: { gte: 50, lt: 70 } } }),
      prisma.recommendationPlan.count({ where: { score: { gte: 70, lt: 85 } } }),
      prisma.recommendationPlan.count({ where: { score: { gte: 85 } } }),
    ]);

    const scoreDistribution = [
      { range: "0-50", count: bucket1 },
      { range: "50-70", count: bucket2 },
      { range: "70-85", count: bucket3 },
      { range: "85-100", count: bucket4 },
    ];

    // Feedback stats
    const [fbPositive, fbNegative] = await Promise.all([
      prisma.feedback.count({ where: { rating: { gte: 4 } } }),
      prisma.feedback.count({ where: { rating: { lte: 2 } } }),
    ]);

    const feedbackStats = [
      { name: "Helpful", value: fbPositive },
      { name: "Not helpful", value: fbNegative },
    ];

    return {
      cards: {
        totalCustomers,
        activePlans,
        totalRecommendations,
        avgScore,
      },
      customersOverTime,
      mostRecommended,
      usageDistribution,
      scoreDistribution,
      feedbackStats,
    };
  }

  async getCustomers({ page = 1, limit = 10, search = "", status = "" }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where = { role: "customer" };
    if (status === "active") where.isActive = true;
    else if (status === "inactive") where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [totalDocs, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          profile: {
            include: { currentPlan: true },
          },
          usages: {
            orderBy: { month: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    const docs = users.map((u) => {
      const uDict = serializeUser(u);
      const prof = u.profile;
      const plan = prof?.currentPlan;
      const latestUsage = u.usages?.[0];

      uDict.currentPlan = plan ? plan.name : "No plan";
      uDict.dataUsage = latestUsage ? latestUsage.dataUsage : 0;
      uDict.callMinutes = latestUsage ? latestUsage.callMinutes : 0;
      return uDict;
    });

    const totalPages = Math.ceil(totalDocs / limitNum) || 1;

    return {
      docs,
      page: pageNum,
      limit: limitNum,
      totalDocs,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };
  }

  async getCustomerDetail(customerId) {
    const user = await prisma.user.findUnique({
      where: { id: customerId },
      include: {
        profile: {
          include: { currentPlan: true },
        },
        usages: {
          orderBy: { month: "desc" },
        },
        recommendations: {
          orderBy: { generatedAt: "desc" },
          include: {
            plans: {
              include: { plan: true },
            },
          },
        },
        feedbacks: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      const err = new Error("Customer not found");
      err.statusCode = 404;
      throw err;
    }

    return {
      user: serializeUser(user),
      profile: serializeCustomerProfile(user.profile),
      usage: (user.usages || []).map(serializeUsage),
      recommendations: (user.recommendations || []).map((r) => serializeRecommendation(r)),
      feedback: (user.feedbacks || []).map(serializeFeedback),
      currentPlan: user.profile?.currentPlan ? serializeTariffPlan(user.profile.currentPlan) : null,
    };
  }

  async setCustomerStatus(customerId, isActive) {
    const user = await prisma.user.findUnique({ where: { id: customerId } });
    if (!user) {
      const err = new Error("Customer not found");
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.user.update({
      where: { id: customerId },
      data: { isActive: Boolean(isActive) },
    });

    return serializeUser(updated);
  }

  async deleteCustomer(customerId, adminId) {
    if (customerId === adminId) {
      const err = new Error("Cannot delete your own admin account");
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({ where: { id: customerId } });
    if (!user) {
      const err = new Error("Customer not found");
      err.statusCode = 404;
      throw err;
    }

    await prisma.user.delete({ where: { id: customerId } });

    return { message: `Customer '${user.name}' and all associated records deleted successfully` };
  }

  async getUsageList({ page = 1, limit = 10, month = "", search = "" }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (month) where.month = month;
    if (search) {
      where.customer = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [totalDocs, usages] = await Promise.all([
      prisma.usage.count({ where }),
      prisma.usage.findMany({
        where,
        orderBy: { month: "desc" },
        skip,
        take: limitNum,
        include: { customer: true },
      }),
    ]);

    const docs = usages.map((u) => {
      const d = serializeUsage(u);
      d.customerName = u.customer ? u.customer.name : "Unknown";
      d.customerEmail = u.customer ? u.customer.email : "";
      return d;
    });

    const totalPages = Math.ceil(totalDocs / limitNum) || 1;

    return {
      docs,
      page: pageNum,
      limit: limitNum,
      totalDocs,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };
  }

  async getFeedbackList({ page = 1, limit = 10 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [totalDocs, feedbacks] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: { customer: true },
      }),
    ]);

    const docs = feedbacks.map((fb) => {
      const d = serializeFeedback(fb);
      d.customerName = fb.customer ? fb.customer.name : "Unknown";
      return d;
    });

    const totalPages = Math.ceil(totalDocs / limitNum) || 1;

    return {
      docs,
      page: pageNum,
      limit: limitNum,
      totalDocs,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };
  }

  async getRecommendationsList({ page = 1, limit = 10 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [totalDocs, recs] = await Promise.all([
      prisma.recommendation.count(),
      prisma.recommendation.findMany({
        orderBy: { generatedAt: "desc" },
        skip,
        take: limitNum,
        include: {
          customer: true,
          plans: {
            include: { plan: true },
          },
        },
      }),
    ]);

    const docs = recs.map((r) => {
      const d = serializeRecommendation(r);
      d.customerName = r.customer ? r.customer.name : "Unknown";
      d.customerEmail = r.customer ? r.customer.email : "";
      const topPlan = d.plans.find((p) => p.rank === 1);
      d.topPlanName = topPlan?.plan?.name || "N/A";
      d.topScore = topPlan?.score || 0;
      return d;
    });

    const totalPages = Math.ceil(totalDocs / limitNum) || 1;

    return {
      docs,
      page: pageNum,
      limit: limitNum,
      totalDocs,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };
  }
}

module.exports = new AdminService();
