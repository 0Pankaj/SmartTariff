const feedbackService = require("../services/feedbackService");
const { apiSuccess } = require("../utils/response");

class FeedbackController {
  async submit(req, res, next) {
    try {
      const result = await feedbackService.submitFeedback(req.user.id, req.body);
      return apiSuccess(res, result, "Feedback submitted", 201);
    } catch (err) {
      next(err);
    }
  }

  async getMyFeedback(req, res, next) {
    try {
      const result = await feedbackService.getMyFeedback(req.user.id);
      return apiSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FeedbackController();
