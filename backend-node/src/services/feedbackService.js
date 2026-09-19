const { prisma } = require("../config/db");
const { serializeFeedback } = require("../utils/serializer");

class FeedbackService {
  async submitFeedback(customerId, { recommendationId, rating, comment }) {
    const recId = parseInt(recommendationId, 10);
    if (!recId) {
      const err = new Error("Recommendation ID is required.");
      err.statusCode = 400;
      throw err;
    }

    // Verify recommendation exists
    const rec = await prisma.recommendation.findUnique({
      where: { id: recId },
    });

    if (!rec) {
      const err = new Error("Recommendation not found.");
      err.statusCode = 404;
      throw err;
    }

    // Authorization check: ensure customer is submitting feedback for their own recommendation
    if (rec.customerId !== customerId) {
      const err = new Error("Access denied. You can only submit feedback for your own recommendations.");
      err.statusCode = 403;
      throw err;
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      const err = new Error("Rating must be an integer between 1 and 5.");
      err.statusCode = 400;
      throw err;
    }

    const feedback = await prisma.feedback.create({
      data: {
        customerId,
        recommendationId: recId,
        rating: ratingNum,
        comment: comment || "",
      },
    });

    return serializeFeedback(feedback);
  }

  async getMyFeedback(customerId) {
    const feedbacks = await prisma.feedback.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });

    return feedbacks.map(serializeFeedback);
  }
}

module.exports = new FeedbackService();
