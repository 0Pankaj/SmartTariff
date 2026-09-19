const express = require("express");
const adminController = require("../controllers/adminController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Protect all admin routes with authentication and requireAdmin
router.use(authenticate, requireAdmin);

router.get("/dashboard", (req, res, next) => adminController.getDashboard(req, res, next));
router.get("/customers", (req, res, next) => adminController.getCustomers(req, res, next));
router.get("/customers/:id", (req, res, next) => adminController.getCustomerDetail(req, res, next));
router.patch("/customers/:id/status", (req, res, next) => adminController.setCustomerStatus(req, res, next));
router.delete("/customers/:id", (req, res, next) => adminController.deleteCustomer(req, res, next));

router.get("/usage", (req, res, next) => adminController.getUsage(req, res, next));
router.get("/feedback", (req, res, next) => adminController.getFeedback(req, res, next));
router.get("/recommendations", (req, res, next) => adminController.getRecommendations(req, res, next));

module.exports = router;
