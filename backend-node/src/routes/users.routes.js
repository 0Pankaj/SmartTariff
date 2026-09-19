const express = require("express");
const { prisma } = require("../config/db");
const { authenticate } = require("../middleware/authMiddleware");
const { apiSuccess, apiError } = require("../utils/response");
const { serializeUser } = require("../utils/serializer");

const router = express.Router();

router.get("/me", authenticate, (req, res) => {
  return apiSuccess(res, serializeUser(req.user));
});

router.patch("/me", authenticate, async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    return apiSuccess(res, serializeUser(updatedUser), "Profile updated successfully");
  } catch (err) {
    next(err);
  }
});

router.delete("/me", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Cascade delete on database foreign keys handles profiles, usages, recommendations, etc.
    await prisma.user.delete({
      where: { id: userId },
    });
    return apiSuccess(res, null, "Account deleted successfully");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
