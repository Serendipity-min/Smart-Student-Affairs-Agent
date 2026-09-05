# Contributing to Smart Student Affairs Management (学事智办)

Thank you for your interest in contributing to **学事智办 (Smart Student Affairs Management)**! We welcome contributions that improve workflow stability, enhance security boundaries, refine documentation, and expand test coverage.

---

## 1. Code of Conduct
- Be respectful and constructive in all discussions.
- Strictly adhere to data privacy: never commit real personal information or credentials.
- Ensure all pull requests include appropriate automated tests.

---

## 2. Getting Started
1. Fork the repository and create a descriptive feature branch (e.g. `feat/leave-form-validation` or `fix/gateway-health-check`).
2. Install dependencies for the relevant components:
   ```bash
   # Web Frontend
   cd contest_demo_web && npm install

   # Secure Gateway
   cd ../contest_demo_gateway && npm install

   # Mock API Service
   cd ../external_mock_api && npm install
   ```
3. Run the automated test suites before submitting:
   ```bash
   # Run Node HTTP integration tests
   node --test external_mock_api/test/*.test.mjs

   # Run Python backend tests
   python mock_api/test_server.py
   ```

---

## 3. Pull Request Guidelines
- Follow conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- Verify that `.env` files or secret keys are **never** included in commits.
- Ensure CI checks pass cleanly.
