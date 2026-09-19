const customerService = require("../services/customerService");
const { apiSuccess } = require("../utils/response");

class CustomerController {
  async getMyProfile(req, res, next) {
    try {
      const profile = await customerService.getProfile(req.user.id);
      return apiSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  }

  async updateMyProfile(req, res, next) {
    try {
      const profile = await customerService.updateProfile(req.user.id, req.body);
      return apiSuccess(res, profile, "Profile updated successfully");
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CustomerController();
