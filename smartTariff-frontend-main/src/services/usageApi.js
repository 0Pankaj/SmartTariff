// Usage Telemetry API Service
// Connects to Node.js/Express Backend at /api/v1/usage/* and /api/v1/admin/usage/*
import { api } from "./api";

export const usageApi = {
  getMine: async () => {
    const res = await api.get("/usage/me", { limit: 100 });
    const docs = res.data?.docs || (Array.isArray(res.data) ? res.data : []);
    return {
      success: true,
      message: res.message,
      data: docs,
    };
  },

  getForCustomer: async (customerId) => {
    const res = await api.get(`/admin/customers/${customerId}`);
    const usage = res.data?.usage || [];
    return {
      success: true,
      message: res.message,
      data: usage,
    };
  },

  create: async (payload) => {
    return api.post("/usage", payload);
  },

  update: async (id, payload) => {
    return api.patch(`/usage/${id}`, payload);
  },

  listAll: async (params = {}) => {
    return api.get("/admin/usage", params);
  },

  bulkImport: async (fileOrRows) => {
    if (fileOrRows instanceof File) {
      const formData = new FormData();
      formData.append("file", fileOrRows);
      return api.post("/admin/usage/import", formData);
    }
    // If rows array passed, convert to CSV Blob
    const headers = ["customerId", "month", "dataUsage", "callMinutes", "smsCount", "numberOfCalls"];
    const csvContent = [
      headers.join(","),
      ...fileOrRows.map((r) =>
        [
          r.customerId || r.userId || "",
          r.month || "",
          r.dataUsage || 0,
          r.callMinutes || 0,
          r.smsCount || 0,
          r.numberOfCalls || 0,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", blob, "usage_import.csv");
    return api.post("/admin/usage/import", formData);
  },
};
