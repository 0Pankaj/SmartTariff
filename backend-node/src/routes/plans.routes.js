const express = require("express");
const planController = require("../controllers/planController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/categories", (req, res, next) => planController.getCategories(req, res, next));
router.get("/", (req, res, next) => planController.listPlans(req, res, next));
router.get("/:id", (req, res, next) => planController.getPlan(req, res, next));

// Admin management routes
router.post("/", authenticate, requireAdmin, (req, res, next) => planController.createPlan(req, res, next));
router.patch("/:id", authenticate, requireAdmin, (req, res, next) => planController.updatePlan(req, res, next));
router.put("/:id", authenticate, requireAdmin, (req, res, next) => planController.updatePlan(req, res, next));
router.delete("/:id", authenticate, requireAdmin, (req, res, next) => planController.deletePlan(req, res, next));

module.exports = router;
