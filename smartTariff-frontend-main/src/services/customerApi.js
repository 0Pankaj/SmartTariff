// Customer Profile & Management API Service
// Connects to Node.js/Express Backend at /api/v1/customers/* and /api/v1/users/*
import { api } from "./api";

export const customerApi = {
  getProfile: async () => {
    return api.get("/customers/me/profile");
  },

  updateProfile: async (_userId, payload) => {
    return api.patch("/customers/me/profile", payload);
  },

  updateUser: async (_userId, payload) => {
    return api.patch("/users/me", payload);
  },

  listAll: async (params = {}) => {
    return api.get("/admin/customers", params);
  },

  getById: async (id) => {
    return api.get(`/admin/customers/${id}`);
  },

  setStatus: async (id, isActive) => {
    return api.patch(`/admin/customers/${id}/status`, { isActive });
  },

  remove: async (id) => {
    return api.delete(`/admin/customers/${id}`);
  },

  deleteCustomer: async (id) => {
    return api.delete(`/admin/customers/${id}`);
  },
};
