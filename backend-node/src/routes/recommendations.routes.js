const express = require("express");
const recommendationController = require("../controllers/recommendationController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/model-status", (req, res, next) => recommendationController.getModelStatus(req, res, next));
router.post("/predict", (req, res, next) => recommendationController.predict(req, res, next));
router.post("/generate", authenticate, (req, res, next) => recommendationController.generate(req, res, next));
router.get("/me", authenticate, (req, res, next) => recommendationController.getMyLatest(req, res, next));
router.get("/history", authenticate, (req, res, next) => recommendationController.getHistory(req, res, next));
router.get("/:id", authenticate, (req, res, next) => recommendationController.getById(req, res, next));

module.exports = router;
