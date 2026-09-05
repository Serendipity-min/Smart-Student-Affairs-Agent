# Changelog

All notable changes to the **Smart Student Affairs Management (学事智办)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.0.0-contest-demo] - 2026-09-06

### Added
- **Interactive Multi-Agent System**:
  - `T01`: Institutional Policy & Handbook Q&A with grounded Markdown citations.
  - `T02`: Structured leave application with pre-confirmation route calculation, approval preview, user confirmation form / IF branching, and direct HTTP draft creation and submission on confirmation (zero-write abort protection).
  - `T03`: Application status query and multi-step lifecycle timeline tracking.
- **Contest Demo Web Application (`contest_demo_web`)**:
  - Student Leave Management & AI Assistant portal.
  - Multi-Role Reviewer Workbench (`counselor` ➔ `teaching_vice_dean` ➔ `academic_affairs`).
  - Local hospital certificate preview without server-side PHI exposure.
- **Secure Server-Side Gateway (`contest_demo_gateway`)**:
  - Loopback-bound architecture isolating FastGPT API keys and backend tokens from browser exposure.
  - Role-based simulated identity enforcement (`DEMO-STU-001`, `counselor`, `teaching_vice_dean`, `academic_affairs`).
- **Deterministic Mock API Server (`external_mock_api`)**:
  - Automated leave approval route calculation according to student handbook rules.
  - 12-suite (covering 24 assertion checkpoints) Node.js integration & unit test suite.
  - 11-case Python test suite for fallback server compatibility.
- **Open Source Security & CI**:
  - GitHub Actions CI for multi-component builds and automated testing.
  - CodeQL static code analysis workflow.
  - Automated Dependabot dependency update configuration.
  - Open source security policy (`SECURITY.md`) and preflight audit report (`PUBLIC_RELEASE_AUDIT_V2.md`).

---

## [v0.3.0] - 2026-09-02 *(Historical Prototype)*
- Historical architecture exploration with multi-tier validation and platform test harnesses.
- Evaluated early FastGPT form schemas and node routing mechanisms.

## [v0.2.0] - 2026-09-01 *(Historical Prototype)*
- Initial public demo API prototype deployment with TLS reverse proxy on Tencent Cloud.
- Validated OpenAPI 3.0 schema import into SF-FastGPT platform.

## [v0.1.0] - 2026-08-31 *(Historical Prototype)*
- Initial repository setup and student handbook policy knowledge base design.

