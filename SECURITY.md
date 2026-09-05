# Security Policy

## 1. Supported Versions

| Version | Supported | Notes |
| :--- | :---: | :--- |
| `v1.0.x-contest-demo` | :white_check_mark: | Current active demo baseline |
| `< v1.0.0` | :x: | Legacy development prototypes |

---

## 2. Reporting a Vulnerability

We take the security of the **Smart Student Affairs Management (学事智办)** project seriously. If you discover a security vulnerability, please do **NOT** open a public issue.

### Preferred Reporting Method
- Please report vulnerabilities privately via **[GitHub Private Vulnerability Reporting](https://github.com/Serendipity-min/Smart_Student_Affairs_Management/security/advisories/new)**.
- If private reporting is unavailable, please contact the maintainers directly through private competition channels.

### Information to Include
- Detailed description of the issue and potential impact
- Steps to reproduce or proof-of-concept (PoC)
- Suggested fix or mitigation (if available)

---

## 3. Demo & Open Source Safety Boundary

> [!IMPORTANT]
> **Data Privacy & Protection Rules:**
> 1. **Synthetic / Demo Data Only**: This project uses strictly synthetic test data (`DEMO-STU-*`, `DEMO-APP-*`). Do **NOT** submit real student names, national ID numbers, phone numbers, or student IDs.
> 2. **No Real Medical Records**: Medical proofs are simulated locally in the browser memory for demonstration purposes. Never upload real hospital certificates or diagnostic documents.
> 3. **No Hardcoded Credentials**: API tokens, database passwords, and platform secrets must always be supplied via server-side environment variables (`.env`).
> 4. **Demo Boundary**: This repository is designed for educational, research, and contest demonstration purposes. It is **not** directly connected to any live university ERP/SSO production systems.
