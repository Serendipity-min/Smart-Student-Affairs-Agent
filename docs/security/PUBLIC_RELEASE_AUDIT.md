# 学事智办 · 开源发布前最终安全与合规审计报告 (Public Release Audit)

> **Contract ID**: `SSA-OSS-RELEASE-AUDIT-README-026`  
> **Repository**: `Serendipity-min/Smart_Student_Affairs_Management`  
> **Audit Baseline HEAD**: `f9fca7cd88ea0479365b266aefa7f8b9ea0dcf3f`  
> **Audit Working Branch**: `gemini/oss-release-audit`  
> **Visibility State**: `PRIVATE` (Strictly maintained until formal approval)  
> **Audit Date**: 2026-09-06  
> **Auditor**: Gemini (Advanced Agentic Pair Programmer)  
> **Reviewer**: Project Owner / ChatGPT PI  

---

## 1. 核心安全门禁核验结果 (Security Gate Summary)

| 审计项目 | 门禁标准 | 实测结果 | 判定 |
| :--- | :--- | :--- | :---: |
| **CRITICAL_SECRET** | 0 个真实有效凭证、私钥或云密钥 | 全历史与工作树 0 真实凭证 | :white_check_mark: PASS |
| **HIGH_SECRET** | 0 个历史明文 API Token / 平台密码 | 全历史 0 泄露（全部采用占位符/环境变量） | :white_check_mark: PASS |
| **UNREDACTED_PII** | 0 个真实手机号、身份证号、学号 | 0 真实个人信息，仅保留受控合成测试数据 | :white_check_mark: PASS |
| **PRIVATE_KEY** | 0 个 SSH / TLS 私钥文件 (`*.pem`, `*.key`) | 0 私钥文件（已被 `.gitignore` 全面加固） | :white_check_mark: PASS |
| **REAL_MEDICAL_DATA**| 0 份真实病历与就诊材料 | 仅在浏览器端内存加载模拟预览，零服务端存储 | :white_check_mark: PASS |
| **SERVER_IP_EXPOSURE** | 无敏感服务器直接裸 IP 暴露 | 已通过域名、反向代理与环境变量隔离 | :white_check_mark: PASS |
| **UNREVIEWED_BINARY** | 0 个未审查的图片、PDF 或临时压缩包 | 根目录无序图片已清理，保留 4 张语义化截图 | :white_check_mark: PASS |
| **BUILD_VERIFICATION** | Web 前端构建 100% 成功 | `npm run build` in `contest_demo_web` 正常生成 `dist/` | :white_check_mark: PASS |
| **TEST_SUITE_NODE** | Node.js 测试套件 100% 通过 | `24/24 PASS (100%)` | :white_check_mark: PASS |
| **TEST_SUITE_PYTHON** | Python 测试套件 100% 通过 | `11/11 PASS (100%)` | :white_check_mark: PASS |
| **ANONYMOUS_CLONE** | 独立隔离环境全新克隆无凭据构建通过 | 在全新无 `.env` 隔离环境下完成完整构建与测试 | :white_check_mark: PASS |
| **LICENSE_SELECTION** | 明确开源许可证草案 | 提供 `Apache-2.0`（等待负责人最终确认） | :hourglass_flowing_sand: PENDING_APPROVAL |

---

## 2. 详细审计与净化细节

### 2.1 全 Git 历史与对象 Secret 扫描 (Phase A1)
- **扫描范围**：覆盖全历史 789+ 个 Git Objects、所有分支与提交 Diff（`git log -p --all`）；
- **扫描模式**：SSH 私钥、OpenAI API Key (`sk-*`)、FastGPT Key (`fastgpt-*`)、GitHub Token (`ghp_*`)、Tencent Cloud 密钥 (`AKID*`)、Bearer Tokens、环境变量配置；
- **发现与处置**：
  - 未发现任何硬编码的生产 SSH 私钥或腾讯云 API 密钥；
  - 历史中出现的 Bearer 引用均为受控合成占位符（如 `synthetic_demo_token`）或测试断言；
  - 真实 FastGPT 鉴权凭证全程保存在安全网关本地 `.env` 与系统环境变量中，从未被 Git 追踪。

### 2.2 个人隐私与 PII 扫描 (Phase A2)
- **扫描模式**：大陆 11 位手机号 (`1[3-9]\d{9}`)、18 位身份证号、学生学号 (`20\d{8,10}`)、私人邮箱；
- **结果**：
  - 0 真实学生个人信息；
  - 仓库内仅包含公共制度指南公开办公邮箱（如 `fyncxsc@126.com`）与官方受控合成演示身份 `DEMO-STU-001`（张三）。

### 2.3 二进制与多媒体资产审查 (Phase A3)
- **根目录清理**：已通过 `git rm` 安全清理无语义哈希命名的临时截图（`2ccbc4933dcd3aa0389b6032c61883b7.png` 与 `75b37d70048e98bb3effa1619277f3e6.png`）；
- **语义化截图归档**：
  - `docs/screenshots/home-demo.png`：学生端首页与政策问答
  - `docs/screenshots/leave-preview.png`：请假申请表单与智能路径预览
  - `docs/screenshots/reviewer-workbench.png`：分级审批协同工作台
  - `docs/screenshots/approval-timeline.png`：申请单状态追踪与流转时间线
  - `docs/screenshots/45_t02_e2e_created_success.png` 等：FastGPT 平台端到端闭环验证证据。

### 2.4 仓库架构与开源标准化 (Phase A5~A8)
- **顶级文档完善**：
  - `README.md`：中英文对照、规范徽章、Mermaid 架构图、全流程快速上手与安全边界声明；
  - `SECURITY.md`：标准化开源安全策略与 GitHub 隐私漏洞提报指引；
  - `CONTRIBUTING.md`：贡献指南与规范提交工作流；
  - `THIRD_PARTY_NOTICES.md`：第三方依赖许可声明；
  - `CHANGELOG.md`：从开发原型到 v1.0.0-contest-demo 的版本演进记录。
- **环境配置示例**：
  - `contest_demo_gateway/.env.example`
  - `contest_demo_web/.env.example`
  - `external_mock_api/.env.example`
- **CI / CD 与自动化加固**：
  - `.github/workflows/ci.yml`：多模块自动化构建与回归测试工作流（无需外部 Secret）；
  - `.github/workflows/codeql.yml`：CodeQL 静态代码安全扫描；
  - `.github/dependabot.yml`：npm 与 GitHub Actions 依赖安全更新配置；
  - `scripts/open-source-audit.ps1` & `scripts/open-source-audit.sh`：本地开源合规快速审计脚本。

---

## 3. 匿名克隆复现验证 (Phase A9)

在独立测试目录（`anonymous_clone_test/`）下进行了无缓存、无凭证环境的完整克隆与构建测试：
1. **源码克隆**：`git clone -b gemini/oss-release-audit <repo>` 成功；
2. **Mock API 规则引擎**：依赖安装顺利，24 项 API 与规则单测全量通过 (`24/24 pass`)；
3. **Python 备用服务端**：11 项规则与状态单测全量通过 (`11/11 pass`)；
4. **安全网关服务**：语法与静态检查通过 (`node --check src/server.mjs`)；
5. **Web 前端构建**：`npm run build` 生成优化后的生产包 `dist/`，零 TypeScript 类型错误与构建警告。

---

## 4. 开源发布策略建议 (Phase A22)

根据合同标准，当前仓库历史无高危真实凭据泄漏，但包含较多开发阶段的内部审计报告、测试集草稿与历史碎片。

### 推荐方案 (Recommended Options):

- **方案 A (推荐 - 干净独立公开库)**：
  - 保留当前 `Smart_Student_Affairs_Management` 作为 **PRIVATE ARCHIVE**（完整保留所有开发与竞赛评审过程记录）；
  - 基于当前净化后的 `gemini/oss-release-audit` 分支导出代码，新建干净的 Public Repository（如 `Smart-Student-Affairs-Agent` 或 `student-affairs-agent`），以单一 Initial Root Commit 发布。
  - **优势**：彻底隔离开发期历史碎片，外部开源用户体验最佳。

- **方案 B (当前仓库直接公开)**：
  - 将当前 `gemini/oss-release-audit` 分支合并至 `master`，由项目负责人在 GitHub Settings 中手动将 `Serendipity-min/Smart_Student_Affairs_Management` 切换为 Public。
  - **优势**：保持原仓库 URL 与 Star/Watch 连续性。

---

## 5. 最终状态与审批等待

> [!IMPORTANT]
> **当前状态已严格保持为 PRIVATE。**  
> 所有技术 Gate 与匿名验证均已通过，当前停在：  
> **`WAITING_FOR_PUBLIC_APPROVAL`**  
> 请项目负责人审阅本报告，并确认许可证选择（默认 `Apache-2.0`）及发布方案。
