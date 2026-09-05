BEGIN;

INSERT INTO system_metadata (meta_key, meta_value) VALUES
('database_name', '学事智办初版数据库'),
('database_version', '0.1.0'),
('school_example', '阜阳师范大学'),
('data_boundary', '官方公开事实 + DEMO前缀合成数据；不含真实学生个人信息'),
('verified_at', '2026-07-31'),
('build_schema_version', '1');

INSERT INTO source_document VALUES
('S001','阜阳师范大学本科生学籍管理实施细则','阜阳师范大学教务处','official_page','https://www.fynu.edu.cn/jwc/info/1019/1820.htm','2021-09-01','2026-07-31','A','verified',NULL,NULL,'页面提供正式PDF附件'),
('S002','阜阳师范大学本科生学籍管理实施细则（PDF）','阜阳师范大学','official_pdf','https://www.fynu.edu.cn/__local/4/57/02/4284A9565173E9DA22178A2550E_D534D6E5_3066F.pdf','2021-09-01','2026-07-31','A','downloaded_and_hashed','knowledge_base/sources/raw/阜阳师范大学本科生学籍管理实施细则_2021.pdf','AA5B89A43F90635E75391245AFE67A603CF49AAFC9528816F6E779A445E11833','请销假核心依据'),
('S003','阜阳师范学院本科生学籍管理实施细则（旧版网页）','阜阳师范大学教务处','legacy_official_page','https://www.fynu.edu.cn/jwc/info/1019/1815.htm','2018-09-04','2026-07-31','C','verified',NULL,NULL,'仅用于与2021版第十二条交叉核验'),
('S004','阜阳师范大学校历','阜阳师范大学','official_page','https://www.fynu.edu.cn/index/fwtd/xl.htm',NULL,'2026-07-31','A','verified',NULL,NULL,'当前页面提供2026—2027学年校历'),
('S005','阜阳师范大学2026—2027学年校历（PDF）','阜阳师范大学','official_pdf','https://www.fynu.edu.cn/system/_content/download.jsp?urltype=news.DownloadAttachUrl&owner=1685153477&wbfileid=B4CAE367CC9C6C091177E14DBC03837E',NULL,'2026-07-31','A','downloaded_and_hashed','knowledge_base/sources/raw/阜阳师范大学2026-2027学年校历.pdf','FB9FBFA79553803A4A0E7778BD98AC3A5599440E5AA2AD754B354F7886DDD172','当前校历及节次时间依据'),
('S006','学校简介','阜阳师范大学','official_page','https://www.fynu.edu.cn/info/1046/40172.htm',NULL,'2026-07-31','A','verified',NULL,NULL,'学校沿革、校训、校区信息；数据截至2026年1月'),
('S007','党政管理机构','阜阳师范大学','official_page','https://www.fynu.edu.cn/jgsz/dzgljg.htm',NULL,'2026-07-31','A','verified',NULL,NULL,'核验相关行政机构'),
('S008','学生工作处首页','阜阳师范大学学生工作处','department_page','https://www.fynu.edu.cn/xsgzc/',NULL,'2026-07-31','B','verified',NULL,NULL,'包含公开学院导航'),
('S009','学生工作处部门简介','阜阳师范大学学生工作处','department_page','https://www.fynu.edu.cn/xsgzc/jgsz1/bmjj.htm',NULL,'2026-07-31','B','verified',NULL,NULL,'部门职责和办公地点'),
('S010','学生工作处办公电话','阜阳师范大学学生工作处','department_page','https://www.fynu.edu.cn/xsgzc/jgsz1/bgdh.htm',NULL,'2026-07-31','B','verified',NULL,NULL,'学工、资助、心理公开联系方式'),
('S011','扫黑除恶与校园报警信息','阜阳师范大学保卫处','department_page','https://www.fynu.edu.cn/bwc/shce.htm',NULL,'2026-07-31','B','verified',NULL,NULL,'校园报警电话'),
('S012','联系我们','阜阳师范大学后勤服务集团/基本建设处','department_page','https://www.fynu.edu.cn/hqjs/lxwm.htm',NULL,'2026-07-31','B','verified',NULL,NULL,'校医院和维修电话'),
('S013','关于组织2024级新生参加学生手册考试的通知','阜阳师范大学学生工作处','department_notice','https://www.fynu.edu.cn/xsgzc/info/1040/7752.htm','2024-11-26','2026-07-31','B','verified_metadata_only',NULL,NULL,'仅证明2024版学生手册存在；未取得公开全文'),
('S014','阜阳师范大学本科学生综合素质测评办法（试行）','阜阳师范大学学生工作处','official_page','https://www.fynu.edu.cn/xsgzc/info/1055/7850.htm','2023-09-13','2026-07-31','B','verified',NULL,NULL,'无故缺席规定集体活动的辅助依据'),
('S015','普通高等学校学生管理规定','教育部/阜阳师范大学马克思主义学院','official_reprint','https://www.fynu.edu.cn/mkszyxy/info/1074/3580.htm',NULL,'2026-07-31','B','verified',NULL,NULL,'上位规则背景');

INSERT INTO campus VALUES
('CAMPUS-XH','西湖校区','安徽省阜阳市清河西路678号','236037','S006'),
('CAMPUS-QH','清河校区','安徽省阜阳市清河西路359号','236041','S006');

INSERT INTO organization_unit VALUES
('UNIT-FYNU','阜阳师范大学','university',NULL,NULL,'S006',1),
('UNIT-JWC','教务处','administrative','UNIT-FYNU','CAMPUS-XH','S007',1),
('UNIT-XSC','学生工作处','administrative','UNIT-FYNU','CAMPUS-XH','S009',1),
('UNIT-BWC','保卫处','administrative','UNIT-FYNU',NULL,'S007',1),
('UNIT-HQ','后勤服务集团/基本建设处','service','UNIT-FYNU',NULL,'S012',1),
('UNIT-HOSPITAL','校医院','service','UNIT-HQ',NULL,'S012',1),
('COLLEGE-LAW','法学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-ECON','经济学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-BUS','商学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-HIST','历史文化与旅游学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-MUSIC','音乐舞蹈学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-SPORT','体育学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-ART','美术学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-MATH','数学与统计学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-PHYS','物理与电子工程学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-CHEM','化学与材料工程学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-BIO','生物与食品工程学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-CS','计算机与信息工程学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-EDU','教育学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-MARX','马克思主义学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-MED','医学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-CHINESE','文学院','college','UNIT-FYNU',NULL,'S008',1),
('COLLEGE-FOREIGN','外国语学院','college','UNIT-FYNU',NULL,'S008',1);

INSERT INTO academic_term VALUES
('TERM-2026-2027-1','2026-2027',1,'2026-08-29','2026-08-30','2026-08-31','2026-12-31','2027-01-02','2027-01-10','2027-01-11','2027-02-19','S005'),
('TERM-2026-2027-2','2026-2027',2,'2027-02-20','2027-02-21','2027-02-22','2027-06-25','2027-06-26','2027-07-04','2027-07-05',NULL,'S005');

INSERT INTO class_period VALUES
(1,'08:00','08:45','S005'),
(2,'08:55','09:40','S005'),
(3,'10:00','10:45','S005'),
(4,'10:55','11:40','S005'),
(5,'14:30','15:15','S005'),
(6,'15:25','16:10','S005'),
(7,'16:30','17:15','S005'),
(8,'17:25','18:10','S005'),
(9,'19:00','19:45','S005'),
(10,'19:55','20:40','S005'),
(11,'20:50','21:35','S005');

INSERT INTO policy_document VALUES
('POLICY-STUDENT-STATUS-2021','阜阳师范大学本科生学籍管理实施细则','2021版','2021-09-01','current_public','S002','knowledge_base/sources/raw/阜阳师范大学本科生学籍管理实施细则_2021.pdf','当前官网可公开核验版本；正式生产前仍需校方确认现行状态'),
('POLICY-DEMO-LEAVE-0.1','比赛演示补充规则','0.1',NULL,'demo_only',NULL,'knowledge_base/90_比赛演示补充规则_V0.1.md','非学校正式制度');

INSERT INTO policy_rule VALUES
('RULE-LEAVE-PRIOR-WRITTEN','POLICY-STUDENT-STATUS-2021','第十二条','application','学生请假须事先提出书面申请。','所有请假先收集必要字段并形成书面申请。',0,'S002'),
('RULE-LEAVE-SICK-PROOF','POLICY-STUDENT-STATUS-2021','第十二条','evidence','病假须有医院证明。','病假必须追问医院证明；具体格式需人工确认。',1,'S002'),
('RULE-LEAVE-3D','POLICY-STUDENT-STATUS-2021','第十二条','approval','请假三天以内，由辅导员批准；校外实习期间由实习带队负责人批准，并报学院备案。','小于等于3天按是否校外实习分流，批准后报学院备案。',0,'S002'),
('RULE-LEAVE-14D','POLICY-STUDENT-STATUS-2021','第十二条','approval','请假超过三天、两周以内，由学院分管教学副院长批准。','大于3天且不超过14天，由学院分管教学副院长批准。',0,'S002'),
('RULE-LEAVE-1M','POLICY-STUDENT-STATUS-2021','第十二条','approval','请假超过两周、一个月以内，由学院分管教学副院长签署意见，报教务处批准。','大于两周且不超过一个自然月，学院签署意见后报教务处批准。',1,'S002'),
('RULE-LEAVE-OVER-1M','POLICY-STUDENT-STATUS-2021','第十二条','suspension','请假超过一个月，应办理休学手续。','超过一个月不进入普通请假，转休学办理。',1,'S002'),
('RULE-LEAVE-RETRO','POLICY-STUDENT-STATUS-2021','第十二条','retroactive','原则上不得事后补假；特殊原因无法本人办理，可在三天内委托他人代办。','检测事后补办并转人工复核；特殊情形提示三天内委托代办。',1,'S002'),
('RULE-LEAVE-CANCEL-RENEW','POLICY-STUDENT-STATUS-2021','第十二条','lifecycle','假期结束应及时销假；不能按期返校时，应按原程序续假。','到期触发销假或续假提醒，续假重新计算路由。',0,'S002'),
('RULE-NEW-STUDENT-REG','POLICY-STUDENT-STATUS-2021','第四条','registration','新生不能按时报到，应事先请假，请假一般不超过一周。','新生报到请假通常不超过一周，个案转人工。',1,'S002'),
('RULE-ABSENCE-SUSPENSION','POLICY-STUDENT-STATUS-2021','第三十七条','suspension','一学期因请假缺课累计超过该学期总学时三分之一，应办理休学手续。','累计缺课接近三分之一时预警并转人工核算。',1,'S002'),
('RULE-DEMO-CONFIRM','POLICY-DEMO-LEAVE-0.1',NULL,'demo_workflow','演示申请在二次确认后提交。','先生成摘要并要求用户明确确认。',0,NULL);

INSERT INTO approval_route VALUES
('ROUTE-LE3-NORMAL','三天以内（普通场景）',NULL,3,NULL,0,1,'counselor','college_record','leave_approval','RULE-LEAVE-3D',1),
('ROUTE-LE3-INTERNSHIP','三天以内（校外实习）',NULL,3,NULL,1,0,'internship_leader','college_record','leave_approval','RULE-LEAVE-3D',1),
('ROUTE-GT3-LE14','超过三天、两周以内',3,14,NULL,0,0,'teaching_vice_dean','college_record','leave_approval','RULE-LEAVE-14D',1),
('ROUTE-GT14-LE1M','超过两周、一个月以内',14,NULL,1,0,0,'teaching_vice_dean > academic_affairs','university_record','leave_approval','RULE-LEAVE-1M',1),
('ROUTE-GT1M-SUSPEND','超过一个月',NULL,NULL,NULL,0,0,'college > academic_affairs','university_record','suspension_procedure','RULE-LEAVE-OVER-1M',1);

INSERT INTO public_contact VALUES
('CONTACT-XSC-HEAD','UNIT-XSC','学生工作处部门负责人','phone','0558-2595339',NULL,'CAMPUS-XH','normal','S010','2026-07-31'),
('CONTACT-XSC-DEPUTY','UNIT-XSC','学生工作处分管负责人','phone','0558-2593156',NULL,'CAMPUS-XH','normal','S010','2026-07-31'),
('CONTACT-XSC-OFFICE','UNIT-XSC','学生工作处办公室','phone','0558-2596345',NULL,'CAMPUS-XH','normal','S010','2026-07-31'),
('CONTACT-XSC-IDEOLOGY','UNIT-XSC','思想教育','phone','0558-2593176',NULL,'CAMPUS-XH','normal','S010','2026-07-31'),
('CONTACT-XSC-DEFENSE','UNIT-XSC','国防教育','phone','0558-2598163',NULL,'CAMPUS-XH','normal','S010','2026-07-31'),
('CONTACT-XSC-AID','UNIT-XSC','学生资助','phone','0558-2595176',NULL,'CAMPUS-XH','normal','S010','2026-07-31'),
('CONTACT-XSC-MANAGEMENT','UNIT-XSC','学生管理','phone','0558-2595976',NULL,'CAMPUS-XH','normal','S010','2026-07-31'),
('CONTACT-PSY-SERVICE','UNIT-XSC','心理咨询服务','phone','0558-2593516',NULL,'CAMPUS-XH','urgent','S010','2026-07-31'),
('CONTACT-PSY-PRACTICE','UNIT-XSC','心理教育实践','phone','0558-2596191',NULL,'CAMPUS-XH','normal','S010','2026-07-31'),
('CONTACT-PSY-BOOKING','UNIT-XSC','心理咨询预约','phone','0558-2591006',NULL,'CAMPUS-XH','urgent','S010','2026-07-31'),
('CONTACT-XSC-EMAIL','UNIT-XSC','学生工作处邮箱','email','fyncxsc@126.com',NULL,'CAMPUS-XH','normal','S010','2026-07-31'),
('CONTACT-SECURITY','UNIT-BWC','校园报警','phone','0558-2561110','校园报警服务',NULL,'emergency','S011','2026-07-31'),
('CONTACT-SECURITY-EXT','UNIT-BWC','校园报警校内短号','extension','8110','校内短号',NULL,'emergency','S011','2026-07-31'),
('CONTACT-HOSPITAL-QH','UNIT-HOSPITAL','清河校区校医院值班','phone','0558-2595106','值班电话','CAMPUS-QH','urgent','S012','2026-07-31'),
('CONTACT-HOSPITAL-XH','UNIT-HOSPITAL','西湖校区校医院值班','phone','0558-2591026','值班电话','CAMPUS-XH','urgent','S012','2026-07-31'),
('CONTACT-REPAIR-QH','UNIT-HQ','清河校区水电维修','phone','0558-2594364','24小时','CAMPUS-QH','normal','S012','2026-07-31'),
('CONTACT-REPAIR-XH','UNIT-HQ','西湖校区维修','phone','0558-2591032','24小时','CAMPUS-XH','normal','S012','2026-07-31');

COMMIT;

