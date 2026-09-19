// Recommendation API Service
// Connects directly to Node.js/Express Backend ML Engine & Recommendation Service
import { api } from "./api";

export const recommendationApi = {
  getMine: async () => {
    return api.get("/recommendations/me");
  },

  getById: async (id) => {
    return api.get(`/recommendations/${id}`);
  },

  predict: async (payload) => {
    return api.post("/recommendations/predict", payload);
  },

  generate: async (payload = {}) => {
    return api.post("/recommendations/generate", typeof payload === "object" ? payload : {});
  },

  getModelStatus: async () => {
    return api.get("/recommendations/model-status");
  },

  history: async (_customerId, params = {}) => {
    const res = await api.get("/recommendations/history", params);
    const rawData = res.data;
    const docs = Array.isArray(rawData) ? rawData : (rawData?.docs || []);
    const pagination = {
      page: rawData?.page || 1,
      limit: rawData?.limit || 8,
      total: rawData?.totalDocs || docs.length,
      totalPages: rawData?.totalPages || Math.ceil((rawData?.totalDocs || docs.length) / (rawData?.limit || 8)) || 1,
    };
    return {
      success: true,
      message: res.message,
      data: {
        data: docs,
        pagination,
      },
    };
  },

  listAll: async (params = {}) => {
    return api.get("/admin/recommendations", params);
  },
};
