# 学事智办初版数据库

数据库文件：`student_affairs_v0.1.sqlite3`  
数据库引擎：SQLite 3  
版本：0.1.0  
核验日期：2026-07-31

## 数据边界

- `source_document` 至 `public_contact`：学校官网可公开核验的事实和结构化映射。
- `demo_*`、`leave_*`、`approval_action`、`tool_call_log`：比赛用合成数据。
- 所有合成身份和业务编号以 `DEMO-` 开头，并通过数据库约束限制。
- 不包含真实学生个人信息、真实病历、真实审批或真实接口凭证。

## 主要数据表

| 类别 | 表 |
|---|---|
| 来源与组织 | `source_document`、`campus`、`organization_unit` |
| 校历 | `academic_term`、`class_period` |
| 制度 | `policy_document`、`policy_rule`、`approval_route` |
| 公共服务 | `public_contact` |
| 合成身份与课表 | `demo_user`、`demo_student_profile`、`demo_course`、`demo_course_schedule` |
| 请假流程 | `leave_application`、`leave_course_impact`、`leave_attachment`、`approval_action` |
| 智能体观测 | `tool_call_log`、`test_case` |

视图：

- `v_approval_route_catalog`：工作流审批路由。
- `v_leave_overview`：演示申请总览。
- `v_source_coverage`：来源对规则和联系方式的覆盖情况。

## 构建

在项目根目录执行：

```powershell
python database/build_database.py
python database/verify_database.py
```

构建脚本先生成同目录临时文件，完整性和外键检查通过后再原子替换目标数据库。测试用例由 `tests/fixtures/golden_cases_v0.1.csv` 导入。

## 供超星工作流使用的查询示例

```sql
-- 查询官方审批路由
SELECT * FROM v_approval_route_catalog ORDER BY route_id;

-- 查询某个合成学生的申请
SELECT * FROM v_leave_overview
WHERE synthetic_student_no = 'DEMO-2024-CS-001'
ORDER BY created_at DESC;

-- 根据服务名称检索公共联系方式
SELECT service_name, contact_value, verified_at, source_id
FROM public_contact
WHERE service_name LIKE '%心理咨询%';
```

## 生产接入前必须完成

1. 由学校确认 2021 版学籍细则及 2024 版学生手册的现行关系。
2. 明确跨天、自然日、工作日、教学课时和“一个月”的系统计算口径。
3. 取得统一身份认证、学生/课表、组织机构和审批系统的授权接口。
4. 将合成身份表替换为受控接口视图，不把真实学生数据复制到知识库。
5. 实现角色权限、行级数据隔离、加密、审计、留存与删除机制。

