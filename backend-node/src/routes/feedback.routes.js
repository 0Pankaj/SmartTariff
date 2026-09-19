const express = require("express");
const feedbackController = require("../controllers/feedbackController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, (req, res, next) => feedbackController.submit(req, res, next));
router.get("/me", authenticate, (req, res, next) => feedbackController.getMyFeedback(req, res, next));

module.exports = router;
