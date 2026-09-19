const planService = require("../services/planService");
const { apiSuccess } = require("../utils/response");

class PlanController {
  async listPlans(req, res, next) {
    try {
      const result = await planService.listPlans(req.query);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await planService.getCategories();
      return apiSuccess(res, categories);
    } catch (err) {
      next(err);
    }
  }

  async getPlan(req, res, next) {
    try {
      const planId = parseInt(req.params.id, 10);
      const plan = await planService.getPlanById(planId);
      return apiSuccess(res, plan);
    } catch (err) {
      next(err);
    }
  }

  async createPlan(req, res, next) {
    try {
      const plan = await planService.createPlan(req.body);
      return apiSuccess(res, plan, "Plan created successfully", 201);
    } catch (err) {
      next(err);
    }
  }

  async updatePlan(req, res, next) {
    try {
      const planId = parseInt(req.params.id, 10);
      const plan = await planService.updatePlan(planId, req.body);
      return apiSuccess(res, plan, "Plan updated successfully", 200);
    } catch (err) {
      next(err);
    }
  }

  async deletePlan(req, res, next) {
    try {
      const planId = parseInt(req.params.id, 10);
      const plan = await planService.deletePlan(planId);
      return apiSuccess(res, plan, "Plan deactivated successfully", 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PlanController();
