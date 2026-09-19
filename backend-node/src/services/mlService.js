const fs = require("fs");
const path = require("path");
const config = require("../config/env");

let cachedConfig = null;

function loadModelConfig() {
  if (cachedConfig) return cachedConfig;
  const possiblePaths = [
    path.join(__dirname, "../../../smarttariff_v4_3_config.json"),
    path.join(__dirname, "../../../smartTariff-backend-main/smarttariff_v4_3_config.json"),
    path.join(process.cwd(), "smarttariff_v4_3_config.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        cachedConfig = JSON.parse(fs.readFileSync(p, "utf-8"));
        return cachedConfig;
      } catch (err) {
        console.warn(`[ML Service] Warning: Failed to parse ${p}:`, err.message);
      }
    }
  }

  // Fallback default config metadata
  cachedConfig = {
    model_name: "SmartTariff V4.3 (size-controlled)",
    model_version: "4.3.0",
    features: [
      "data_per_month_gb",
      "sms_per_month",
      "monthly_equivalent_inr",
      "duration_months",
      "discount_percent",
      "data_coverage_ratio",
      "sms_coverage_ratio",
      "data_waste_ratio",
      "sms_waste_ratio",
      "price_to_budget_ratio",
      "duration_match",
    ],
    training_customers: 30000,
    supported_durations: { "1": "Monthly", "3": "3 Months", "12": "Annual" },
    plans: 20,
  };
  return cachedConfig;
}

class MLService {
  async getModelStatus() {
    // 1. If Python ML service is running, query its live /model-status
    if (config.mlServiceUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${config.mlServiceUrl}/model-status`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) return json.data;
        }
      } catch {
        // Fall back to local config metadata
      }
    }

    const cfg = loadModelConfig();
    return {
      status: "active",
      model_name: cfg.model_name || "SmartTariff V4.3",
      version: cfg.model_version || "4.3.0",
      model_type: "RandomForestRegressor",
      n_features: 11,
      features: cfg.features || [
        "data_per_month_gb",
        "sms_per_month",
        "monthly_equivalent_inr",
        "duration_months",
        "discount_percent",
        "data_coverage_ratio",
        "sms_coverage_ratio",
        "data_waste_ratio",
        "sms_waste_ratio",
        "price_to_budget_ratio",
        "duration_match",
      ],
      training_customers: cfg.training_customers || 30000,
      supported_durations: cfg.supported_durations || { "1": "Monthly", "3": "3 Months", "12": "Annual" },
      plans_configured: Array.isArray(cfg.plans) ? cfg.plans.length : (cfg.plans || 20),
    };
  }

  /**
   * Request recommendations from Python ML inference microservice.
   * Dispatches to POST {ML_SERVICE_URL}/predict.
   * If the service is offline, times out, or returns invalid schema, returns null
   * so the caller can seamlessly fall back to deterministic rule-based scoring.
   */
  async getRecommendations(payload) {
    if (!config.mlServiceUrl) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      // The Python microservice provides POST /predict directly
      const candidateUrls = [
        `${config.mlServiceUrl}/predict`,
        `${config.mlServiceUrl}/api/v1/recommendations/predict`,
      ];

      let res = null;
      for (const url of candidateUrls) {
        try {
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          if (res.status !== 404) break;
        } catch {
          // Try next url
        }
      }

      clearTimeout(timeoutId);

      if (!res || !res.ok) {
        return null;
      }

      const json = await res.json();
      const data = json?.data || json;

      // Validate that the returned data contains valid recommendations array
      if (data && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        return data;
      }

      return null;
    } catch (err) {
      // Python inference service offline, timeout, or network error -> return null for fallback
      return null;
    }
  }

  /**
   * Query single 11-feature vector inference directly from Python ML service.
   */
  async predictVector(vector) {
    if (!config.mlServiceUrl) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${config.mlServiceUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vector),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json;
    } catch {
      return null;
    }
  }
}

module.exports = new MLService();
