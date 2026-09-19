const express = require("express");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", (req, res, next) => authController.register(req, res, next));
router.post("/login", (req, res, next) => authController.login(req, res, next));
router.post("/logout", (req, res, next) => authController.logout(req, res, next));
router.post("/refresh", (req, res, next) => authController.refresh(req, res, next));
router.get("/me", authenticate, (req, res, next) => authController.getMe(req, res, next));

module.exports = router;
