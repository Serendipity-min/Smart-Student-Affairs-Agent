# Changelog

All notable changes to the **Smart Student Affairs Management (学事智办)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.0.0-contest-demo] - 2026-09-06

### Added
- **Interactive Multi-Agent System**:
  - `T01`: Institutional Policy & Handbook Q&A with grounded Markdown citations.
  - `T02`: Structured leave application with pre-confirmation route calculation, human-in-the-loop authorization gate (`userSelect`), and zero-write abort protection.
  - `T03`: Application status query and multi-step lifecycle timeline tracking.
- **Contest Demo Web Application (`contest_demo_web`)**:
  - Student Leave Management & AI Assistant portal.
  - Multi-Role Reviewer Workbench (`counselor` ➔ `teaching_vice_dean` ➔ `deputy_secretary`).
  - Local hospital certificate preview without server-side PHI exposure.
- **Secure Server-Side Gateway (`contest_demo_gateway`)**:
  - Loopback-bound architecture isolating FastGPT API keys and backend tokens from browser exposure.
  - Role-based simulated identity enforcement (`DEMO-STU-001`, `counselor-01`, etc.).
- **Deterministic Mock API Server (`external_mock_api`)**:
  - Automated leave approval route calculation according to student handbook rules.
  - Complete 24-case Node.js integration & unit test suite.
  - 11-case Python test suite for fallback server compatibility.
- **Open Source Security & CI**:
  - GitHub Actions CI for multi-component builds and automated testing.
  - CodeQL static code analysis workflow.
  - Automated Dependabot dependency update configuration.
  - Open source security policy (`SECURITY.md`) and preflight audit report (`PUBLIC_RELEASE_AUDIT.md`).

---

## [v0.3.0] - 2026-09-02
- Implemented capacity-layer physical isolation between read-only route calculation and state-mutating tools.
- Integrated FastGPT v4.9.2 native `userInputForms` schema.
- Added comprehensive 18-case 3-layer platform test harness.

## [v0.2.0] - 2026-09-01
- Deployed public demo API service with TLS reverse proxy on Tencent Cloud.
- Validated OpenAPI 3.0 schema import into SF-FastGPT platform.

## [v0.1.0] - 2026-08-31
- Initial repository setup and student handbook policy knowledge base design.
