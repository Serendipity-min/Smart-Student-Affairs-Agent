BEGIN;

CREATE VIEW v_approval_route_catalog AS
SELECT
    ar.route_id,
    ar.route_name,
    ar.min_days_exclusive,
    ar.max_days_inclusive,
    ar.calendar_month_limit,
    ar.internship_only,
    ar.non_internship_only,
    ar.approver_sequence,
    ar.archive_requirement,
    ar.terminal_action,
    pr.article_ref,
    pr.machine_summary,
    ar.is_official,
    pr.source_id
FROM approval_route AS ar
JOIN policy_rule AS pr ON pr.rule_id = ar.rule_id;

CREATE VIEW v_leave_overview AS
SELECT
    la.application_id,
    la.request_id,
    sp.synthetic_student_no,
    du.display_name AS student_name,
    ou.unit_name AS college_name,
    la.leave_type,
    la.start_at,
    la.end_at,
    la.duration_days,
    la.status,
    ar.route_name,
    la.current_assignee_role,
    la.created_at,
    la.updated_at
FROM leave_application AS la
JOIN demo_student_profile AS sp ON sp.student_id = la.student_id
JOIN demo_user AS du ON du.user_id = sp.student_id
JOIN organization_unit AS ou ON ou.unit_id = sp.college_unit_id
LEFT JOIN approval_route AS ar ON ar.route_id = la.matched_route_id;

CREATE VIEW v_source_coverage AS
SELECT
    sd.source_id,
    sd.title,
    sd.authority_level,
    sd.verification_status,
    COUNT(DISTINCT pr.rule_id) AS policy_rule_count,
    COUNT(DISTINCT pc.contact_id) AS contact_count
FROM source_document AS sd
LEFT JOIN policy_rule AS pr ON pr.source_id = sd.source_id
LEFT JOIN public_contact AS pc ON pc.source_id = sd.source_id
GROUP BY sd.source_id, sd.title, sd.authority_level, sd.verification_status;

COMMIT;

