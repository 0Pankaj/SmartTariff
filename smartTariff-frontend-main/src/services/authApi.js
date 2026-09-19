// Authentication API Client for SmartTariff
// Connects to Node.js/Express Backend at /api/v1/auth/*
import { api, setToken } from "./api";

export const authApi = {
  register: async (payload) => {
    const res = await api.post("/auth/register", payload);
    const token = res.data?.accessToken || res.data?.token;
    if (token) {
      setToken(token);
    }
    return res;
  },

  login: async (payload) => {
    const res = await api.post("/auth/login", payload);
    const token = res.data?.accessToken || res.data?.token;
    if (token) {
      setToken(token);
    }
    return res;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network failure on logout
    } finally {
      setToken(null);
    }
    return { success: true, message: "Logged out" };
  },

  me: async () => {
    return api.get("/auth/me");
  },
};
