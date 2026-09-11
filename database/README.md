# 学事智办数据库 V1.0

`student_affairs_v1.0.sqlite3` 是“学事智办”比赛演示的**补充数据支撑层**：它保存可追溯的学校公开制度摘要、公开服务信息，以及明确标注为合成的 DEMO 流程与事务数据。它不是学校生产业务库，也不连接任何真实学生、教务或审批系统。

## 版本关系

| 文件 | 定位 | 处理规则 |
|---|---|---|
| `student_affairs_v0.1.sqlite3` | Historical baseline | 保留，不作为当前构建目标 |
| `student_affairs_v1.0.sqlite3` | Current supplementary database | 由 SQL 源文件重复构建和验证 |

请勿在 SQLite GUI 中直接手工修改 V1 二进制作为唯一变更来源；所有 V1 修改均应先落实到 `schema.sql`、`seed_*.sql` 或 `views.sql`。

## 数据边界与 Scope

| scope | 可包含内容 | 不可推断的内容 |
|---|---|---|
| `OFFICIAL_POLICY` | 学校公开制度的必要结构化摘录与来源索引 | 不在来源中出现的流程细节 |
| `DEMO_WORKFLOW` | 赛事演示的路由、确认和可选材料配置 | 学校正式制度 |
| `PUBLIC_SERVICE` | 官网公开的服务职责与联系方式 | 非公开内部通讯录 |
| `SYNTHETIC_DEMO` | `DEMO-` 前缀的课表、事务和课程影响说明 | 真实学生课表或申请记录 |

同一主题的官方事实和比赛演示规则会分别检索。例如，官方病假条目说明“医院证明”要求；DEMO 条目才说明“证明可选、无证明仍可提交、审核人可要求补充”。查询时必须保留 `scope`，不得把 DEMO 配置表述为校方制度。

## 主要结构

| 类别 | 表/视图 |
|---|---|
| 来源与组织 | `source_document`、`campus`、`organization_unit` |
| 校历与课程 | `academic_term`、`class_period`、`demo_course`、`demo_course_schedule` |
| 制度与路由 | `policy_document`、`policy_rule`、`approval_route` |
| 检索层 | `knowledge_item`、`knowledge_alias`、`v_knowledge_retrieval` |
| 公共服务 | `public_contact` |
| 合成 DEMO 事务 | `demo_user`、`demo_student_profile`、`leave_application`、`approval_action`、`tool_call_log` |

`knowledge_item` 提供规范问法、简要答案、scope、来源、定位和人工确认标记；`knowledge_alias` 将常见自然问法（如“病假单”“续假”“销假”“实习请假”）映射到知识条目。`v_knowledge_retrieval` 合并条目、别名及来源元数据，供知识库导出或查询使用。

## V1 DEMO 路由

下列路由均为 `DEMO_WORKFLOW`，不修改或替代原有 `OFFICIAL_POLICY` 路由：

| Route ID | DEMO 语义 |
|---|---|
| `ROUTE-DEMO-LE3-NORMAL` | 普通请假 ≤3 天：`counselor` |
| `ROUTE-DEMO-GT3-LE1M` | 普通请假 >3 天且 ≤1 自然月：`counselor > teaching_vice_dean` |
| `ROUTE-DEMO-INTERNSHIP-3LEVEL` | `off_campus_internship = true`：`counselor > teaching_vice_dean > academic_affairs` |
| `ROUTE-DEMO-GT1M-SUSPENSION` | 非实习普通请假 >1 自然月：人工休学流程提示 |

DEMO 合法 `leave_type` 为 `personal`、`sick`、`official_activity`、`other`。校外实习是独立字段 `off_campus_internship`，不是 `leave_type`。

## 重建与验证

在项目根目录执行：

```powershell
python database/build_database.py
python database/verify_database.py
```

构建过程先在同目录临时 SQLite 文件中执行所有受版本控制的 SQL，完成 SQLite 完整性和外键检查后原子替换 V1 文件。随后脚本从实际生成的数据库写出 `reports/DATABASE_V1_COVERAGE.md`。验证脚本检查版本、完整性、外键、scope、DEMO 路由、假别、病假双层语义、检索别名、规则检索入口与合成数据边界。

## 来源追溯

每个 `OFFICIAL_POLICY` 知识条目必须关联 `source_document.source_id`，可通过以下查询查看：

```sql
SELECT knowledge_id, scope, canonical_question, source_id, source_url, source_locator
FROM v_knowledge_retrieval
WHERE scope = 'OFFICIAL_POLICY'
ORDER BY knowledge_id;
```

来源仅记录阜阳师范大学官网、官方二级单位官网或权威政府来源。2024 学生手册目前仅保留 `metadata_only` 记录；未取得可核验全文前，不得据此补写具体条款。

## 生产接入前仍需校方确认

1. 2021 学籍细则与后续版本的现行关系，以及“自然月”、跨天和教学时段计算口径；
2. 正式请假、销假、续假、休学的系统入口、材料和角色授权；
3. 身份、课表、组织和审批接口的书面授权及最小权限范围；
4. 行级权限、审计、留存、删除、加密和健康信息处理规范。

在这些确认完成前，本数据库只能用于公开信息检索和合成赛事演示。
