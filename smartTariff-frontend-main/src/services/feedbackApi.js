// Feedback API Service
// Connects to Node.js/Express Backend at /api/v1/feedback/* and /api/v1/admin/feedback
import { api } from "./api";

export const feedbackApi = {
  submit: async ({ recommendationId, rating, comment }) => {
    return api.post("/feedback", {
      recommendationId: recommendationId ? String(recommendationId) : null,
      rating: typeof rating === "string" ? (rating === "up" ? 5 : 1) : rating,
      comment: comment || "",
    });
  },

  mine: async () => {
    return api.get("/feedback/me");
  },

  listAll: async (params = {}) => {
    return api.get("/admin/feedback", params);
  },
};
