const { prisma } = require("../config/db");
const { serializeTariffPlan } = require("../utils/serializer");

class PlanService {
  async listPlans(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const where = {};

    // Status filter (default: active only)
    if (query.status === "active") {
      where.isActive = true;
    } else if (query.status === "inactive") {
      where.isActive = false;
    } else if (!query.status) {
      where.isActive = true;
    }

    if (query.operator) {
      where.operator = query.operator;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.fiveG === "true") {
      where.fiveG = true;
    }

    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = parseFloat(query.minPrice);
      if (query.maxPrice) where.price.lte = parseFloat(query.maxPrice);
    }

    if (query.minData) {
      where.dataLimit = { gte: parseFloat(query.minData) };
    }

    if (query.search) {
      const rawSearch = query.search.trim();
      where.OR = [
        { name: { contains: rawSearch, mode: "insensitive" } },
        { operator: { contains: rawSearch, mode: "insensitive" } },
        { category: { contains: rawSearch, mode: "insensitive" } },
        { description: { contains: rawSearch, mode: "insensitive" } },
      ];
      const cleanNum = parseFloat(rawSearch.replace(/[^0-9.]/g, ""));
      if (!isNaN(cleanNum)) {
        where.OR.push({ price: cleanNum });
      }
    }

    let orderBy = { createdAt: "desc" };
    if (query.sortBy === "price_asc") orderBy = { price: "asc" };
    else if (query.sortBy === "price_desc") orderBy = { price: "desc" };
    else if (query.sortBy === "popularity") orderBy = { popularity: "desc" };
    else if (query.sortBy === "data_desc") orderBy = { dataLimit: "desc" };

    const [totalDocs, docs] = await Promise.all([
      prisma.tariffPlan.count({ where }),
      prisma.tariffPlan.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalDocs / limit) || 1;

    return {
      docs: docs.map(serializeTariffPlan),
      page,
      limit,
      totalDocs,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async getCategories() {
    const distinctCategories = await prisma.tariffPlan.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
    });
    return distinctCategories.map((c) => c.category).filter(Boolean);
  }

  async getPlanById(planId) {
    const plan = await prisma.tariffPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      const err = new Error("Plan not found.");
      err.statusCode = 404;
      throw err;
    }
    return serializeTariffPlan(plan);
  }

  async createPlan(body) {
    const price = Number(body.price);
    const validity = parseInt(body.validity, 10);
    const benefitsJson = Array.isArray(body.benefits) ? JSON.stringify(body.benefits) : (body.benefits || "[]");

    const plan = await prisma.tariffPlan.create({
      data: {
        planCode: body.planCode || null,
        name: body.name,
        operator: body.operator || "",
        category: body.category || "Standard",
        price,
        monthlyEquivalent: body.monthlyEquivalent !== undefined && body.monthlyEquivalent !== null ? Number(body.monthlyEquivalent) : price,
        durationMonths: body.durationMonths ? parseInt(body.durationMonths, 10) : 1,
        validity,
        dataLimit: body.dataLimit !== undefined && body.dataLimit !== null ? Number(body.dataLimit) : null,
        callMinutes: body.callMinutes !== undefined && body.callMinutes !== null ? Number(body.callMinutes) : null,
        smsLimit: body.smsLimit !== undefined && body.smsLimit !== null ? Number(body.smsLimit) : null,
        offerType: body.offerType || "Standalone",
        individualCost: body.individualCost !== undefined && body.individualCost !== null ? Number(body.individualCost) : price,
        discountInr: body.discountInr !== undefined && body.discountInr !== null ? Number(body.discountInr) : 0.0,
        discountPercent: body.discountPercent !== undefined && body.discountPercent !== null ? Number(body.discountPercent) : 0.0,
        fiveG: Boolean(body.fiveG),
        description: body.description || "",
        benefits: benefitsJson,
        image: body.image || null,
        popularity: body.popularity ? parseInt(body.popularity, 10) : 0,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    return serializeTariffPlan(plan);
  }

  async updatePlan(planId, body) {
    const plan = await prisma.tariffPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      const err = new Error("Plan not found.");
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (body.planCode !== undefined) updateData.planCode = body.planCode;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.operator !== undefined) updateData.operator = body.operator;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.monthlyEquivalent !== undefined) updateData.monthlyEquivalent = body.monthlyEquivalent !== null ? Number(body.monthlyEquivalent) : null;
    if (body.durationMonths !== undefined) updateData.durationMonths = body.durationMonths !== null ? parseInt(body.durationMonths, 10) : 1;
    if (body.validity !== undefined) updateData.validity = parseInt(body.validity, 10);
    if (body.dataLimit !== undefined) updateData.dataLimit = body.dataLimit !== null ? Number(body.dataLimit) : null;
    if (body.callMinutes !== undefined) updateData.callMinutes = body.callMinutes !== null ? Number(body.callMinutes) : null;
    if (body.smsLimit !== undefined) updateData.smsLimit = body.smsLimit !== null ? Number(body.smsLimit) : null;
    if (body.offerType !== undefined) updateData.offerType = body.offerType;
    if (body.individualCost !== undefined) updateData.individualCost = body.individualCost !== null ? Number(body.individualCost) : null;
    if (body.discountInr !== undefined) updateData.discountInr = body.discountInr !== null ? Number(body.discountInr) : 0.0;
    if (body.discountPercent !== undefined) updateData.discountPercent = body.discountPercent !== null ? Number(body.discountPercent) : 0.0;
    if (body.fiveG !== undefined) updateData.fiveG = Boolean(body.fiveG);
    if (body.description !== undefined) updateData.description = body.description;
    if (body.benefits !== undefined) {
      updateData.benefits = Array.isArray(body.benefits) ? JSON.stringify(body.benefits) : (body.benefits || "[]");
    }
    if (body.image !== undefined) updateData.image = body.image;
    if (body.popularity !== undefined) updateData.popularity = body.popularity !== null ? parseInt(body.popularity, 10) : 0;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const updated = await prisma.tariffPlan.update({
      where: { id: planId },
      data: updateData,
    });

    return serializeTariffPlan(updated);
  }

  async deletePlan(planId) {
    const plan = await prisma.tariffPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      const err = new Error("Plan not found.");
      err.statusCode = 404;
      throw err;
    }

    // Soft delete matching FastAPI behavior
    const updated = await prisma.tariffPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });

    return serializeTariffPlan(updated);
  }
}

module.exports = new PlanService();
