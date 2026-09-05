# Deployment & Environment Configuration Guide

This document outlines the required and optional environment variables across all components.

---

## 1. Components Overview

| Component | Directory | Default Port | Description |
| :--- | :--- | :---: | :--- |
| **Demo Web** | `contest_demo_web/` | `5173` | React/TypeScript Frontend UI |
| **Secure Gateway** | `contest_demo_gateway/` | `3001` | Node.js Server-Side Security Gateway |
| **Mock API Server** | `external_mock_api/` | `3000` | Leave Management REST API & Rule Engine |

---

## 2. Environment Variables Specification

### `contest_demo_gateway/.env`
| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `GATEWAY_PORT` | Optional | `3001` | Port for the gateway service to listen on. |
| `FASTGPT_API_BASE` | Required | `https://fastgpt.sangfor.com.cn:19443/api/v1` | FastGPT API Base URL. |
| `FASTGPT_API_KEY` | Required | *(Secret)* | FastGPT API Key for agent execution. |
| `FASTGPT_T01_APP_ID` | Required | `6a9634b927050f47ea9588e4` | App ID for T01 Policy Q&A Agent. |
| `FASTGPT_T02_APP_ID` | Required | `6a96352a0e021e24a3cf09f6` | App ID for T02 Leave Application Workflow. |
| `FASTGPT_T03_APP_ID` | Required | `6a967fe18b2920d5d4191fc3` | App ID for T03 Status Query Workflow. |
| `DEMO_API_BASE` | Required | `http://127.0.0.1:3000` | Loopback URL for the internal Mock API. |
| `DEMO_API_TOKEN` | Required | *(Secret)* | Bearer token for authenticating with Mock API. |

### `external_mock_api/.env`
| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `3000` | Port for the REST API server. |
| `API_TOKEN` | Required | *(Secret)* | Bearer authentication token. |
| `DB_PATH` | Optional | `./data/demo_leaves.db` | Path to SQLite database file. |
