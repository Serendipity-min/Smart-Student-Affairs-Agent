PRAGMA foreign_keys = ON;

BEGIN;

-- 系统元数据用于记录数据库版本、数据边界和构建信息。
CREATE TABLE system_metadata (
    meta_key TEXT PRIMARY KEY,
    meta_value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 官方来源与本地附件的统一台账，source_id 与知识库来源编号保持一致。
CREATE TABLE source_document (
    source_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    publisher TEXT NOT NULL,
    source_type TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at TEXT,
    retrieved_at TEXT NOT NULL,
    authority_level TEXT NOT NULL CHECK (authority_level IN ('A', 'B', 'C')),
    verification_status TEXT NOT NULL,
    local_path TEXT,
    sha256 TEXT CHECK (sha256 IS NULL OR length(sha256) = 64),
    notes TEXT
);

CREATE TABLE campus (
    campus_id TEXT PRIMARY KEY,
    campus_name TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    source_id TEXT NOT NULL REFERENCES source_document(source_id)
);

CREATE TABLE organization_unit (
    unit_id TEXT PRIMARY KEY,
    unit_name TEXT NOT NULL,
    unit_type TEXT NOT NULL CHECK (
        unit_type IN ('university', 'administrative', 'college', 'service')
    ),
    parent_unit_id TEXT REFERENCES organization_unit(unit_id),
    campus_id TEXT REFERENCES campus(campus_id),
    source_id TEXT NOT NULL REFERENCES source_document(source_id),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    UNIQUE (unit_name, parent_unit_id)
);

CREATE TABLE academic_term (
    term_id TEXT PRIMARY KEY,
    academic_year TEXT NOT NULL,
    term_no INTEGER NOT NULL CHECK (term_no IN (1, 2)),
    registration_start TEXT NOT NULL,
    registration_end TEXT NOT NULL,
    class_start TEXT NOT NULL,
    teaching_end TEXT NOT NULL,
    exam_start TEXT NOT NULL,
    exam_end TEXT NOT NULL,
    vacation_start TEXT NOT NULL,
    vacation_end TEXT,
    source_id TEXT NOT NULL REFERENCES source_document(source_id),
    UNIQUE (academic_year, term_no)
);

CREATE TABLE class_period (
    period_no INTEGER PRIMARY KEY CHECK (period_no BETWEEN 1 AND 11),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    source_id TEXT NOT NULL REFERENCES source_document(source_id)
);

CREATE TABLE policy_document (
    policy_id TEXT PRIMARY KEY,
    policy_name TEXT NOT NULL,
    version_label TEXT,
    published_at TEXT,
    effective_status TEXT NOT NULL CHECK (
        effective_status IN ('current_public', 'historical', 'demo_only')
    ),
    source_id TEXT REFERENCES source_document(source_id),
    local_path TEXT,
    notes TEXT
);

CREATE TABLE policy_rule (
    rule_id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL REFERENCES policy_document(policy_id),
    article_ref TEXT,
    rule_category TEXT NOT NULL,
    rule_text TEXT NOT NULL,
    machine_summary TEXT NOT NULL,
    requires_human_confirmation INTEGER NOT NULL DEFAULT 0
        CHECK (requires_human_confirmation IN (0, 1)),
    source_id TEXT REFERENCES source_document(source_id)
);

-- 自然月不能简单折算为30天，因此同时保留天数边界和calendar_month_limit。
CREATE TABLE approval_route (
    route_id TEXT PRIMARY KEY,
    route_name TEXT NOT NULL,
    min_days_exclusive INTEGER,
    max_days_inclusive INTEGER,
    calendar_month_limit INTEGER,
    internship_only INTEGER NOT NULL DEFAULT 0 CHECK (internship_only IN (0, 1)),
    non_internship_only INTEGER NOT NULL DEFAULT 0 CHECK (non_internship_only IN (0, 1)),
    approver_sequence TEXT NOT NULL,
    archive_requirement TEXT,
    terminal_action TEXT NOT NULL,
    rule_id TEXT NOT NULL REFERENCES policy_rule(rule_id),
    is_official INTEGER NOT NULL CHECK (is_official IN (0, 1)),
    CHECK (NOT (internship_only = 1 AND non_internship_only = 1))
);

CREATE TABLE public_contact (
    contact_id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES organization_unit(unit_id),
    service_name TEXT NOT NULL,
    contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'extension', 'email')),
    contact_value TEXT NOT NULL,
    availability TEXT,
    campus_id TEXT REFERENCES campus(campus_id),
    emergency_level TEXT NOT NULL DEFAULT 'normal'
        CHECK (emergency_level IN ('normal', 'urgent', 'emergency')),
    source_id TEXT NOT NULL REFERENCES source_document(source_id),
    verified_at TEXT NOT NULL
);

-- 以下表只承载比赛用合成身份；is_synthetic=1 是硬约束，避免误混真实数据。
CREATE TABLE demo_user (
    user_id TEXT PRIMARY KEY CHECK (user_id LIKE 'DEMO-%'),
    role TEXT NOT NULL CHECK (
        role IN (
            'student', 'counselor', 'internship_leader', 'teaching_vice_dean',
            'academic_affairs', 'student_affairs', 'instructor', 'administrator'
        )
    ),
    display_name TEXT NOT NULL,
    unit_id TEXT REFERENCES organization_unit(unit_id),
    is_synthetic INTEGER NOT NULL DEFAULT 1 CHECK (is_synthetic = 1),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE demo_student_profile (
    student_id TEXT PRIMARY KEY REFERENCES demo_user(user_id),
    synthetic_student_no TEXT NOT NULL UNIQUE CHECK (synthetic_student_no LIKE 'DEMO-%'),
    college_unit_id TEXT NOT NULL REFERENCES organization_unit(unit_id),
    major_name TEXT NOT NULL,
    cohort_year INTEGER NOT NULL CHECK (cohort_year BETWEEN 2022 AND 2030),
    class_name TEXT NOT NULL,
    campus_id TEXT NOT NULL REFERENCES campus(campus_id),
    counselor_user_id TEXT NOT NULL REFERENCES demo_user(user_id),
    consent_for_demo INTEGER NOT NULL DEFAULT 1 CHECK (consent_for_demo = 1)
);

CREATE TABLE demo_course (
    course_id TEXT PRIMARY KEY CHECK (course_id LIKE 'DEMO-%'),
    course_name TEXT NOT NULL,
    instructor_user_id TEXT REFERENCES demo_user(user_id),
    term_id TEXT NOT NULL REFERENCES academic_term(term_id),
    is_synthetic INTEGER NOT NULL DEFAULT 1 CHECK (is_synthetic = 1)
);

CREATE TABLE demo_course_schedule (
    schedule_id TEXT PRIMARY KEY CHECK (schedule_id LIKE 'DEMO-%'),
    course_id TEXT NOT NULL REFERENCES demo_course(course_id),
    student_id TEXT NOT NULL REFERENCES demo_student_profile(student_id),
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
    start_period INTEGER NOT NULL REFERENCES class_period(period_no),
    end_period INTEGER NOT NULL REFERENCES class_period(period_no),
    teaching_week_start INTEGER NOT NULL CHECK (teaching_week_start > 0),
    teaching_week_end INTEGER NOT NULL CHECK (teaching_week_end >= teaching_week_start),
    location_text TEXT NOT NULL,
    CHECK (end_period >= start_period)
);

CREATE TABLE leave_application (
    application_id TEXT PRIMARY KEY CHECK (application_id LIKE 'DEMO-%'),
    request_id TEXT NOT NULL UNIQUE CHECK (request_id LIKE 'DEMO-%'),
    student_id TEXT NOT NULL REFERENCES demo_student_profile(student_id),
    leave_type TEXT NOT NULL CHECK (
        leave_type IN ('sick', 'personal', 'official_activity', 'internship', 'other')
    ),
    reason_category TEXT NOT NULL,
    reason_summary TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    off_campus_internship INTEGER NOT NULL DEFAULT 0
        CHECK (off_campus_internship IN (0, 1)),
    retroactive INTEGER NOT NULL DEFAULT 0 CHECK (retroactive IN (0, 1)),
    status TEXT NOT NULL CHECK (
        status IN (
            'draft', 'pending_confirmation', 'submitted', 'under_review',
            'need_more_info', 'approved', 'rejected', 'withdrawn',
            'cancelled', 'returned', 'tool_failed'
        )
    ),
    matched_route_id TEXT REFERENCES approval_route(route_id),
    current_assignee_role TEXT,
    parent_application_id TEXT REFERENCES leave_application(application_id),
    submitted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (datetime(end_at) >= datetime(start_at))
);

CREATE TABLE leave_course_impact (
    impact_id TEXT PRIMARY KEY CHECK (impact_id LIKE 'DEMO-%'),
    application_id TEXT NOT NULL REFERENCES leave_application(application_id),
    schedule_id TEXT NOT NULL REFERENCES demo_course_schedule(schedule_id),
    occurrence_date TEXT NOT NULL,
    affected_periods INTEGER NOT NULL CHECK (affected_periods > 0),
    UNIQUE (application_id, schedule_id, occurrence_date)
);

-- 附件表只保存元数据和受控地址，禁止将病历正文放入数据库。
CREATE TABLE leave_attachment (
    attachment_id TEXT PRIMARY KEY CHECK (attachment_id LIKE 'DEMO-%'),
    application_id TEXT NOT NULL REFERENCES leave_application(application_id),
    attachment_type TEXT NOT NULL CHECK (
        attachment_type IN ('hospital_certificate', 'supporting_document', 'other')
    ),
    safe_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_uri TEXT NOT NULL CHECK (storage_uri LIKE 'demo://%'),
    sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
    verification_status TEXT NOT NULL CHECK (
        verification_status IN ('pending', 'verified_demo', 'rejected_demo')
    ),
    created_at TEXT NOT NULL
);

CREATE TABLE approval_action (
    action_id TEXT PRIMARY KEY CHECK (action_id LIKE 'DEMO-%'),
    application_id TEXT NOT NULL REFERENCES leave_application(application_id),
    actor_user_id TEXT REFERENCES demo_user(user_id),
    actor_role TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (
        action_type IN (
            'create_draft', 'confirm', 'submit', 'request_more_info',
            'approve', 'reject', 'withdraw', 'renew', 'cancel', 'return'
        )
    ),
    from_status TEXT,
    to_status TEXT NOT NULL,
    comment_text TEXT,
    action_at TEXT NOT NULL
);

-- 工具日志保留可观测性字段，但请求/响应仅允许脱敏摘要。
CREATE TABLE tool_call_log (
    log_id TEXT PRIMARY KEY CHECK (log_id LIKE 'DEMO-%'),
    request_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    actor_user_id TEXT REFERENCES demo_user(user_id),
    application_id TEXT REFERENCES leave_application(application_id),
    request_summary TEXT NOT NULL,
    result_code TEXT NOT NULL,
    response_summary TEXT,
    contains_sensitive_payload INTEGER NOT NULL DEFAULT 0
        CHECK (contains_sensitive_payload = 0),
    called_at TEXT NOT NULL,
    latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE TABLE test_case (
    case_id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    user_input TEXT NOT NULL,
    expected_intent TEXT NOT NULL,
    expected_next_action TEXT NOT NULL,
    expected_rule_code TEXT,
    expected_tool TEXT,
    security_expectation TEXT NOT NULL,
    source_ids TEXT,
    notes TEXT
);

CREATE INDEX idx_policy_rule_category ON policy_rule(rule_category);
CREATE INDEX idx_contact_service ON public_contact(service_name);
CREATE INDEX idx_schedule_student_weekday ON demo_course_schedule(student_id, weekday);
CREATE INDEX idx_leave_student_status ON leave_application(student_id, status);
CREATE INDEX idx_leave_time_range ON leave_application(start_at, end_at);
CREATE INDEX idx_action_application_time ON approval_action(application_id, action_at);
CREATE INDEX idx_tool_request ON tool_call_log(request_id, called_at);

COMMIT;

