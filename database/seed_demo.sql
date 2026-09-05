BEGIN;

-- 审批人与学生均为比赛用合成身份，不对应任何真实人员。
INSERT INTO demo_user (user_id, role, display_name, unit_id) VALUES
('DEMO-COUNSELOR-CS','counselor','演示辅导员（计算机学院）','COLLEGE-CS'),
('DEMO-COUNSELOR-EDU','counselor','演示辅导员（教育学院）','COLLEGE-EDU'),
('DEMO-INTERNSHIP-LEADER','internship_leader','演示实习带队负责人','COLLEGE-CS'),
('DEMO-VICE-DEAN-CS','teaching_vice_dean','演示分管教学副院长（计算机学院）','COLLEGE-CS'),
('DEMO-VICE-DEAN-EDU','teaching_vice_dean','演示分管教学副院长（教育学院）','COLLEGE-EDU'),
('DEMO-ACADEMIC-AFFAIRS','academic_affairs','演示教务审批人','UNIT-JWC'),
('DEMO-INSTRUCTOR-01','instructor','演示教师01','COLLEGE-CS'),
('DEMO-INSTRUCTOR-02','instructor','演示教师02','COLLEGE-EDU'),
('DEMO-STU-001','student','演示学生01','COLLEGE-CS'),
('DEMO-STU-002','student','演示学生02','COLLEGE-CS'),
('DEMO-STU-003','student','演示学生03','COLLEGE-CS'),
('DEMO-STU-004','student','演示学生04','COLLEGE-CS'),
('DEMO-STU-005','student','演示学生05','COLLEGE-CS'),
('DEMO-STU-006','student','演示学生06','COLLEGE-CS'),
('DEMO-STU-007','student','演示学生07','COLLEGE-EDU'),
('DEMO-STU-008','student','演示学生08','COLLEGE-EDU'),
('DEMO-STU-009','student','演示学生09','COLLEGE-EDU'),
('DEMO-STU-010','student','演示学生10','COLLEGE-EDU'),
('DEMO-STU-011','student','演示学生11','COLLEGE-EDU'),
('DEMO-STU-012','student','演示学生12','COLLEGE-EDU');

INSERT INTO demo_student_profile VALUES
('DEMO-STU-001','DEMO-2024-CS-001','COLLEGE-CS','计算机科学与技术',2024,'演示计科1班','CAMPUS-XH','DEMO-COUNSELOR-CS',1),
('DEMO-STU-002','DEMO-2024-CS-002','COLLEGE-CS','计算机科学与技术',2024,'演示计科1班','CAMPUS-XH','DEMO-COUNSELOR-CS',1),
('DEMO-STU-003','DEMO-2024-CS-003','COLLEGE-CS','软件工程',2024,'演示软件1班','CAMPUS-XH','DEMO-COUNSELOR-CS',1),
('DEMO-STU-004','DEMO-2024-CS-004','COLLEGE-CS','软件工程',2024,'演示软件1班','CAMPUS-XH','DEMO-COUNSELOR-CS',1),
('DEMO-STU-005','DEMO-2023-CS-005','COLLEGE-CS','物联网工程',2023,'演示物联1班','CAMPUS-XH','DEMO-COUNSELOR-CS',1),
('DEMO-STU-006','DEMO-2023-CS-006','COLLEGE-CS','数据科学与大数据技术',2023,'演示数据1班','CAMPUS-XH','DEMO-COUNSELOR-CS',1),
('DEMO-STU-007','DEMO-2024-EDU-007','COLLEGE-EDU','小学教育',2024,'演示小教1班','CAMPUS-QH','DEMO-COUNSELOR-EDU',1),
('DEMO-STU-008','DEMO-2024-EDU-008','COLLEGE-EDU','小学教育',2024,'演示小教1班','CAMPUS-QH','DEMO-COUNSELOR-EDU',1),
('DEMO-STU-009','DEMO-2023-EDU-009','COLLEGE-EDU','学前教育',2023,'演示学前1班','CAMPUS-QH','DEMO-COUNSELOR-EDU',1),
('DEMO-STU-010','DEMO-2023-EDU-010','COLLEGE-EDU','学前教育',2023,'演示学前1班','CAMPUS-QH','DEMO-COUNSELOR-EDU',1),
('DEMO-STU-011','DEMO-2025-EDU-011','COLLEGE-EDU','教育技术学',2025,'演示教技1班','CAMPUS-QH','DEMO-COUNSELOR-EDU',1),
('DEMO-STU-012','DEMO-2025-EDU-012','COLLEGE-EDU','教育技术学',2025,'演示教技1班','CAMPUS-QH','DEMO-COUNSELOR-EDU',1);

INSERT INTO demo_course VALUES
('DEMO-COURSE-001','数据结构','DEMO-INSTRUCTOR-01','TERM-2026-2027-1',1),
('DEMO-COURSE-002','数据库原理','DEMO-INSTRUCTOR-01','TERM-2026-2027-1',1),
('DEMO-COURSE-003','计算机网络','DEMO-INSTRUCTOR-01','TERM-2026-2027-1',1),
('DEMO-COURSE-004','人工智能导论','DEMO-INSTRUCTOR-01','TERM-2026-2027-1',1),
('DEMO-COURSE-005','软件工程','DEMO-INSTRUCTOR-01','TERM-2026-2027-1',1),
('DEMO-COURSE-006','教育学原理','DEMO-INSTRUCTOR-02','TERM-2026-2027-1',1),
('DEMO-COURSE-007','教育心理学','DEMO-INSTRUCTOR-02','TERM-2026-2027-1',1),
('DEMO-COURSE-008','课程与教学论','DEMO-INSTRUCTOR-02','TERM-2026-2027-1',1),
('DEMO-COURSE-009','现代教育技术','DEMO-INSTRUCTOR-02','TERM-2026-2027-1',1),
('DEMO-COURSE-010','教师职业道德','DEMO-INSTRUCTOR-02','TERM-2026-2027-1',1),
('DEMO-COURSE-011','创新创业基础','DEMO-INSTRUCTOR-01','TERM-2026-2027-1',1),
('DEMO-COURSE-012','大学生心理健康','DEMO-INSTRUCTOR-02','TERM-2026-2027-1',1);

INSERT INTO demo_course_schedule VALUES
('DEMO-SCH-001','DEMO-COURSE-001','DEMO-STU-001',1,1,2,1,18,'西湖校区演示教室A101'),
('DEMO-SCH-002','DEMO-COURSE-002','DEMO-STU-001',3,3,4,1,18,'西湖校区演示机房B201'),
('DEMO-SCH-003','DEMO-COURSE-003','DEMO-STU-002',2,1,2,1,18,'西湖校区演示教室A102'),
('DEMO-SCH-004','DEMO-COURSE-004','DEMO-STU-003',4,5,6,1,18,'西湖校区演示机房B202'),
('DEMO-SCH-005','DEMO-COURSE-005','DEMO-STU-004',5,3,4,1,18,'西湖校区演示教室A103'),
('DEMO-SCH-006','DEMO-COURSE-011','DEMO-STU-005',1,7,8,1,18,'西湖校区演示教室C301'),
('DEMO-SCH-007','DEMO-COURSE-002','DEMO-STU-006',3,5,6,1,18,'西湖校区演示机房B203'),
('DEMO-SCH-008','DEMO-COURSE-006','DEMO-STU-007',1,1,2,1,18,'清河校区演示教室D101'),
('DEMO-SCH-009','DEMO-COURSE-007','DEMO-STU-008',2,3,4,1,18,'清河校区演示教室D102'),
('DEMO-SCH-010','DEMO-COURSE-008','DEMO-STU-009',3,5,6,1,18,'清河校区演示教室D103'),
('DEMO-SCH-011','DEMO-COURSE-009','DEMO-STU-010',4,7,8,1,18,'清河校区演示机房E201'),
('DEMO-SCH-012','DEMO-COURSE-010','DEMO-STU-011',5,1,2,1,18,'清河校区演示教室D104'),
('DEMO-SCH-013','DEMO-COURSE-012','DEMO-STU-012',2,9,10,1,18,'清河校区演示教室D105');

-- 申请覆盖草稿、待确认、审批中、补材料、批准、拒绝、撤回、销假和工具失败等状态。
INSERT INTO leave_application VALUES
('DEMO-APP-001','DEMO-REQ-001','DEMO-STU-001','sick','短期身体不适','演示：身体不适，拟请假一天。','2026-09-07 08:00:00','2026-09-07 21:35:00',1,0,0,'approved','ROUTE-LE3-NORMAL',NULL,NULL,'2026-09-06 20:10:00','2026-09-06 20:00:00','2026-09-06 21:00:00'),
('DEMO-APP-002','DEMO-REQ-002','DEMO-STU-002','personal','家庭事务','演示：处理家庭事务，拟请假三天。','2026-09-14 08:00:00','2026-09-16 21:35:00',3,0,0,'under_review','ROUTE-LE3-NORMAL','counselor',NULL,'2026-09-13 18:20:00','2026-09-13 18:00:00','2026-09-13 18:20:00'),
('DEMO-APP-003','DEMO-REQ-003','DEMO-STU-003','sick','短期治疗','演示：遵医嘱休息四天，证明为合成附件。','2026-09-21 08:00:00','2026-09-24 21:35:00',4,0,0,'need_more_info','ROUTE-GT3-LE14','teaching_vice_dean',NULL,'2026-09-20 10:15:00','2026-09-20 10:00:00','2026-09-20 11:00:00'),
('DEMO-APP-004','DEMO-REQ-004','DEMO-STU-004','personal','家庭事务','演示：家庭事务，拟请假十四天。','2026-10-01 08:00:00','2026-10-14 21:35:00',14,0,0,'submitted','ROUTE-GT3-LE14','teaching_vice_dean',NULL,'2026-09-28 09:10:00','2026-09-28 09:00:00','2026-09-28 09:10:00'),
('DEMO-APP-005','DEMO-REQ-005','DEMO-STU-005','sick','康复休养','演示：康复休养十五天，证明为合成附件。','2026-10-19 08:00:00','2026-11-02 21:35:00',15,0,0,'under_review','ROUTE-GT14-LE1M','academic_affairs',NULL,'2026-10-16 14:20:00','2026-10-16 14:00:00','2026-10-17 09:00:00'),
('DEMO-APP-006','DEMO-REQ-006','DEMO-STU-006','internship','校外实习事务','演示：校外实习期间请假两天。','2026-11-09 08:00:00','2026-11-10 21:35:00',2,1,0,'approved','ROUTE-LE3-INTERNSHIP',NULL,NULL,'2026-11-08 12:10:00','2026-11-08 12:00:00','2026-11-08 18:00:00'),
('DEMO-APP-007','DEMO-REQ-007','DEMO-STU-007','personal','家庭事务','演示：请假草稿，尚未确认起止时段。','2026-11-16 08:00:00','2026-11-17 21:35:00',2,0,0,'pending_confirmation','ROUTE-LE3-NORMAL',NULL,NULL,NULL,'2026-11-15 19:00:00','2026-11-15 19:00:00'),
('DEMO-APP-008','DEMO-REQ-008','DEMO-STU-008','official_activity','校外竞赛','演示：参加校外竞赛，申请五天。','2026-11-23 08:00:00','2026-11-27 21:35:00',5,0,0,'rejected','ROUTE-GT3-LE14',NULL,NULL,'2026-11-19 09:20:00','2026-11-19 09:00:00','2026-11-20 16:00:00'),
('DEMO-APP-009','DEMO-REQ-009','DEMO-STU-009','personal','个人事务','演示：个人事务申请，提交前主动撤回。','2026-12-01 08:00:00','2026-12-02 21:35:00',2,0,0,'withdrawn','ROUTE-LE3-NORMAL',NULL,NULL,'2026-11-29 11:10:00','2026-11-29 11:00:00','2026-11-29 12:00:00'),
('DEMO-APP-010','DEMO-REQ-010','DEMO-STU-010','sick','身体不适','演示：已批准并在返校后完成销假。','2026-12-07 08:00:00','2026-12-08 21:35:00',2,0,0,'cancelled','ROUTE-LE3-NORMAL',NULL,NULL,'2026-12-06 09:10:00','2026-12-06 09:00:00','2026-12-09 08:00:00'),
('DEMO-APP-011','DEMO-REQ-011','DEMO-STU-011','other','待补充原因','演示：工具调用失败，未产生正式提交。','2026-12-14 08:00:00','2026-12-14 21:35:00',1,0,0,'tool_failed','ROUTE-LE3-NORMAL',NULL,NULL,NULL,'2026-12-13 20:00:00','2026-12-13 20:01:00'),
('DEMO-APP-012','DEMO-REQ-012','DEMO-STU-012','personal','家庭事务','演示：超过一个月，应转休学流程。','2026-09-01 08:00:00','2026-10-10 21:35:00',40,0,0,'returned','ROUTE-GT1M-SUSPEND',NULL,NULL,'2026-08-28 14:10:00','2026-08-28 14:00:00','2026-08-28 15:00:00'),
('DEMO-APP-013','DEMO-REQ-013','DEMO-STU-001','sick','恢复期延长','演示：由原申请发起续假两天。','2026-09-08 08:00:00','2026-09-09 21:35:00',2,0,0,'approved','ROUTE-LE3-NORMAL',NULL,'DEMO-APP-001','2026-09-07 18:15:00','2026-09-07 18:00:00','2026-09-07 20:00:00'),
('DEMO-APP-014','DEMO-REQ-014','DEMO-STU-002','personal','特殊原因','演示：事后补办场景，转人工复核。','2026-09-01 08:00:00','2026-09-02 21:35:00',2,0,1,'need_more_info','ROUTE-LE3-NORMAL','counselor',NULL,'2026-09-03 10:10:00','2026-09-03 10:00:00','2026-09-03 10:30:00');

INSERT INTO leave_course_impact VALUES
('DEMO-IMPACT-001','DEMO-APP-001','DEMO-SCH-001','2026-09-07',2),
('DEMO-IMPACT-002','DEMO-APP-002','DEMO-SCH-003','2026-09-15',2),
('DEMO-IMPACT-003','DEMO-APP-003','DEMO-SCH-004','2026-09-24',2),
('DEMO-IMPACT-004','DEMO-APP-004','DEMO-SCH-005','2026-10-02',2),
('DEMO-IMPACT-005','DEMO-APP-005','DEMO-SCH-006','2026-10-19',2),
('DEMO-IMPACT-006','DEMO-APP-006','DEMO-SCH-007','2026-11-09',2),
('DEMO-IMPACT-007','DEMO-APP-007','DEMO-SCH-008','2026-11-16',2),
('DEMO-IMPACT-008','DEMO-APP-008','DEMO-SCH-009','2026-11-24',2),
('DEMO-IMPACT-009','DEMO-APP-010','DEMO-SCH-011','2026-12-08',2),
('DEMO-IMPACT-010','DEMO-APP-011','DEMO-SCH-012','2026-12-14',2);

INSERT INTO leave_attachment VALUES
('DEMO-ATT-001','DEMO-APP-001','hospital_certificate','demo_hospital_certificate_001.pdf','application/pdf','demo://attachments/DEMO-ATT-001','1111111111111111111111111111111111111111111111111111111111111111','verified_demo','2026-09-06 20:05:00'),
('DEMO-ATT-002','DEMO-APP-003','hospital_certificate','demo_hospital_certificate_003.pdf','application/pdf','demo://attachments/DEMO-ATT-002','2222222222222222222222222222222222222222222222222222222222222222','pending','2026-09-20 10:05:00'),
('DEMO-ATT-003','DEMO-APP-005','hospital_certificate','demo_hospital_certificate_005.pdf','application/pdf','demo://attachments/DEMO-ATT-003','3333333333333333333333333333333333333333333333333333333333333333','verified_demo','2026-10-16 14:05:00'),
('DEMO-ATT-004','DEMO-APP-008','supporting_document','demo_competition_notice_008.pdf','application/pdf','demo://attachments/DEMO-ATT-004','4444444444444444444444444444444444444444444444444444444444444444','rejected_demo','2026-11-19 09:05:00');

INSERT INTO approval_action VALUES
('DEMO-ACTION-001','DEMO-APP-001','DEMO-STU-001','student','create_draft',NULL,'draft','创建合成请假草稿','2026-09-06 20:00:00'),
('DEMO-ACTION-002','DEMO-APP-001','DEMO-STU-001','student','submit','pending_confirmation','submitted','确认摘要后提交','2026-09-06 20:10:00'),
('DEMO-ACTION-003','DEMO-APP-001','DEMO-COUNSELOR-CS','counselor','approve','under_review','approved','演示审批通过','2026-09-06 21:00:00'),
('DEMO-ACTION-004','DEMO-APP-002','DEMO-STU-002','student','submit','pending_confirmation','submitted','提交演示申请','2026-09-13 18:20:00'),
('DEMO-ACTION-005','DEMO-APP-003','DEMO-VICE-DEAN-CS','teaching_vice_dean','request_more_info','under_review','need_more_info','演示：请补充材料说明','2026-09-20 11:00:00'),
('DEMO-ACTION-006','DEMO-APP-005','DEMO-VICE-DEAN-CS','teaching_vice_dean','approve','under_review','under_review','演示：学院已签署意见，转教务处','2026-10-17 09:00:00'),
('DEMO-ACTION-007','DEMO-APP-006','DEMO-INTERNSHIP-LEADER','internship_leader','approve','under_review','approved','演示实习带队负责人批准','2026-11-08 18:00:00'),
('DEMO-ACTION-008','DEMO-APP-008','DEMO-VICE-DEAN-EDU','teaching_vice_dean','reject','under_review','rejected','演示：材料与申请事项不一致','2026-11-20 16:00:00'),
('DEMO-ACTION-009','DEMO-APP-009','DEMO-STU-009','student','withdraw','submitted','withdrawn','学生主动撤回演示申请','2026-11-29 12:00:00'),
('DEMO-ACTION-010','DEMO-APP-010','DEMO-COUNSELOR-EDU','counselor','approve','under_review','approved','演示审批通过','2026-12-06 11:00:00'),
('DEMO-ACTION-011','DEMO-APP-010','DEMO-STU-010','student','cancel','approved','cancelled','演示返校销假','2026-12-09 08:00:00'),
('DEMO-ACTION-012','DEMO-APP-012','DEMO-ACADEMIC-AFFAIRS','academic_affairs','return','submitted','returned','超过一个月，退回并转休学办理','2026-08-28 15:00:00'),
('DEMO-ACTION-013','DEMO-APP-013','DEMO-STU-001','student','renew','approved','submitted','由DEMO-APP-001发起续假','2026-09-07 18:15:00'),
('DEMO-ACTION-014','DEMO-APP-013','DEMO-COUNSELOR-CS','counselor','approve','under_review','approved','演示续假批准','2026-09-07 20:00:00'),
('DEMO-ACTION-015','DEMO-APP-014','DEMO-COUNSELOR-CS','counselor','request_more_info','submitted','need_more_info','事后补办需核验特殊原因和委托情况','2026-09-03 10:30:00');

INSERT INTO tool_call_log VALUES
('DEMO-LOG-001','DEMO-REQ-001','calculate_leave_route','DEMO-STU-001','DEMO-APP-001','1天、非实习场景','OK','匹配ROUTE-LE3-NORMAL',0,'2026-09-06 20:02:00',18),
('DEMO-LOG-002','DEMO-REQ-001','submit_leave_application','DEMO-STU-001','DEMO-APP-001','已确认的脱敏申请摘要','OK','申请已提交',0,'2026-09-06 20:10:00',65),
('DEMO-LOG-003','DEMO-REQ-003','calculate_leave_route','DEMO-STU-003','DEMO-APP-003','4天病假、非实习场景','OK','匹配ROUTE-GT3-LE14',0,'2026-09-20 10:02:00',22),
('DEMO-LOG-004','DEMO-REQ-005','calculate_leave_route','DEMO-STU-005','DEMO-APP-005','15天病假、非实习场景','OK','匹配ROUTE-GT14-LE1M，需人工确认自然月边界',0,'2026-10-16 14:02:00',25),
('DEMO-LOG-005','DEMO-REQ-006','calculate_leave_route','DEMO-STU-006','DEMO-APP-006','2天、校外实习场景','OK','匹配ROUTE-LE3-INTERNSHIP',0,'2026-11-08 12:02:00',19),
('DEMO-LOG-006','DEMO-REQ-009','withdraw_leave_application','DEMO-STU-009','DEMO-APP-009','本人撤回未办结申请','OK','申请已撤回',0,'2026-11-29 12:00:00',41),
('DEMO-LOG-007','DEMO-REQ-010','cancel_leave','DEMO-STU-010','DEMO-APP-010','本人返校后销假','OK','销假完成',0,'2026-12-09 08:00:00',38),
('DEMO-LOG-008','DEMO-REQ-011','create_leave_draft','DEMO-STU-011','DEMO-APP-011','字段不完整的脱敏摘要','UPSTREAM_TIMEOUT','上游演示服务超时，未提交',0,'2026-12-13 20:01:00',3000),
('DEMO-LOG-009','DEMO-REQ-012','calculate_leave_route','DEMO-STU-012','DEMO-APP-012','40天、非实习场景','ROUTE_TO_MANUAL','超过一个月，转休学办理',0,'2026-08-28 14:02:00',20),
('DEMO-LOG-010','DEMO-REQ-014','calculate_leave_route','DEMO-STU-002','DEMO-APP-014','事后补办2天','NEED_HUMAN_REVIEW','匹配短假路由，同时触发补办人工复核',0,'2026-09-03 10:02:00',24);

COMMIT;

