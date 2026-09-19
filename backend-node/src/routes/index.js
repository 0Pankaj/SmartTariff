const express = require("express");
const authRoutes = require("./auth.routes");
const usersRoutes = require("./users.routes");
const customersRoutes = require("./customers.routes");
const usageRoutes = require("./usage.routes");
const plansRoutes = require("./plans.routes");
const recommendationsRoutes = require("./recommendations.routes");
const feedbackRoutes = require("./feedback.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/customers", customersRoutes);
router.use("/usage", usageRoutes);
router.use("/plans", plansRoutes);
router.use("/recommendations", recommendationsRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
