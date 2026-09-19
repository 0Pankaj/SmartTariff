// Central HTTP API Client for SmartTariff
// Connects the React frontend directly to the Node.js/Express backend at /api/v1.

const API_BASE_URL = (() => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
  }
  return "http://localhost:5000/api/v1";
})();

export class ApiError extends Error {
  constructor(message, status = 400, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("smarttariff_token") ||
    null
  );
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("accessToken", token);
    localStorage.setItem("smarttariff_token", token);
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("smarttariff_token");
  }
}

export async function request(endpoint, options = {}) {
  const { method = "GET", body, headers = {}, params, _retry = false } = options;

  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  const token = getToken();
  const reqHeaders = {
    "Accept": "application/json",
    ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...headers,
  };

  const reqConfig = {
    method,
    headers: reqHeaders,
    credentials: "include",
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  };

  try {
    const response = await fetch(url, reqConfig);
    const contentType = response.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      if (response.status === 401) {
        const isAuthRoute =
          endpoint.includes("/auth/login") ||
          endpoint.includes("/auth/register") ||
          endpoint.includes("/auth/refresh");

        if (!isAuthRoute && !_retry) {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: "POST",
              headers: { "Accept": "application/json", "Content-Type": "application/json" },
              credentials: "include",
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newToken = refreshData?.data?.token || refreshData?.token;
              if (newToken) {
                setToken(newToken);
                return request(endpoint, { ...options, _retry: true });
              }
            }
          } catch {
            // Fall through to logout
          }
          setToken(null);
        } else if (!isAuthRoute) {
          setToken(null);
        }
      }
      const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMsg, response.status, data);
    }

    // Standardize envelope: { success: true, message: "...", data: ... }
    return {
      success: true,
      message: data?.message || "OK",
      data: data?.data !== undefined ? data.data : data,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || "Network error. Please ensure backend is running.", 0);
  }
}

export const api = {
  get: (endpoint, params, headers) => request(endpoint, { method: "GET", params, headers }),
  post: (endpoint, body, headers) => request(endpoint, { method: "POST", body, headers }),
  put: (endpoint, body, headers) => request(endpoint, { method: "PUT", body, headers }),
  patch: (endpoint, body, headers) => request(endpoint, { method: "PATCH", body, headers }),
  delete: (endpoint, headers) => request(endpoint, { method: "DELETE", headers }),
};

export function ok(data, message = "OK") {
  return { success: true, message, data };
}
