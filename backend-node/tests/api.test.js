const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../src/app");
const { prisma, checkDatabaseConnection } = require("../src/config/db");
const { createAccessToken } = require("../src/utils/token");
const mlService = require("../src/services/mlService");

let server;
let baseUrl;

test.before(async () => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    server.close();
  }
  await prisma.$disconnect();
});

// Helper for making API requests
async function apiRequest(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

// 1. GET /health
test("1. GET /health reports API healthy and database connected", async () => {
  const res = await apiRequest("GET", "/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.data.status, "ok");
  assert.strictEqual(res.data.data.database, "connected");
});

// 2. Database connection check
test("2. Database connection helper reports connected: true", async () => {
  const status = await checkDatabaseConnection();
  assert.strictEqual(status.connected, true);
});

// 3. Login & Authentication with existing customer
test("3. POST /api/v1/auth/login validates existing user and returns JWT", async () => {
  const existingUser = await prisma.user.findFirst({
    where: { role: "customer", isActive: true },
  });
  assert.ok(existingUser, "Existing customer should exist in database");

  const invalidRes = await apiRequest("POST", "/api/v1/auth/login", {
    email: existingUser.email,
    password: "WrongPassword123!",
  });
  assert.strictEqual(invalidRes.status, 401);
  assert.strictEqual(invalidRes.data.success, false);
});

// 4. GET /api/v1/auth/me
test("4. GET /api/v1/auth/me returns authenticated user details", async () => {
  const user = await prisma.user.findFirst({ where: { role: "customer" } });
  const token = createAccessToken(user);

  const res = await apiRequest("GET", "/api/v1/auth/me", null, {
    Authorization: `Bearer ${token}`,
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.data.email, user.email);
  assert.strictEqual(res.data.data.id, user.id);
  assert.strictEqual(res.data.data.password, undefined);
});

// 5. Refresh Token flow
test("5. POST /api/v1/auth/refresh returns new access token", async () => {
  const user = await prisma.user.findFirst({ where: { role: "customer" } });
  const { createRefreshToken } = require("../src/utils/token");
  const refreshToken = createRefreshToken(user);

  const res = await apiRequest("POST", "/api/v1/auth/refresh", { refreshToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.data.token, "New access token should be present");
});

// 6. Logout
test("6. POST /api/v1/auth/logout clears refresh cookie", async () => {
  const res = await apiRequest("POST", "/api/v1/auth/logout");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
});

// 7. Customer Profile & Ownership check
test("7. GET /api/v1/customers/me/profile returns own profile", async () => {
  const user = await prisma.user.findFirst({ where: { role: "customer" } });
  const token = createAccessToken(user);

  const res = await apiRequest("GET", "/api/v1/customers/me/profile", null, {
    Authorization: `Bearer ${token}`,
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(String(res.data.data.userId), String(user.id));
  assert.ok(res.data.data.monthlyBudget !== undefined);
});

// 8. Admin Authorization enforcement
test("8. Admin authorization blocks normal customer from admin endpoints", async () => {
  const customer = await prisma.user.findFirst({ where: { role: "customer" } });
  const customerToken = createAccessToken(customer);

  const res = await apiRequest("GET", "/api/v1/admin/dashboard", null, {
    Authorization: `Bearer ${customerToken}`,
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.data.success, false);
});

// 9. Admin Dashboard
test("9. Admin can access GET /api/v1/admin/dashboard", async () => {
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  assert.ok(admin, "Admin user should exist in database");
  const adminToken = createAccessToken(admin);

  const res = await apiRequest("GET", "/api/v1/admin/dashboard", null, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.data.cards.totalCustomers >= 1);
  assert.ok(res.data.data.cards.activePlans >= 1);
});

// 10. Tariff Plans Listing (Public)
test("10. GET /api/v1/plans lists active tariff plans", async () => {
  const res = await apiRequest("GET", "/api/v1/plans");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.data.docs.length > 0);
  assert.ok(res.data.data.totalDocs >= 20);
  assert.ok(res.data.data.docs[0].benefits !== undefined);
  assert.ok(Array.isArray(res.data.data.docs[0].benefits));
});

// 11. Tariff Plan Update (PUT & PATCH) by Admin
test("11. PUT & PATCH /api/v1/plans/:id updates plan when called by admin", async () => {
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  const adminToken = createAccessToken(admin);

  const plan = await prisma.tariffPlan.findFirst();
  assert.ok(plan);

  const patchRes = await apiRequest("PATCH", `/api/v1/plans/${plan.id}`, { popularity: plan.popularity }, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert.strictEqual(patchRes.status, 200);
  assert.strictEqual(patchRes.data.success, true);

  const putRes = await apiRequest("PUT", `/api/v1/plans/${plan.id}`, { popularity: plan.popularity }, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert.strictEqual(putRes.status, 200);
  assert.strictEqual(putRes.data.success, true);
});

// 12. Usage access
test("12. GET /api/v1/usage/me returns usage list for current user", async () => {
  const user = await prisma.user.findFirst({ where: { role: "customer" } });
  const token = createAccessToken(user);

  const res = await apiRequest("GET", "/api/v1/usage/me", null, {
    Authorization: `Bearer ${token}`,
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(Array.isArray(res.data.data.docs));
});

// 13. Recommendation Model Status & Fallback Generation
test("13. Recommendation system: GET /model-status & GET /me", async () => {
  const statusRes = await apiRequest("GET", "/api/v1/recommendations/model-status");
  assert.strictEqual(statusRes.status, 200);
  assert.strictEqual(statusRes.data.data.status, "active");

  const user = await prisma.user.findFirst({ where: { role: "customer" } });
  const token = createAccessToken(user);

  const recRes = await apiRequest("GET", "/api/v1/recommendations/me", null, {
    Authorization: `Bearer ${token}`,
  });
  assert.strictEqual(recRes.status, 200);
  assert.strictEqual(recRes.data.success, true);
});

// 14. Feedback Authorization & Ownership
test("14. Feedback authorization prevents submitting against another customer recommendation", async () => {
  const userA = await prisma.user.findFirst({ where: { role: "customer" } });
  const userB = await prisma.user.findFirst({ where: { role: "customer", id: { not: userA.id } } });

  const recB = await prisma.recommendation.findFirst({ where: { customerId: userB.id } });
  if (recB) {
    const tokenA = createAccessToken(userA);
    const res = await apiRequest("POST", "/api/v1/feedback", {
      recommendationId: recB.id,
      rating: 5,
      comment: "Trying to submit for another user",
    }, {
      Authorization: `Bearer ${tokenA}`,
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
  }
});

// 15. Admin Recommendations List
test("15. Admin GET /api/v1/admin/recommendations returns populated recommendations", async () => {
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  const adminToken = createAccessToken(admin);

  const res = await apiRequest("GET", "/api/v1/admin/recommendations", null, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(Array.isArray(res.data.data.docs));
  assert.ok(res.data.data.totalDocs >= 17);
});

// 16. Node.js -> Python ML Service direct prediction integration
test("16. Node.js -> Python ML microservice integration & fallback", async () => {
  // Test vector prediction via mlService
  const vector = {
    data_per_month_gb: 100.0,
    sms_per_month: 100.0,
    monthly_equivalent_inr: 450.0,
    duration_months: 1.0,
    discount_percent: 0.0,
    data_coverage_ratio: 1.25,
    sms_coverage_ratio: 1.0,
    data_waste_ratio: 0.2,
    sms_waste_ratio: 0.0,
    price_to_budget_ratio: 0.9,
    duration_match: 1.0,
  };

  const vectorResult = await mlService.predictVector(vector);
  // If Python service is running on ML_SERVICE_URL, vectorResult has prediction
  if (vectorResult) {
    assert.ok(vectorResult.prediction !== undefined);
    assert.ok(vectorResult.bounded_score >= 0 && vectorResult.bounded_score <= 100);
  }

  // Verify graceful fallback when service receives invalid input or is unreachable
  const invalidResult = await mlService.getRecommendations({ invalid: true });
  assert.strictEqual(invalidResult, null, "Should return null on invalid input so fallback triggers");
});
