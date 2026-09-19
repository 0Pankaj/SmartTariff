# SmartTariff Production Environment Configuration Guide

## Overview
This document defines the required environment variables, configuration parameters, and operational settings for deploying the primary **SmartTariff** stack to production environments (e.g., AWS, GCP, Azure, Railway, Render, Fly.io, or on-premise Kubernetes).

---

## 1. Environment Variable Specifications

### A. Frontend (`smartTariff-frontend-main`)

| Variable Name | Required | Default / Safe Example | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `https://api.smarttariff.com/api/v1` | Publicly accessible URL of the Node.js Express API root. |
| `VITE_BACKEND_URL` | Optional | `https://api.smarttariff.com` | Base origin of the Node.js backend. |
| `VITE_CLIENT_URL` | Optional | `https://app.smarttariff.com` | Publicly accessible URL of the frontend application. |

> [!NOTE]
> All `VITE_*` variables are embedded into client JavaScript bundles at build time. **Never store server secrets in frontend environment variables.**

---

### B. Node.js Express API (`backend-node`)

| Variable Name | Required | Default / Safe Example | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production optimizations, secure cookies, and condensed error logging. |
| `PORT` | **Yes** | `5000` | Port on which the Express HTTP server listens. |
| `DATABASE_URL` | **Yes** | `postgresql://app_user:placeholder@db-pooler.region.neon.tech/smarttariff?sslmode=require&pgbouncer=true` | PostgreSQL connection string with SSL enabled and connection pooling configured. |
| `ML_SERVICE_URL` | **Yes** | `http://127.0.0.1:8000` or `http://ml-internal:8000` | Private internal HTTP endpoint for the Python ML inference microservice. |
| `JWT_ACCESS_SECRET` | **Yes** | `[MINIMUM_32_CHAR_HEX_SECRET]` | Cryptographically secure secret key used to sign and verify short-lived access tokens. |
| `JWT_REFRESH_SECRET` | **Yes** | `[MINIMUM_32_CHAR_HEX_SECRET]` | Cryptographically secure secret key used to sign and verify long-lived refresh tokens. |
| `ACCESS_TOKEN_EXPIRES_MINUTES` | Optional | `15` (Production standard) | Duration in minutes before access token expiration (default: 10080 for dev). |
| `REFRESH_TOKEN_EXPIRES_DAYS` | Optional | `30` | Duration in days before refresh token expiration. |
| `FRONTEND_URL` | **Yes** | `https://app.smarttariff.com,https://smarttariff.com` | Comma-separated whitelist of allowed frontend origins for strict CORS validation. |

---

### C. Python ML Inference Service (`ml-service`)

| Variable Name | Required | Default / Safe Example | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | **Yes** | `8000` | Port on which Uvicorn ASGI listens. |
| `HOST` | **Yes** | `0.0.0.0` or `127.0.0.1` | Network interface binding. In private internal VPCs, bind to private interface. |
| `MODEL_PATH` | **Yes** | `../smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl` | Path to the deserialized `RandomForestRegressor` `.pkl` artifact. |
| `CONFIG_PATH` | **Yes** | `../smartTariff-backend-main/smarttariff_v4_3_config.json` | Path to the metadata and feature mapping JSON file. |

---

## 2. Production Security Requirements

### HTTPS & Cookie Security
When `NODE_ENV=production`:
- Refresh cookies are generated with:
  - `httpOnly: true` (Prevents XSS extraction)
  - `secure: true` (Ensures transmission only over TLS/HTTPS)
  - `sameSite: "strict"` (Mitigates CSRF vulnerabilities)
- Any production reverse proxy (Nginx, Cloudflare, AWS ALB) must forward `X-Forwarded-Proto: https` so Express detects SSL.

### CORS Whitelisting
- Set `FRONTEND_URL` to your exact production custom domain(s).
- Wildcards (`*`) are disallowed when `credentials: true`.
- Node.js reflects credentials only for requests from verified whitelist origins.

### Internal Microservice Isolation
- The Python ML microservice on port 8000 is an **internal-only service**.
- It must **never** be exposed directly to the public internet.
- Firewalls, Docker networks, or VPC security groups should restrict port 8000 access exclusively to the Node.js container/instance.
