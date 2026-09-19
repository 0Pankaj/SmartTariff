const express = require("express");
const usageController = require("../controllers/usageController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authenticate, (req, res, next) => usageController.getMyUsage(req, res, next));
router.get("/me/latest", authenticate, (req, res, next) => usageController.getMyLatestUsage(req, res, next));
router.post("/", authenticate, (req, res, next) => usageController.createUsage(req, res, next));
router.patch("/:id", authenticate, (req, res, next) => usageController.updateUsage(req, res, next));

module.exports = router;
