const usageService = require("../services/usageService");
const { apiSuccess } = require("../utils/response");

class UsageController {
  async getMyUsage(req, res, next) {
    try {
      const result = await usageService.getMyUsage(req.user.id, req.query);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getMyLatestUsage(req, res, next) {
    try {
      const result = await usageService.getMyLatestUsage(req.user.id);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createUsage(req, res, next) {
    try {
      const result = await usageService.createUsage(req.user.id, req.body);
      return apiSuccess(res, result, "Usage record created", 201);
    } catch (err) {
      next(err);
    }
  }

  async updateUsage(req, res, next) {
    try {
      const usageId = parseInt(req.params.id, 10);
      const result = await usageService.updateUsage(usageId, req.user.id, req.user.role, req.body);
      return apiSuccess(res, result, "Usage record updated", 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsageController();
