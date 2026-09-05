import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3199;
const TOKEN = 'test_token_student_affairs_demo_1234567890_min32';
const DATA_FILE = join(__dirname, '..', 'data', 'test_state.json');
const BASE = `http://127.0.0.1:${PORT}`;
const ACTOR_IDS = { student: 'DEMO-STU-001', counselor: 'DEMO-REV-COUNSELOR', teaching_vice_dean: 'DEMO-REV-VICE-DEAN', academic_affairs: 'DEMO-REV-ACADEMIC' };

function headers(role = 'student') {
  return { Authorization: `Bearer ${TOKEN}`, 'X-Demo-User-Id': ACTOR_IDS[role], 'X-Demo-User-Role': role, 'Content-Type': 'application/json' };
}
async function post(path, payload, role = 'student') {
  const response = await fetch(`${BASE}${path}`, { method: 'POST', headers: headers(role), body: JSON.stringify(payload) });
  return { response, body: await response.json() };
}
async function createAndSubmit(overrides = {}) {
  const draft = await post('/v1/leave/draft', { leave_type: 'personal', reason_category: 'personal', reason_summary: '家庭事务处理', start_at: '2026-09-01', end_at: '2026-09-02', off_campus_internship: false, ...overrides });
  assert.equal(draft.response.status, 201);
  const application_id = draft.body.application_id;
  const submitted = await post('/v1/leave/submit', { application_id, confirmed: true });
  assert.equal(submitted.response.status, 200);
  return application_id;
}

async function startServer() {
  await rm(DATA_FILE, { force: true }).catch(() => {});
  const proc = spawn(process.execPath, [join(__dirname, '..', 'src', 'server.mjs')], { env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', DEMO_API_TOKEN: TOKEN, DEMO_DATA_FILE: DATA_FILE }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server start timeout')), 5000);
    proc.stdout.on('data', (data) => { if (data.toString().includes('已监听')) { clearTimeout(timer); resolve(); } });
    proc.once('error', reject);
  });
  return proc;
}

test('P3.5 Node HTTP API：状态机、角色边界、补充链综合回归', async (t) => {
  const server = await startServer();
  t.after(async () => { server.kill(); await rm(DATA_FILE, { force: true }).catch(() => {}); });

  await t.test('API-01 health 与鉴权边界', async () => {
    assert.equal((await fetch(`${BASE}/health`)).status, 200);
    const denied = await fetch(`${BASE}/v1/route/calculate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    assert.equal(denied.status, 401);
  });

  await t.test('API-02 四天普通请假必须经辅导员再副院长', async () => {
    const routed = await post('/v1/route/calculate', { leave_type: 'personal', start_at: '2026-09-01', end_at: '2026-09-04', off_campus_internship: false });
    assert.equal(routed.response.status, 200);
    assert.equal(routed.body.route_id, 'ROUTE-GT3-LE1M');
    assert.deepEqual(routed.body.approver_sequence, ['counselor', 'teaching_vice_dean']);
  });

  await t.test('API-03 病假无证明可提交，辅导员可要求补充并恢复原审批位', async () => {
    const appId = await createAndSubmit({ leave_type: 'sick', reason_category: 'sick', reason_summary: '发热就医', has_hospital_certificate: false });
    const request = await post('/v1/reviewer/action', { application_id: appId, action: 'request_more_info', comment: '请补充就医情况说明。' }, 'counselor');
    assert.equal(request.response.status, 200); assert.equal(request.body.status, 'need_more_info'); assert.equal(request.body.current_assignee_role, null);
    const supplement = await post('/v1/leave/supplement', { application_id: appId, has_hospital_certificate: true, comment: '已准备医院证明，仅记录演示布尔状态。' });
    assert.equal(supplement.response.status, 200); assert.equal(supplement.body.status, 'under_review'); assert.equal(supplement.body.current_assignee_role, 'counselor');
    const approval = await post('/v1/reviewer/action', { application_id: appId, action: 'approve' }, 'counselor');
    assert.equal(approval.response.status, 200); assert.equal(approval.body.status, 'approved');
    assert.equal(approval.body.leave.review_history.at(-1).actor_role, 'counselor');
  });

  await t.test('API-04 多级审批按当前待办角色逐级流转', async () => {
    const appId = await createAndSubmit({ start_at: '2026-09-01', end_at: '2026-09-04' });
    const denied = await post('/v1/reviewer/action', { application_id: appId, action: 'approve' }, 'teaching_vice_dean');
    assert.equal(denied.response.status, 403);
    const first = await post('/v1/reviewer/action', { application_id: appId, action: 'approve' }, 'counselor');
    assert.equal(first.body.status, 'under_review'); assert.equal(first.body.current_assignee_role, 'teaching_vice_dean');
    const final = await post('/v1/reviewer/action', { application_id: appId, action: 'approve' }, 'teaching_vice_dean');
    assert.equal(final.body.status, 'approved'); assert.equal(final.body.current_assignee_role, null);
  });

  await t.test('API-05 校外实习超过自然月仍进入三级审批', async () => {
    const appId = await createAndSubmit({ start_at: '2026-09-01', end_at: '2026-10-20', off_campus_internship: true });
    let result = await post('/v1/reviewer/action', { application_id: appId, action: 'approve' }, 'counselor');
    assert.equal(result.body.current_assignee_role, 'teaching_vice_dean');
    result = await post('/v1/reviewer/action', { application_id: appId, action: 'approve' }, 'teaching_vice_dean');
    assert.equal(result.body.current_assignee_role, 'academic_affairs');
    result = await post('/v1/reviewer/action', { application_id: appId, action: 'approve' }, 'academic_affairs');
    assert.equal(result.body.status, 'approved');
  });

  await t.test('API-06 审核意见、终态不可写与角色待办边界', async () => {
    const appId = await createAndSubmit();
    const missingComment = await post('/v1/reviewer/action', { application_id: appId, action: 'reject' }, 'counselor');
    assert.equal(missingComment.response.status, 400); assert.equal(missingComment.body.error.code, 'COMMENT_REQUIRED');
    const rejection = await post('/v1/reviewer/action', { application_id: appId, action: 'reject', comment: '演示驳回，原因信息不完整。' }, 'counselor');
    assert.equal(rejection.body.status, 'rejected');
    const immutable = await post('/v1/reviewer/action', { application_id: appId, action: 'approve' }, 'counselor');
    assert.equal(immutable.response.status, 409); assert.equal(immutable.body.error.code, 'TERMINAL_IMMUTABLE');
    const tasks = await fetch(`${BASE}/v1/reviewer/tasks?role=counselor`, { headers: headers('counselor') });
    assert.equal(tasks.status, 200); assert.ok((await tasks.json()).tasks.some((task) => task.application_id === appId));
  });

  await t.test('API-07 非实习超过自然月和非法假别均被拒绝', async () => {
    const suspension = await post('/v1/leave/draft', { leave_type: 'personal', reason_category: 'personal', reason_summary: '长期离校', start_at: '2026-09-01', end_at: '2026-10-02' });
    assert.equal(suspension.response.status, 409); assert.equal(suspension.body.error.code, 'SUSPENSION_REQUIRED');
    const invalid = await post('/v1/leave/draft', { leave_type: 'internship', reason_category: 'other', reason_summary: '不应再存在的假别', start_at: '2026-09-01', end_at: '2026-09-02' });
    assert.equal(invalid.response.status, 400); assert.equal(invalid.body.error.code, 'INVALID_LEAVE');
  });
});
