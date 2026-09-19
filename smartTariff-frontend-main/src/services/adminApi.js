// Admin API Service
// Connects to Node.js/Express Backend at /api/v1/admin/*
import { api } from "./api";

export const adminApi = {
  dashboard: async () => {
    return api.get("/admin/dashboard");
  },

  getCustomers: async (params = {}) => {
    return api.get("/admin/customers", params);
  },

  getCustomerDetail: async (id) => {
    return api.get(`/admin/customers/${id}`);
  },

  updateCustomerStatus: async (id, isActive) => {
    return api.patch(`/admin/customers/${id}/status`, { isActive });
  },

  deleteCustomer: async (id) => {
    return api.delete(`/admin/customers/${id}`);
  },

  getPlans: async (params = {}) => {
    return api.get("/plans", params);
  },

  getUsage: async (params = {}) => {
    return api.get("/admin/usage", params);
  },

  getFeedback: async (params = {}) => {
    return api.get("/admin/feedback", params);
  },

  getRecommendations: async (params = {}) => {
    return api.get("/admin/recommendations", params);
  },
};
