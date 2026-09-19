/**
 * Model Serializer Utilities
 * Produces frontend-compatible shapes matching FastAPI / React expectations:
 * - Provides both `id` and `_id` (stringified)
 * - Uses camelCase field names: monthlyBudget, callMinutes, isActive, createdAt, etc.
 * - Parses benefits, inputSnapshot, and reasons into native arrays/objects if stored as JSON strings
 * - Never leaks passwords or password hashes
 */

function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    _id: String(user.id),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    avatar: user.avatar || null,
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
  };
}

function parseJsonSafe(value, defaultVal) {
  if (value === null || value === undefined) return defaultVal;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultVal;
  }
}

function serializeTariffPlan(plan) {
  if (!plan) return null;
  const benefits = parseJsonSafe(plan.benefits, []);
  const planCode = plan.planCode || `P${String(plan.id).padStart(2, "0")}`;

  return {
    id: plan.id,
    _id: String(plan.id),
    planId: planCode,
    planCode: planCode,
    name: plan.name,
    operator: plan.operator || "",
    category: plan.category || "Standard",
    price: plan.price,
    monthlyEquivalent: plan.monthlyEquivalent !== null && plan.monthlyEquivalent !== undefined ? plan.monthlyEquivalent : plan.price,
    durationMonths: plan.durationMonths || 1,
    validity: plan.validity,
    dataLimit: plan.dataLimit,
    callMinutes: plan.callMinutes,
    smsLimit: plan.smsLimit,
    offerType: plan.offerType || "Standalone",
    individualCost: plan.individualCost !== null && plan.individualCost !== undefined ? plan.individualCost : plan.price,
    discountInr: plan.discountInr || 0.0,
    discountPercent: plan.discountPercent || 0.0,
    fiveG: Boolean(plan.fiveG),
    description: plan.description || "",
    benefits,
    image: plan.image || null,
    popularity: plan.popularity || 0,
    isActive: Boolean(plan.isActive),
    createdAt: plan.createdAt ? new Date(plan.createdAt).toISOString() : null,
    updatedAt: plan.updatedAt ? new Date(plan.updatedAt).toISOString() : null,
  };
}

function serializeCustomerProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    _id: String(profile.id),
    userId: String(profile.userId),
    currentPlan: profile.currentPlanId ? String(profile.currentPlanId) : null,
    currentPlanId: profile.currentPlanId || null,
    monthlyBudget: profile.monthlyBudget !== null ? profile.monthlyBudget : 500,
    minimumData: profile.minimumData !== null ? profile.minimumData : 10,
    minimumCallMinutes: profile.minimumCallMinutes !== null ? profile.minimumCallMinutes : 500,
    minimumSms: profile.minimumSms !== null ? profile.minimumSms : 100,
    preferredDuration: profile.preferredDuration || "28",
    requires5G: Boolean(profile.requires5G),
    preferredOperator: profile.preferredOperator || "",
    createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : null,
    updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : null,
  };
}

function serializeUsage(usage) {
  if (!usage) return null;
  return {
    id: usage.id,
    _id: String(usage.id),
    customerId: String(usage.customerId),
    dataUsage: usage.dataUsage,
    callMinutes: usage.callMinutes,
    smsCount: usage.smsCount,
    numberOfCalls: usage.numberOfCalls || 0,
    averageCallDuration: usage.averageCallDuration || 0,
    month: usage.month,
    createdAt: usage.createdAt ? new Date(usage.createdAt).toISOString() : null,
    updatedAt: usage.updatedAt ? new Date(usage.updatedAt).toISOString() : null,
  };
}

function serializeRecommendation(rec, planMap = {}) {
  if (!rec) return null;
  const inputSnapshot = parseJsonSafe(rec.inputSnapshot, {});

  const plans = (rec.plans || [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((rp) => {
      const planObj = planMap[rp.planId] ? serializeTariffPlan(planMap[rp.planId]) : (rp.plan ? serializeTariffPlan(rp.plan) : null);
      return {
        id: rp.id,
        _id: String(rp.id),
        planId: String(rp.planId),
        rank: rp.rank,
        score: rp.score,
        reasons: parseJsonSafe(rp.reasons, []),
        plan: planObj,
      };
    });

  return {
    id: rec.id,
    _id: String(rec.id),
    customerId: String(rec.customerId),
    generatedAt: rec.generatedAt ? new Date(rec.generatedAt).toISOString() : null,
    generatedBy: rec.generatedBy || "rule-based",
    inputSnapshot,
    plans,
    createdAt: rec.createdAt ? new Date(rec.createdAt).toISOString() : null,
    updatedAt: rec.updatedAt ? new Date(rec.updatedAt).toISOString() : null,
  };
}

function serializeFeedback(fb) {
  if (!fb) return null;
  return {
    id: fb.id,
    _id: String(fb.id),
    customerId: String(fb.customerId),
    recommendationId: String(fb.recommendationId),
    rating: fb.rating,
    comment: fb.comment || "",
    createdAt: fb.createdAt ? new Date(fb.createdAt).toISOString() : null,
    updatedAt: fb.updatedAt ? new Date(fb.updatedAt).toISOString() : null,
  };
}

module.exports = {
  serializeUser,
  serializeTariffPlan,
  serializeCustomerProfile,
  serializeUsage,
  serializeRecommendation,
  serializeFeedback,
  parseJsonSafe,
};
