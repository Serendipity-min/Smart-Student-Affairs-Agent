import { createServer } from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateLeaveRoute } from './rules.mjs';

const PORT = Number(process.env.PORT ?? 3000);
// 公网只经 Nginx 进入；业务进程默认绑定回环地址，避免绕开 HTTPS 与限流策略。
const HOST = process.env.HOST ?? '127.0.0.1';
const API_TOKEN = process.env.DEMO_API_TOKEN ?? '';
const DATA_FILE = process.env.DEMO_DATA_FILE ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'state.json');
const MAX_BODY_BYTES = 64 * 1024;
const ACTORS = {
  student: 'DEMO-STU-001',
  counselor: 'DEMO-REV-COUNSELOR',
  teaching_vice_dean: 'DEMO-REV-VICE-DEAN',
  academic_affairs: 'DEMO-REV-ACADEMIC'
};
const REVIEWER_ROLES = new Set(['counselor', 'teaching_vice_dean', 'academic_affairs']);
const TERMINAL_STATUSES = new Set(['approved', 'rejected', 'withdrawn', 'cancelled']);

if (API_TOKEN.length < 32) throw new Error('DEMO_API_TOKEN 必须是至少 32 字符的随机值；禁止无鉴权启动公网演示 API。');

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function nowText() { return new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'); }
function makeId(kind) { return `DEMO-${kind}-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`; }
function isTrue(value) { return value === true || value === 'true'; }

function emptyState() { return { schema_version: '0.3', applications: {}, audit_actions: [] }; }

async function loadState() {
  try {
    const state = JSON.parse(await readFile(DATA_FILE, 'utf8'));
    return { ...emptyState(), ...state, applications: state.applications ?? {}, audit_actions: state.audit_actions ?? [] };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return emptyState();
  }
}

async function saveState(state) {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const temporary = `${DATA_FILE}.${process.pid}.tmp`;
  // 临时文件原子替换，避免演示进程意外中断时留下半份状态库。
  await writeFile(temporary, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, DATA_FILE);
}

function sendJson(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  response.end(body);
}

function requireAuth(request) {
  const expected = Buffer.from(`Bearer ${API_TOKEN}`);
  const supplied = Buffer.from(request.headers.authorization ?? '');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new ApiError(401, 'UNAUTHORIZED', '认证失败');
}

function requireActor(request, allowedRoles) {
  const role = String(request.headers['x-demo-user-role'] ?? 'student');
  const userId = String(request.headers['x-demo-user-id'] ?? ACTORS.student);
  if (!allowedRoles.has(role) || ACTORS[role] !== userId) throw new ApiError(403, 'IDENTITY_MISMATCH', '演示身份或角色不匹配');
  return { role, user_id: userId };
}

async function readJson(request) {
  if ((request.headers['content-type'] ?? '').split(';', 1)[0] !== 'application/json') throw new ApiError(415, 'JSON_REQUIRED', '请求必须使用 application/json');
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new ApiError(413, 'BODY_SIZE_INVALID', '请求正文超过 64KB');
    chunks.push(chunk);
  }
  if (!size) throw new ApiError(400, 'BODY_SIZE_INVALID', '请求正文为空');
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('not object');
    return value;
  } catch { throw new ApiError(400, 'INVALID_JSON', 'JSON 格式无效'); }
}

function extractPayload(payload) {
  if (payload?.params && typeof payload.params === 'object') return { ...payload, ...payload.params };
  if (payload?.data && typeof payload.data === 'object') return { ...payload, ...payload.data };
  return payload ?? {};
}
function mergePayload(body, url) { return { ...Object.fromEntries(url.searchParams.entries()), ...extractPayload(body) }; }
function assertApplicationId(applicationId) { if (!applicationId || typeof applicationId !== 'string' || !/^DEMO-APP-[A-Z0-9]{3,24}$/.test(applicationId)) throw new ApiError(400, 'INVALID_ID', '申请编号格式无效'); }
function getApplication(state, applicationId) { const record = state.applications[applicationId]; if (!record) throw new ApiError(404, 'LEAVE_NOT_FOUND', '未找到申请'); return record; }
function getOwnedApplication(state, applicationId, actor) { const record = getApplication(state, applicationId); if (record.student_id !== actor.user_id) throw new ApiError(403, 'NOT_OWNER', '无权访问他人申请'); return record; }

function addHistory(state, record, actor, actionType, fromStatus, toStatus, comment = null) {
  // 同时保留 action_type（旧证据兼容）与 action（V0.3 对外契约），两者始终由同一确定性动作生成。
  const entry = { action_id: makeId('ACTION'), actor_user_id: actor.user_id, actor_role: actor.role, action: actionType, action_type: actionType, from_status: fromStatus, to_status: toStatus, comment, action_at: nowText() };
  record.review_history ??= [];
  record.review_history.push(entry);
  state.audit_actions.push({ application_id: record.application_id, ...entry });
  return entry.action_at;
}

function transition(record, status, currentRole = null) {
  record.status = status;
  record.current_assignee_role = currentRole;
  record.updated_at = nowText();
  return record.updated_at;
}

function createRecord(payload, route, student) {
  const createdAt = nowText();
  return {
    schema_version: '0.3', application_id: makeId('APP'), request_id: makeId('REQ'), student_id: student.user_id,
    leave_type: payload.leave_type, reason_category: payload.reason_category, reason_summary: payload.reason_summary,
    start_at: payload.start_at, end_at: payload.end_at, duration_days: route.duration_days,
    off_campus_internship: isTrue(payload.off_campus_internship), retroactive: isTrue(payload.retroactive),
    // 仅保存布尔声明；服务端从不接收、读取或落盘病历、诊断书、医疗影像和文件名。
    has_hospital_certificate: isTrue(payload.has_hospital_certificate),
    matched_route_id: route.route_id, approver_sequence: route.approver_sequence, approval_index: 0,
    current_assignee_role: null, status: 'pending_confirmation', review_history: [], supplement_request: null,
    created_at: createdAt, submitted_at: null, approved_at: null, rejected_at: null, updated_at: createdAt
  };
}

function assertCanReview(record, reviewer) {
  if (TERMINAL_STATUSES.has(record.status)) throw new ApiError(409, 'TERMINAL_IMMUTABLE', '终态申请不可再审核');
  if (record.current_assignee_role !== reviewer.role) throw new ApiError(403, 'NOT_CURRENT_ASSIGNEE', '当前申请不在该审核角色的待办中');
}

function requireComment(payload) {
  const comment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
  if (!comment) throw new ApiError(400, 'COMMENT_REQUIRED', '驳回或要求补充时必须填写审核意见');
  if (comment.length > 200) throw new ApiError(400, 'COMMENT_TOO_LONG', '审核意见不能超过 200 字符');
  return comment;
}

function reviewerCanRead(record, role) {
  return record.current_assignee_role === role || record.supplement_request?.requested_by_role === role || (record.review_history ?? []).some((item) => item.actor_role === role);
}

async function handleLeaveAction(state, record, action, payload, student) {
  if (!isTrue(payload.confirmed)) throw new ApiError(400, 'CONFIRMATION_REQUIRED', '必须明确确认后提交或操作');
  if (action === 'submit') {
    if (!['draft', 'pending_confirmation'].includes(record.status)) throw new ApiError(409, 'INVALID_STATUS', '当前状态不能提交');
    const route = calculateLeaveRoute(record);
    if (!route.ready_to_submit) throw new ApiError(409, 'NOT_READY', '规则条件未满足，不能提交');
    record.approver_sequence = route.approver_sequence;
    record.matched_route_id = route.route_id;
    record.approval_index = 0;
    transition(record, 'submitted', route.approver_sequence[0] ?? null);
    record.submitted_at = record.updated_at;
    addHistory(state, record, student, 'submit', 'pending_confirmation', 'submitted');
  } else if (action === 'withdraw') {
    if (!['draft', 'pending_confirmation', 'submitted', 'under_review', 'need_more_info'].includes(record.status)) throw new ApiError(409, 'INVALID_STATUS', '当前状态不允许撤回');
    const from = record.status; transition(record, 'withdrawn'); addHistory(state, record, student, 'withdraw', from, 'withdrawn');
  } else if (action === 'cancel') {
    if (record.status !== 'approved') throw new ApiError(409, 'INVALID_STATUS', '当前状态不允许销假');
    if (!isTrue(payload.returned_to_campus)) throw new ApiError(400, 'RETURN_CONFIRMATION_REQUIRED', '销假前必须确认已经返校');
    transition(record, 'cancelled'); addHistory(state, record, student, 'cancel', 'approved', 'cancelled');
  }
}

async function handle(request, response) {
  const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/$/, '') || '/';
  if (request.method === 'GET' && path === '/health') return sendJson(response, 200, { status: 'ok', version: '0.3-demo', data_scope: 'synthetic_demo_only' });
  requireAuth(request);

  if (request.method === 'POST' && path === '/v1/route/calculate') {
    const payload = mergePayload(await readJson(request), url);
    return sendJson(response, 200, calculateLeaveRoute(payload));
  }

  if (request.method === 'POST' && path === '/v1/leave/draft') {
    const student = requireActor(request, new Set(['student']));
    const payload = mergePayload(await readJson(request), url);
    const required = ['leave_type', 'reason_category', 'reason_summary', 'start_at', 'end_at'];
    const missing = required.filter((field) => !String(payload[field] ?? '').trim());
    if (missing.length) throw new ApiError(400, 'MISSING_FIELDS', `缺少字段：${missing.join(',')}`);
    if (String(payload.reason_summary).length > 200) throw new ApiError(400, 'REASON_TOO_LONG', '原因摘要不能超过 200 字符');
    const route = calculateLeaveRoute(payload);
    if (!route.valid) throw new ApiError(400, 'INVALID_LEAVE', route.errors.join('；'));
    if (route.route_id === 'ROUTE-GT1M-SUSPENSION') throw new ApiError(409, 'SUSPENSION_REQUIRED', '超过一个自然月，应转休学流程');
    const state = await loadState();
    const record = createRecord(payload, route, student);
    state.applications[record.application_id] = record;
    addHistory(state, record, student, 'create_draft', null, 'pending_confirmation');
    await saveState(state);
    return sendJson(response, 201, { application_id: record.application_id, status: record.status, route });
  }

  if (request.method === 'GET' && (path === '/v1/leave' || /^\/v1\/leave\/DEMO-APP-[A-Z0-9-]+$/.test(path))) {
    const student = requireActor(request, new Set(['student']));
    const applicationId = path === '/v1/leave' ? url.searchParams.get('application_id') : path.split('/').at(-1);
    assertApplicationId(applicationId);
    const record = getOwnedApplication(await loadState(), applicationId, student);
    return sendJson(response, 200, { leave: record });
  }

  const actionPath = path.match(/^\/v1\/leave(?:\/(DEMO-APP-[A-Z0-9-]+))?\/(submit|withdraw|cancel)$/);
  if (request.method === 'POST' && actionPath) {
    const student = requireActor(request, new Set(['student']));
    const payload = mergePayload(await readJson(request), url);
    const applicationId = actionPath[1] ?? payload.application_id;
    assertApplicationId(applicationId);
    const state = await loadState(); const record = getOwnedApplication(state, applicationId, student);
    await handleLeaveAction(state, record, actionPath[2], payload, student);
    await saveState(state);
    return sendJson(response, 200, { application_id: record.application_id, status: record.status, current_assignee_role: record.current_assignee_role, leave: record });
  }

  if (request.method === 'GET' && path === '/v1/reviewer/tasks') {
    const reviewer = requireActor(request, REVIEWER_ROLES);
    const role = String(url.searchParams.get('role') ?? '');
    if (role !== reviewer.role) throw new ApiError(403, 'ROLE_SCOPE_MISMATCH', '只能查询当前演示审核角色的待办');
    const state = await loadState();
    const applications = Object.values(state.applications).filter((record) => record.current_assignee_role === role || (record.review_history ?? []).some((item) => item.actor_role === role));
    return sendJson(response, 200, { role, tasks: applications.map((record) => ({
      application_id: record.application_id,
      leave_type: record.leave_type,
      reason_summary: record.reason_summary,
      duration_days: record.duration_days,
      off_campus_internship: record.off_campus_internship,
      has_hospital_certificate: record.has_hospital_certificate,
      status: record.status,
      current_assignee_role: record.current_assignee_role,
      submitted_at: record.submitted_at,
      is_pending: record.current_assignee_role === role
    })) });
  }

  if (request.method === 'GET' && path === '/v1/reviewer/application') {
    const reviewer = requireActor(request, REVIEWER_ROLES);
    const applicationId = url.searchParams.get('application_id'); assertApplicationId(applicationId);
    const record = getApplication(await loadState(), applicationId);
    if (!reviewerCanRead(record, reviewer.role)) throw new ApiError(403, 'TASK_NOT_ACCESSIBLE', '该申请不属于当前审核角色的待办或已办');
    return sendJson(response, 200, { leave: record });
  }

  if (request.method === 'POST' && path === '/v1/reviewer/action') {
    const reviewer = requireActor(request, REVIEWER_ROLES);
    const payload = mergePayload(await readJson(request), url);
    assertApplicationId(payload.application_id);
    const state = await loadState(); const record = getApplication(state, payload.application_id);
    assertCanReview(record, reviewer);
    const action = String(payload.action ?? '');
    const from = record.status;
    if (action === 'approve') {
      const nextIndex = record.approval_index + 1;
      if (nextIndex < record.approver_sequence.length) {
        record.approval_index = nextIndex; transition(record, 'under_review', record.approver_sequence[nextIndex]);
        addHistory(state, record, reviewer, 'approve', from, 'under_review', null);
      } else {
        record.approval_index = nextIndex; transition(record, 'approved'); record.approved_at = record.updated_at;
        addHistory(state, record, reviewer, 'approve', from, 'approved', null);
      }
    } else if (action === 'reject') {
      const comment = requireComment(payload); transition(record, 'rejected'); record.rejected_at = record.updated_at;
      addHistory(state, record, reviewer, 'reject', from, 'rejected', comment);
    } else if (action === 'request_more_info') {
      const comment = requireComment(payload); transition(record, 'need_more_info');
      record.supplement_request = { requested_by_role: reviewer.role, comment, requested_at: record.updated_at };
      addHistory(state, record, reviewer, 'request_more_info', from, 'need_more_info', comment);
    } else throw new ApiError(400, 'INVALID_REVIEW_ACTION', '审核动作仅支持 approve、reject 或 request_more_info');
    await saveState(state);
    return sendJson(response, 200, { application_id: record.application_id, status: record.status, current_assignee_role: record.current_assignee_role, leave: record });
  }

  if (request.method === 'POST' && path === '/v1/leave/supplement') {
    const student = requireActor(request, new Set(['student']));
    const payload = mergePayload(await readJson(request), url); assertApplicationId(payload.application_id);
    const state = await loadState(); const record = getOwnedApplication(state, payload.application_id, student);
    if (record.status !== 'need_more_info' || !record.supplement_request) throw new ApiError(409, 'SUPPLEMENT_NOT_ALLOWED', '当前申请不处于待补充状态');
    const comment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
    if (!comment) throw new ApiError(400, 'SUPPLEMENT_COMMENT_REQUIRED', '补充说明不能为空');
    if (comment.length > 200) throw new ApiError(400, 'COMMENT_TOO_LONG', '补充说明不能超过 200 字符');
    if (typeof payload.reason_summary === 'string' && payload.reason_summary.trim()) record.reason_summary = payload.reason_summary.trim().slice(0, 200);
    if (Object.hasOwn(payload, 'has_hospital_certificate')) record.has_hospital_certificate = isTrue(payload.has_hospital_certificate);
    const requestedBy = record.supplement_request.requested_by_role;
    transition(record, 'under_review', requestedBy); record.supplement_request = null;
    addHistory(state, record, student, 'supplement', 'need_more_info', 'under_review', comment);
    await saveState(state);
    return sendJson(response, 200, { application_id: record.application_id, status: record.status, current_assignee_role: record.current_assignee_role, leave: record });
  }

  throw new ApiError(404, 'NOT_FOUND', '接口不存在');
}

const server = createServer(async (request, response) => {
  const started = performance.now(); const requestId = makeId('REQ'); const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
  try {
    await handle(request, response);
    console.log(JSON.stringify({ request_id: requestId, method: request.method, path: url.pathname, status: response.statusCode || 200, error_code: null, duration_ms: Math.round(performance.now() - started) }));
  } catch (error) {
    const known = error instanceof ApiError; const status = known ? error.status : 500;
    console.log(JSON.stringify({ request_id: requestId, method: request.method, path: url.pathname, status, error_code: known ? error.code : 'INTERNAL_ERROR', duration_ms: Math.round(performance.now() - started) }));
    sendJson(response, status, { error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : '服务内部错误，本次操作未确认成功' } });
  }
});

server.listen(PORT, HOST, () => console.log(`学事智办 DEMO API 已监听内部地址 ${HOST}:${PORT}`));
