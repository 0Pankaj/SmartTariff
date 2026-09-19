// Tariff Plans API Service
// Connects to Node.js/Express Backend at /api/v1/plans/*
import { api } from "./api";

export const planApi = {
  list: async (filters = {}) => {
    const res = await api.get("/plans", filters);
    // Standardize pagination & item list for frontend consumption
    const rawData = res.data;
    const docs = Array.isArray(rawData) ? rawData : (rawData?.docs || rawData?.plans || []);
    const pagination = {
      page: rawData?.page || 1,
      limit: rawData?.limit || 12,
      total: rawData?.totalDocs || rawData?.total || docs.length,
      totalPages: rawData?.totalPages || Math.ceil((rawData?.totalDocs || docs.length) / (rawData?.limit || 12)) || 1,
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

  getById: async (id) => {
    return api.get(`/plans/${id}`);
  },

  getCategories: async () => {
    return api.get("/plans/categories");
  },

  create: async (payload) => {
    return api.post("/plans", payload);
  },

  update: async (id, payload) => {
    return api.put(`/plans/${id}`, payload);
  },

  remove: async (id) => {
    return api.delete(`/plans/${id}`);
  },
};
