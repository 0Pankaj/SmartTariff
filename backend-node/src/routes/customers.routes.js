const express = require("express");
const customerController = require("../controllers/customerController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me/profile", authenticate, (req, res, next) => customerController.getMyProfile(req, res, next));
router.patch("/me/profile", authenticate, (req, res, next) => customerController.updateMyProfile(req, res, next));

module.exports = router;
