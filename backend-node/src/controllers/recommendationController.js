const recommendationService = require("../services/recommendationService");
const mlService = require("../services/mlService");
const { apiSuccess } = require("../utils/response");

class RecommendationController {
  async getModelStatus(req, res, next) {
    try {
      const status = await mlService.getModelStatus();
      return apiSuccess(res, status, "ML Model status");
    } catch (err) {
      next(err);
    }
  }

  async predict(req, res, next) {
    try {
      const mlResponse = await mlService.getRecommendations(req.body);
      return apiSuccess(res, mlResponse || { recommendations: [], generatedBy: "rule-based" });
    } catch (err) {
      next(err);
    }
  }

  async generate(req, res, next) {
    try {
      const result = await recommendationService.generateRecommendations(req.user.id);
      return apiSuccess(res, result, "Recommendations generated", 201);
    } catch (err) {
      next(err);
    }
  }

  async getMyLatest(req, res, next) {
    try {
      const result = await recommendationService.getMyLatest(req.user.id);
      return apiSuccess(res, result, result ? "OK" : "No recommendations found");
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req, res, next) {
    try {
      const result = await recommendationService.getHistory(req.user.id, req.query);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const recId = parseInt(req.params.id, 10);
      const result = await recommendationService.getById(recId, req.user.id, req.user.role);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecommendationController();
