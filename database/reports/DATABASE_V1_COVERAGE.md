# 学事智办数据库 V1 覆盖报告

本报告由 `python database/build_database.py` 从 `student_affairs_v1.0.sqlite3` 实际计算生成。

## 构建摘要

| 项目 | 数量/值 |
|---|---:|
| 数据库版本 | `1.0.0` |
| 来源文档 | 15 |
| 官方制度文件 | 1 |
| 制度规则 | 16 |
| 官方审批路由 | 5 |
| DEMO 审批路由 | 4 |
| 知识条目 | 26 |
| 同义问法 | 31 |
| 公共服务联系人 | 17 |
| 合成学生 | 12 |
| 合成请假申请 | 14 |
| 视图 | 4 |
| 非系统索引 | 10 |
| 验证检查组 | 9 |
| 无检索入口的官方规则 | 0 |

## 知识检索分层

| scope | 知识条目数 |
|---|---:|
| `DEMO_WORKFLOW` | 6 |
| `OFFICIAL_POLICY` | 13 |
| `PUBLIC_SERVICE` | 6 |
| `SYNTHETIC_DEMO` | 1 |

## 边界说明

- `OFFICIAL_POLICY` 条目均引用 `source_document.source_id`；DEMO 规则和合成流程不作为校方正式制度。
- 当前官方 `policy_rule` 均应具有 `knowledge_item.rule_id` 检索入口；该项为 0 才代表无遗漏。
- `PUBLIC_SERVICE` 仅保留公开服务联系方式；`SYNTHETIC_DEMO` 仅用于演示课表与请假影响说明。
- 2024 学生手册在未取得可核验全文前保持 `metadata_only`，不据此补写具体条款。
