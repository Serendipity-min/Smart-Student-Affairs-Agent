BEGIN;

-- 官方条目只摘要现有公开来源已结构化的事实；未取得全文的学生手册保持 metadata_only。
INSERT INTO knowledge_item (knowledge_id, scope, topic, canonical_question, answer_summary, source_id, policy_id, rule_id, source_locator, authority_level, effective_status, verified_at, keywords, requires_human_confirmation, notes) VALUES
('KI-OFF-LEAVE-WRITTEN','OFFICIAL_POLICY','请假申请','请假需要先做什么？','学校公开细则要求请假应事先提出书面申请；具体系统入口和表单以学院或学校当前通知为准。','S002','POLICY-STUDENT-STATUS-2021','RULE-LEAVE-PRIOR-WRITTEN','第十二条','A','current','2026-07-31','请假 书面申请 事先申请',0,NULL),
('KI-OFF-LEAVE-SICK','OFFICIAL_POLICY','病假材料','学校公开制度对病假材料有什么要求？','学校公开细则记载病假须有医院证明；证明格式、医院等级和提交方式未在本数据库扩写，应向学院或校医院确认。','S002','POLICY-STUDENT-STATUS-2021','RULE-LEAVE-SICK-PROOF','第十二条','A','current','2026-07-31','病假 医院证明 诊断证明 病假材料',1,NULL),
('KI-OFF-LEAVE-RETRO','OFFICIAL_POLICY','事后补假','忘记提前请假可以补办吗？','公开细则规定原则上不得事后补假；因特殊原因无法本人办理的，可在三天内委托他人代办。','S002','POLICY-STUDENT-STATUS-2021','RULE-LEAVE-RETRO','第十二条','A','current','2026-07-31','事后补假 补假 代办 三天',1,NULL),
('KI-OFF-LEAVE-RENEW','OFFICIAL_POLICY','续假与销假','不能按时返校或假期结束后怎么办？','公开细则要求假期结束及时销假；不能按期返校时按原程序续假。','S002','POLICY-STUDENT-STATUS-2021','RULE-LEAVE-CANCEL-RENEW','第十二条','A','current','2026-07-31','续假 延期请假 不能返校 销假 返校登记',0,NULL),
('KI-OFF-LEAVE-OVER1M','OFFICIAL_POLICY','休学边界','请假超过一个月怎么办？','公开细则记载请假超过一个月应办理休学手续；具体办理材料与口径需由学院和教务处确认。','S002','POLICY-STUDENT-STATUS-2021','RULE-LEAVE-OVER-1M','第十二条','A','current','2026-07-31','超过一个月 请假 休学',1,NULL),
('KI-OFF-ABSENCE','OFFICIAL_POLICY','缺课边界','请假累计缺课太多有什么影响？','公开细则记载一学期因请假缺课累计超过该学期总学时三分之一，应办理休学手续；累计课时须由学校系统核算。','S002','POLICY-STUDENT-STATUS-2021','RULE-ABSENCE-SUSPENSION','第三十七条','A','current','2026-07-31','累计缺课 三分之一 休学',1,NULL),
('KI-OFF-NEW-STUDENT','OFFICIAL_POLICY','新生报到','新生不能按时报到怎么办？','公开细则记载新生不能按时报到应事先请假，请假一般不超过一周；个案以学校实际审核为准。','S002','POLICY-STUDENT-STATUS-2021','RULE-NEW-STUDENT-REG','第四条','A','current','2026-07-31','新生 报到 请假 一周',1,NULL),
('KI-OFF-LEAVE-LE3','OFFICIAL_POLICY','审批路径','学校公开制度中三天以内请假由谁批准？','公开细则记载三天以内请假由辅导员批准；校外实习期间由实习带队负责人批准并报学院备案。该事实与比赛 DEMO 路由分开维护。','S002','POLICY-STUDENT-STATUS-2021','RULE-LEAVE-3D','第十二条','A','current','2026-07-31','三天以内 辅导员 实习带队负责人',0,NULL),
('KI-OFF-LEAVE-LE14','OFFICIAL_POLICY','审批路径','学校公开制度中超过三天、两周以内请假如何审批？','公开细则记载超过三天、两周以内请假由学院分管教学副院长批准；实际办理入口以学校当前通知为准。','S002','POLICY-STUDENT-STATUS-2021','RULE-LEAVE-14D','第十二条','A','current','2026-07-31','超过三天 两周以内 副院长 审批',0,NULL),
('KI-OFF-LEAVE-LE1M','OFFICIAL_POLICY','审批路径','学校公开制度中超过两周、一个月以内请假如何审批？','公开细则记载超过两周、一个月以内请假由学院分管教学副院长签署意见后报教务处批准；自然月计算口径需由学校确认。','S002','POLICY-STUDENT-STATUS-2021','RULE-LEAVE-1M','第十二条','A','current','2026-07-31','超过两周 一个月以内 教务处 审批',1,NULL),
('KI-OFF-CALENDAR','OFFICIAL_POLICY','校历','当前学年校历和学期时间在哪里看？','学校校历页面提供当前学年校历；本数据库结构化保存已核验学期节点，临近期日程应以官网最新校历为准。','S004',NULL,NULL,'校历页面及附件','A','current','2026-07-31','校历 学期 开学 放假 考试',1,NULL),
('KI-OFF-CLASS-PERIOD','OFFICIAL_POLICY','上课节次','上课节次时间在哪里查询？','当前校历附件提供结构化上课节次时间；请假课程影响仅可对合成 DEMO 课表计算，正式课表应以学校系统为准。','S005',NULL,NULL,'校历附件节次表','A','current','2026-07-31','上课节次 课程时间 上课时间',1,NULL),
('KI-OFF-HANDBOOK','OFFICIAL_POLICY','学生手册','2024版学生手册能直接查询吗？','当前仅核验到学校曾组织2024级学生参加学生手册考试，未取得可公开复用的全文；不能据此推断具体条款。','S013',NULL,NULL,'通知元数据','B','metadata_only','2026-07-31','2024学生手册 手册考试',1,'verified_metadata_only'),
('KI-DEMO-LE3','DEMO_WORKFLOW','DEMO路由','比赛演示中请假三天以内由谁审核？','比赛 DEMO 配置：普通请假不超过三天由辅导员审核；这是竞赛演示流程，不是学校正式制度。',NULL,'POLICY-DEMO-LEAVE-0.1','RULE-DEMO-LE3-NORMAL','DEMO route configuration','DEMO','demo_only',NULL,'DEMO 三天以内 辅导员',0,NULL),
('KI-DEMO-GT3','DEMO_WORKFLOW','DEMO路由','比赛演示中请假四天由谁审核？','比赛 DEMO 配置：普通请假超过三天且不超过一个自然月，依次由辅导员和学院分管教学副院长审核。',NULL,'POLICY-DEMO-LEAVE-0.1','RULE-DEMO-GT3-LE1M','DEMO route configuration','DEMO','demo_only',NULL,'DEMO 四天 副院长 审批',0,NULL),
('KI-DEMO-INTERNSHIP','DEMO_WORKFLOW','DEMO路由','比赛演示中校外实习请假如何审批？','比赛 DEMO 配置：校外实习状态优先于时长，依次由辅导员、学院分管教学副院长和教务处审核。',NULL,'POLICY-DEMO-LEAVE-0.1','RULE-DEMO-INTERNSHIP-3LEVEL','DEMO route configuration','DEMO','demo_only',NULL,'DEMO 校外实习 三级审批 教务处',0,NULL),
('KI-DEMO-SUSPENSION','DEMO_WORKFLOW','DEMO路由','比赛演示中普通请假超过一个自然月怎么办？','比赛 DEMO 配置：非校外实习的普通请假超过一个自然月，转人工休学流程提示；校外实习仍走三级审核。',NULL,'POLICY-DEMO-LEAVE-0.1','RULE-DEMO-GT1M-SUSPENSION','DEMO route configuration','DEMO','demo_only',NULL,'DEMO 超过一个月 休学 校外实习',0,NULL),
('KI-DEMO-SICK','DEMO_WORKFLOW','DEMO病假材料','比赛演示中病假没有医院证明能提交吗？','比赛 DEMO 配置：医院证明为可选声明；无证明仍可提交，审核人可以要求补充。这不替代学校正式材料要求。',NULL,'POLICY-DEMO-LEAVE-0.1','RULE-DEMO-SICK-MATERIAL','DEMO material configuration','DEMO','demo_only',NULL,'DEMO 病假 医院证明 可选 补充材料',0,NULL),
('KI-DEMO-LIFECYCLE','DEMO_WORKFLOW','DEMO办理生命周期','比赛演示中的请假状态如何理解？','比赛 DEMO 中，申请先生成预览并等待确认；确认后提交进入审核，审核人可要求补充、批准或不批准，学生可在提交前撤回。状态语义仅用于竞赛演示。',NULL,'POLICY-DEMO-LEAVE-0.1','RULE-DEMO-CONFIRM','DEMO state-machine configuration','DEMO','demo_only',NULL,'DEMO 预览 确认 提交 审核 补充 驳回 撤回',0,NULL),
('KI-PUBLIC-PSY','PUBLIC_SERVICE','公共服务','心理咨询如何联系？','学生工作处公开页面列有心理咨询服务、心理教育实践和预约联系方式；紧急人身危险应优先联系公安或校园安保。','S010',NULL,NULL,'学生工作处办公电话','B','current','2026-07-31','心理咨询 心理预约 心理服务',0,NULL),
('KI-PUBLIC-STUDENT-WORK','PUBLIC_SERVICE','公共服务','学生工作处可以提供哪些事务咨询？','学生工作处公开办公电话页面列有学生管理、学生资助、思想教育等公开服务联系方式；具体事项请按公开分工联系对应岗位。','S010',NULL,NULL,'学生工作处办公电话','B','current','2026-07-31','学生工作处 学工处 学生管理 学生资助',0,NULL),
('KI-PUBLIC-ACADEMIC','PUBLIC_SERVICE','公共服务','教务相关服务应联系哪个部门？','学校党政管理机构页面列有教务处；具体业务窗口、材料和办理时段应以教务处当前公开通知为准。','S007',NULL,NULL,'党政管理机构','A','current','2026-07-31','教务处 教务服务 课程 成绩',1,NULL),
('KI-PUBLIC-SECURITY','PUBLIC_SERVICE','公共服务','校园报警电话是多少？','学校保卫处公开校园报警电话和校内短号；紧急人身危险应同时拨打110。','S011',NULL,NULL,'校园报警信息','B','current','2026-07-31','校园报警 保卫处 8110',0,NULL),
('KI-PUBLIC-HOSPITAL','PUBLIC_SERVICE','公共服务','校医院值班电话是多少？','后勤公开联系方式包含清河和西湖校区校医院值班电话；严重急症应优先拨打120。','S012',NULL,NULL,'联系我们','B','current','2026-07-31','校医院 值班电话 医疗',0,NULL),
('KI-PUBLIC-REPAIR','PUBLIC_SERVICE','公共服务','校园水电维修如何联系？','后勤公开联系方式列有清河和西湖校区维修电话及服务说明。','S012',NULL,NULL,'联系我们','B','current','2026-07-31','维修 水电 后勤',0,NULL),
('KI-SYN-COURSE','SYNTHETIC_DEMO','合成课程影响','比赛演示如何展示请假影响课程？','仅对以 DEMO- 开头的合成课程表计算请假时间与课程交集，不接入或保存真实学生课表。',NULL,NULL,NULL,'synthetic schedule model','DEMO','demo_only',NULL,'DEMO 课程 课表 课程影响',0,NULL);

INSERT INTO knowledge_alias (alias_id, knowledge_id, alias_text, alias_type) VALUES
('KA-001','KI-OFF-LEAVE-SICK','病假单','synonym'),('KA-002','KI-OFF-LEAVE-SICK','医院证明','synonym'),('KA-003','KI-OFF-LEAVE-SICK','诊断证明','synonym'),('KA-004','KI-OFF-LEAVE-SICK','病假材料','synonym'),
('KA-005','KI-OFF-LEAVE-RENEW','续假','synonym'),('KA-006','KI-OFF-LEAVE-RENEW','延期请假','synonym'),('KA-007','KI-OFF-LEAVE-RENEW','不能按时返校','natural_language'),('KA-008','KI-OFF-LEAVE-RENEW','延长假期','natural_language'),
('KA-009','KI-OFF-LEAVE-RENEW','销假','synonym'),('KA-010','KI-OFF-LEAVE-RENEW','返校登记','synonym'),('KA-011','KI-OFF-LEAVE-RENEW','假期结束怎么办','natural_language'),
('KA-012','KI-OFF-LEAVE-RETRO','忘记请假','natural_language'),('KA-013','KI-OFF-LEAVE-RETRO','补假','synonym'),('KA-014','KI-OFF-LEAVE-OVER1M','请假一个月','natural_language'),
('KA-022','KI-OFF-LEAVE-LE3','三天以内谁批准','natural_language'),('KA-023','KI-OFF-LEAVE-LE14','请假一周谁审批','natural_language'),('KA-024','KI-OFF-LEAVE-LE1M','请假二十天谁审批','natural_language'),
('KA-027','KI-OFF-CLASS-PERIOD','上课时间','synonym'),('KA-028','KI-OFF-CLASS-PERIOD','第几节课','natural_language'),
('KA-015','KI-DEMO-GT3','请假四天谁审批','natural_language'),('KA-016','KI-DEMO-INTERNSHIP','实习请假','synonym'),('KA-017','KI-DEMO-SICK','没有证明能请病假吗','natural_language'),
('KA-018','KI-PUBLIC-PSY','心理预约','synonym'),('KA-019','KI-PUBLIC-SECURITY','保卫处电话','synonym'),('KA-020','KI-PUBLIC-HOSPITAL','医院电话','synonym'),('KA-021','KI-PUBLIC-REPAIR','报修','synonym'),
('KA-025','KI-PUBLIC-STUDENT-WORK','学工处','abbreviation'),('KA-026','KI-PUBLIC-ACADEMIC','教务服务','synonym'),
('KA-029','KI-DEMO-LIFECYCLE','撤回申请','synonym'),('KA-030','KI-DEMO-LIFECYCLE','审核状态','natural_language'),('KA-031','KI-DEMO-LIFECYCLE','被驳回怎么办','natural_language');

COMMIT;
