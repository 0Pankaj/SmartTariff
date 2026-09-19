const adminService = require("../services/adminService");
const { apiSuccess } = require("../utils/response");

class AdminController {
  async getDashboard(req, res, next) {
    try {
      const data = await adminService.getDashboard();
      return apiSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getCustomers(req, res, next) {
    try {
      const result = await adminService.getCustomers(req.query);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getCustomerDetail(req, res, next) {
    try {
      const customerId = parseInt(req.params.id, 10);
      const data = await adminService.getCustomerDetail(customerId);
      return apiSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async setCustomerStatus(req, res, next) {
    try {
      const customerId = parseInt(req.params.id, 10);
      const updated = await adminService.setCustomerStatus(customerId, req.body.isActive);
      return apiSuccess(res, updated, "Customer status updated successfully");
    } catch (err) {
      next(err);
    }
  }

  async deleteCustomer(req, res, next) {
    try {
      const customerId = parseInt(req.params.id, 10);
      const result = await adminService.deleteCustomer(customerId, req.user.id);
      return apiSuccess(res, null, result.message);
    } catch (err) {
      next(err);
    }
  }

  async getUsage(req, res, next) {
    try {
      const result = await adminService.getUsageList(req.query);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getFeedback(req, res, next) {
    try {
      const result = await adminService.getFeedbackList(req.query);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getRecommendations(req, res, next) {
    try {
      const result = await adminService.getRecommendationsList(req.query);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
