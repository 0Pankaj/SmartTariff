const { prisma } = require("../config/db");
const mlService = require("./mlService");
const { serializeRecommendation, serializeTariffPlan } = require("../utils/serializer");

const WEIGHTS = {
  data: 0.4,
  calls: 0.25,
  sms: 0.1,
  budget: 0.15,
  value: 0.1,
};

function coverageScore(required, provided) {
  if (!required || required <= 0) return 100;
  if (provided === null || provided === undefined) return 100; // unlimited
  if (!Number.isFinite(provided) || provided >= 999999) return 100;
  const ratio = provided / required;
  if (ratio >= 1 && ratio <= 1.8) return 100;
  if (ratio > 1.8 && ratio <= 3) return 90;
  if (ratio > 3) return 78;
  return Math.max(0, Math.round(ratio * 100) - 5);
}

function budgetScoreFn(budget, price) {
  if (!budget || budget <= 0) return 70;
  if (price <= budget) {
    const utilization = price / budget;
    return Math.round(60 + utilization * 40);
  }
  const over = (price - budget) / budget;
  return Math.max(0, Math.round(100 - over * 140));
}

function valueScoreFn(plan) {
  const dataComponent = Math.min(plan.dataLimit || 0, 250);
  const callComponent = 100;
  const smsComponent = Math.min(plan.smsLimit || 0, 500) / 10;
  const effectivePrice = plan.monthlyEquivalent ? plan.monthlyEquivalent : plan.price;
  const raw = (dataComponent + callComponent + smsComponent) / Math.max(effectivePrice, 1);
  return Math.min(100, Math.round(raw * 50));
}

function parsePreferredDurationMonths(prefDuration) {
  if (prefDuration === null || prefDuration === undefined || prefDuration === "") return null;
  const num = parseInt(prefDuration, 10);
  if (isNaN(num)) return null;
  if (num >= 300) return 12;
  if (num >= 150) return 6;
  if (num >= 70) return 3;
  if (num > 12) return 1;
  return num;
}

function getDurationMonths(plan) {
  if (plan.durationMonths) return plan.durationMonths;
  const val = plan.validity || 28;
  if (val >= 300) return 12;
  if (val >= 150) return 6;
  if (val >= 70) return 3;
  return 1;
}

function buildReasons(plan, dataScore, callScore, smsScore, budgetScr, preferences) {
  const reasons = [];

  if (plan.discountPercent && plan.discountPercent > 0) {
    reasons.push(`Bundle deal: Save ${plan.discountPercent}% (₹${Math.round(plan.discountInr)} discount)`);
  }

  if (preferences && preferences.preferredDuration) {
    const targetMonths = parsePreferredDurationMonths(preferences.preferredDuration);
    const planMonths = getDurationMonths(plan);
    if (targetMonths && planMonths === targetMonths) {
      if (targetMonths === 12) reasons.push("Matches your 1 Year annual plan preference");
      else if (targetMonths === 6) reasons.push("Matches your 6-Month plan preference");
      else if (targetMonths === 3) reasons.push("Matches your 3-Month bundle preference");
      else if (targetMonths === 1) reasons.push("Matches your 1-Month plan preference");
    }
  }

  if (dataScore >= 85) {
    reasons.push(`Matches your ${plan.dataLimit}GB data needs`);
  } else if (dataScore >= 60) {
    reasons.push("Covers your data usage");
  } else {
    reasons.push("May fall short on your data usage");
  }

  if (budgetScr >= 80) {
    reasons.push("Fits your monthly budget");
  } else if (budgetScr >= 50) {
    reasons.push("Close to your monthly budget");
  } else {
    reasons.push("Priced above your usual budget");
  }

  reasons.push("Unlimited voice calling included");

  if (smsScore >= 85 && preferences && preferences.minimumSms) {
    reasons.push("Meets your SMS requirements");
  }

  if (plan.fiveG && preferences && preferences.requires5G) {
    reasons.push("Includes 5G as required");
  } else if (plan.fiveG) {
    reasons.push("5G ready network");
  }

  const valScr = valueScoreFn(plan);
  if (valScr >= 70) {
    reasons.push("High value per rupee");
  }

  return reasons.slice(0, 5);
}

function scorePlanRuleBased(plan, usage, preferences) {
  const requiredData = Math.max(usage ? usage.dataUsage : 0, preferences ? preferences.minimumData : 0);
  const requiredCalls = Math.max(usage ? usage.callMinutes : 0, preferences ? preferences.minimumCallMinutes : 0);
  const requiredSms = Math.max(usage ? usage.smsCount : 0, preferences ? preferences.minimumSms : 0);
  const budget = preferences ? preferences.monthlyBudget : 0;

  const effectivePrice = plan.monthlyEquivalent ? plan.monthlyEquivalent : plan.price;

  const dataScore = coverageScore(requiredData, plan.dataLimit);
  const callScore = coverageScore(requiredCalls, plan.callMinutes);
  const smsScore = coverageScore(requiredSms, plan.smsLimit);
  const budgetScr = budgetScoreFn(budget, effectivePrice);
  const valScr = valueScoreFn(plan);

  let total =
    dataScore * WEIGHTS.data +
    callScore * WEIGHTS.calls +
    smsScore * WEIGHTS.sms +
    budgetScr * WEIGHTS.budget +
    valScr * WEIGHTS.value;

  if (preferences && preferences.preferredDuration) {
    const targetMonths = parsePreferredDurationMonths(preferences.preferredDuration);
    const planMonths = getDurationMonths(plan);
    if (targetMonths && planMonths === targetMonths) {
      if (targetMonths === 12) total *= 1.25;
      else if (targetMonths === 3) total *= 1.2;
      else if (targetMonths === 1) total *= 1.1;
      else total *= 1.15;
    }
  }

  if (preferences && preferences.requires5G && !plan.fiveG) {
    total *= 0.7;
  }

  total = Math.max(0, Math.min(100, Math.round(total)));
  const reasons = buildReasons(plan, dataScore, callScore, smsScore, budgetScr, preferences);

  return { score: total, reasons };
}

function runFallbackEngine(activePlans, usage, preferences) {
  let candidatePlans = activePlans;
  if (preferences && preferences.preferredDuration) {
    const targetMonths = parsePreferredDurationMonths(preferences.preferredDuration);
    if (targetMonths !== null) {
      const filtered = candidatePlans.filter((p) => getDurationMonths(p) === targetMonths);
      if (filtered.length > 0) candidatePlans = filtered;
    }
  }

  const scored = candidatePlans.map((plan) => {
    const res = scorePlanRuleBased(plan, usage, preferences);
    return {
      planId: plan.id,
      score: res.score,
      reasons: res.reasons,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((item, idx) => ({
    planId: item.planId,
    rank: idx + 1,
    score: item.score,
    reasons: item.reasons,
  }));
}

class RecommendationService {
  async generateRecommendations(customerId) {
    // 1. Load customer profile
    let profile = await prisma.customerProfile.findUnique({
      where: { userId: customerId },
    });
    if (!profile) {
      const err = new Error("Customer profile not found. Please complete your profile first.");
      err.statusCode = 404;
      throw err;
    }

    // 2. Load latest usage record
    let latestUsage = await prisma.usage.findFirst({
      where: { customerId },
      orderBy: [{ month: "desc" }, { id: "desc" }],
    });

    if (!latestUsage) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const callMin = profile.minimumCallMinutes || 350;
      const numCalls = Math.max(5, Math.round(callMin / 4));
      latestUsage = await prisma.usage.create({
        data: {
          customerId,
          dataUsage: Number(profile.minimumData || 30.0),
          callMinutes: Number(callMin),
          smsCount: Number(profile.minimumSms || 40),
          numberOfCalls: numCalls,
          averageCallDuration: Math.round((callMin / numCalls) * 10) / 10,
          month: currentMonth,
        },
      });
    }

    // 3. Load active tariff plans
    let activePlans = await prisma.tariffPlan.findMany({
      where: { isActive: true },
    });
    if (!activePlans.length) {
      const err = new Error("No active tariff plans available.");
      err.statusCode = 404;
      throw err;
    }

    // Filter by preferred duration if configured
    if (profile.preferredDuration) {
      const targetMonths = parsePreferredDurationMonths(profile.preferredDuration);
      if (targetMonths !== null) {
        const filtered = activePlans.filter((p) => getDurationMonths(p) === targetMonths);
        if (filtered.length > 0) activePlans = filtered;
      }
    }

    const activePlanMap = {};
    activePlans.forEach((p) => {
      activePlanMap[p.id] = p;
    });

    // 4. Build payload for ML
    const mlPayload = {
      customer: {
        customerId: String(customerId),
        monthlyBudget: profile.monthlyBudget,
        minimumData: profile.minimumData,
        minimumCallMinutes: profile.minimumCallMinutes,
        minimumSms: profile.minimumSms,
        preferredDuration: profile.preferredDuration || "28",
        requires5G: profile.requires5G,
        preferredOperator: profile.preferredOperator || "Any",
        currentSpending: profile.monthlyBudget || 500,
      },
      usage: {
        dataUsage: latestUsage.dataUsage,
        callMinutes: latestUsage.callMinutes,
        smsCount: latestUsage.smsCount,
        numberOfCalls: latestUsage.numberOfCalls,
        averageCallDuration: latestUsage.averageCallDuration,
        currentSpending: profile.monthlyBudget,
      },
      plans: activePlans.map((p) => ({
        planId: p.id,
        planCode: p.planCode,
        name: p.name,
        operator: p.operator,
        price: p.price,
        monthlyEquivalent: p.monthlyEquivalent,
        durationMonths: p.durationMonths,
        discountPercent: p.discountPercent,
        discountInr: p.discountInr,
        dataLimit: p.dataLimit,
        callMinutes: p.callMinutes,
        smsLimit: p.smsLimit,
        fiveG: p.fiveG,
        validity: p.validity,
      })),
    };

    let recommendedPlans = [];
    let generatedBy = "rule-based";

    // 5. Attempt ML inference
    const mlResponse = await mlService.getRecommendations(mlPayload);
    if (mlResponse && Array.isArray(mlResponse.recommendations)) {
      const validRecs = [];
      for (const rec of mlResponse.recommendations) {
        const pId = parseInt(rec.planId, 10);
        if (pId && activePlanMap[pId]) {
          const score = Number(rec.score || 0);
          if (score >= 0 && score <= 100) {
            validRecs.push({
              planId: pId,
              score,
              reasons: Array.isArray(rec.reasons) ? rec.reasons : [],
            });
          }
        }
      }
      if (validRecs.length > 0) {
        validRecs.sort((a, b) => b.score - a.score);
        recommendedPlans = validRecs.slice(0, 3).map((item, idx) => ({
          planId: item.planId,
          rank: idx + 1,
          score: item.score,
          reasons: item.reasons,
        }));
        generatedBy = "ml";
      }
    }

    // 6. Fallback to deterministic rule-based scoring if ML was unavailable or invalid
    if (!recommendedPlans.length) {
      recommendedPlans = runFallbackEngine(activePlans, latestUsage, profile);
      generatedBy = "rule-based";
    }

    // 7. Build input snapshot
    const inputSnapshot = {
      usage: {
        dataUsage: latestUsage.dataUsage,
        callMinutes: latestUsage.callMinutes,
        smsCount: latestUsage.smsCount,
        month: latestUsage.month,
      },
      preferences: {
        monthlyBudget: profile.monthlyBudget,
        minimumData: profile.minimumData,
        minimumCallMinutes: profile.minimumCallMinutes,
        minimumSms: profile.minimumSms,
        requires5G: profile.requires5G,
      },
    };

    // 8. Save recommendation in DB
    const rec = await prisma.recommendation.create({
      data: {
        customerId,
        generatedBy,
        generatedAt: new Date(),
        inputSnapshot: JSON.stringify(inputSnapshot),
        plans: {
          create: recommendedPlans.map((rp) => ({
            planId: rp.planId,
            rank: rp.rank,
            score: rp.score,
            reasons: JSON.stringify(rp.reasons),
          })),
        },
      },
      include: {
        plans: {
          include: {
            plan: true,
          },
        },
      },
    });

    return serializeRecommendation(rec, activePlanMap);
  }

  async getMyLatest(customerId) {
    const rec = await prisma.recommendation.findFirst({
      where: { customerId },
      orderBy: { generatedAt: "desc" },
      include: {
        plans: {
          include: {
            plan: true,
          },
        },
      },
    });

    return rec ? serializeRecommendation(rec) : null;
  }

  async getHistory(customerId, { page = 1, limit = 10 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where = { customerId };
    const [totalDocs, recs] = await Promise.all([
      prisma.recommendation.count({ where }),
      prisma.recommendation.findMany({
        where,
        orderBy: { generatedAt: "desc" },
        skip,
        take: limitNum,
        include: {
          plans: {
            include: {
              plan: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalDocs / limitNum) || 1;

    const docs = recs.map((r) => {
      const serialized = serializeRecommendation(r);
      const topPlan = serialized.plans.find((p) => p.rank === 1);
      serialized.topPlanName = topPlan?.plan?.name || "N/A";
      serialized.topScore = topPlan?.score || 0;
      return serialized;
    });

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

  async getById(recId, currentUserId, currentUserRole) {
    const rec = await prisma.recommendation.findUnique({
      where: { id: recId },
      include: {
        plans: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!rec) {
      const err = new Error("Recommendation not found.");
      err.statusCode = 404;
      throw err;
    }

    if (currentUserRole !== "admin" && rec.customerId !== currentUserId) {
      const err = new Error("Access denied.");
      err.statusCode = 403;
      throw err;
    }

    return serializeRecommendation(rec);
  }
}

module.exports = new RecommendationService();
