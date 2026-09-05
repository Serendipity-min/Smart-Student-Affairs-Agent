import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '127.0.0.1';
const FASTGPT_BASE = (process.env.FASTGPT_BASE ?? '').replace(/\/$/, '');
const DEMO_API_BASE = (process.env.DEMO_API_BASE ?? '').replace(/\/$/, '');
const DEMO_API_TOKEN = process.env.DEMO_API_TOKEN ?? '';
const MAX_BODY_BYTES = 64 * 1024;
const T02_PREVIEW_TTL_MS = 15 * 60 * 1000;
const t02PreviewGuards = new Map();
const APPS = {
  main: { id: process.env.FASTGPT_MAIN_APP_ID ?? '', key: process.env.FASTGPT_MAIN_API_KEY ?? '' },
  t01: { id: process.env.FASTGPT_T01_APP_ID ?? '', key: process.env.FASTGPT_T01_API_KEY ?? '' },
  t02: { id: process.env.FASTGPT_T02_APP_ID ?? '', key: process.env.FASTGPT_T02_API_KEY ?? '' },
  t03: { id: process.env.FASTGPT_T03_APP_ID ?? '', key: process.env.FASTGPT_T03_API_KEY ?? '' }
};
const DEMO_ACTORS = {
  student: 'DEMO-STU-001',
  counselor: 'DEMO-REV-COUNSELOR',
  teaching_vice_dean: 'DEMO-REV-VICE-DEAN',
  academic_affairs: 'DEMO-REV-ACADEMIC'
};

if (!FASTGPT_BASE || Object.values(APPS).some((app) => !app.id || !app.key)) {
  throw new Error('必须在仅服务端可见的环境变量中配置 FASTGPT_BASE、四个应用 ID 与四个最小用途 API Key；禁止在浏览器或仓库中写入真实凭据。');
}

function apiError(status, code, message) { return Object.assign(new Error(message), { status, code }); }
function send(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
  response.end(body);
}
async function readJson(request) {
  if ((request.headers['content-type'] ?? '').split(';')[0] !== 'application/json') throw apiError(415, 'JSON_REQUIRED', '请求格式无效');
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > MAX_BODY_BYTES) throw apiError(413, 'BODY_TOO_LARGE', '请求过大'); chunks.push(chunk); }
  try { const body = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!body || Array.isArray(body)) throw new Error(); return body; } catch { throw apiError(400, 'INVALID_JSON', '请求数据无效'); }
}

async function callDemoApi(path, { method = 'GET', payload, role = 'student' } = {}) {
  if (!DEMO_API_BASE || DEMO_API_TOKEN.length < 32 || !DEMO_ACTORS[role]) throw apiError(503, 'DEMO_API_NOT_CONFIGURED', '演示审批服务尚未配置完成');
  const response = await fetch(`${DEMO_API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${DEMO_API_TOKEN}`, 'Content-Type': 'application/json', 'X-Demo-User-Id': DEMO_ACTORS[role], 'X-Demo-User-Role': role },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // 不透传上游原始正文，避免把内部服务诊断或凭据线索暴露给浏览器。
    throw apiError(response.status >= 500 ? 502 : response.status, data?.error?.code ?? 'DEMO_API_ERROR', data?.error?.message ?? '演示审批服务暂时不可用');
  }
  return data;
}

function parseSse(raw) {
  const events = [];
  for (const block of raw.split(/\r?\n\r?\n/)) {
    let type = 'message'; const lines = [];
    for (const line of block.split(/\r?\n/)) { if (line.startsWith('event:')) type = line.slice(6).trim(); if (line.startsWith('data:')) lines.push(line.slice(5).trim()); }
    const text = lines.join('\n'); if (!text || text === '[DONE]') continue;
    try { events.push({ type, data: JSON.parse(text) }); } catch { events.push({ type, data: { text } }); }
  }
  return events;
}

function walk(value, visitor, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value); visitor(value);
  for (const child of Object.values(value)) {
    if (typeof child === 'string' && /^[{[]/.test(child.trim())) { try { walk(JSON.parse(child), visitor, seen); } catch { /* 工具文本并非 JSON 时保留原值。 */ } }
    else if (child && typeof child === 'object') walk(child, visitor, seen);
  }
}
function collectObjects(events) { const objects = []; for (const event of events) walk(event.data, (item) => objects.push(item)); return objects; }
function findFirst(objects, predicate) { return objects.find(predicate); }
function findNodeIds(objects) {
  const ids = new Set();
  for (const object of objects) {
    // 不假设 FastGPT 将节点标识放在固定字段；仅收集白名单前缀的节点值，不读取普通业务文本。
    for (const value of Object.values(object)) {
      if (typeof value === 'string' && /^(p2|p110)[A-Za-z0-9_-]+$/i.test(value)) ids.add(value);
    }
  }
  return [...ids];
}
function summarizeSseShape(events) {
  const toolShape = (value) => {
    if (value && typeof value === 'object') return { type: 'object', keys: Object.keys(value).sort() };
    if (typeof value === 'string' && /^[{[]/.test(value.trim())) {
      try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? { type: 'json-string', keys: Object.keys(parsed).sort() } : { type: 'json-string', keys: [] }; } catch { return { type: 'text', keys: [] }; }
    }
    return { type: typeof value, keys: [] };
  };
  // 诊断只保留事件类型和字段名，用于适配厂商 SSE 封装，不会保存任何用户文本或上游结果值。
  return events.slice(0, 24).map((event) => ({
    type: event.type,
    keys: event.data && typeof event.data === 'object' ? Object.keys(event.data).sort() : [],
    item_keys: Array.isArray(event.data) ? event.data.slice(0, 8).map((item) => item && typeof item === 'object' ? Object.keys(item).sort() : []) : undefined,
    // nodeId/id/moduleType 都是流程结构标识，不包含用户、知识库或工具响应内容。
    node_refs: Array.isArray(event.data) ? event.data.slice(0, 8).map((item) => ({ id: item?.id, nodeId: item?.nodeId, moduleType: item?.moduleType })) : undefined,
    tool_result_shapes: Array.isArray(event.data) ? event.data.slice(0, 8).filter((item) => item?.toolRes !== undefined).map((item) => ({ nodeId: item.nodeId, tool_res: toolShape(item.toolRes) })) : undefined,
    error_code: event.type === 'error' && ((typeof event.data?.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(event.data.code)) || (typeof event.data?.code === 'number' && Number.isInteger(event.data.code))) ? event.data.code : undefined,
    error_data_type: event.type === 'error' ? typeof event.data?.data : undefined,
    // 平台错误对象可能包含内部诊断；仅记录字段名以辨别协议层，不保存 message/data 的实际内容。
    error_data_keys: event.type === 'error' && event.data?.data && typeof event.data.data === 'object' && !Array.isArray(event.data.data) ? Object.keys(event.data.data).sort() : undefined
  }));
}
function findChatId(objects, fallback) { return findFirst(objects, (item) => typeof item.chatId === 'string')?.chatId || fallback; }
function hasInteractive(events, objects) {
  // SF-FastGPT 的工作流既可能发 interactive SSE，也可能仅在 flowResponses 中返回 formInput 节点。
  return events.some((event) => event.type === 'interactive') || objects.some((item) => item.type === 'interactive' || item.interactive?.type || item.moduleType === 'formInput' || item.formInputResult);
}
function extractAnswer(events, objects) {
  const fragments = [];
  for (const event of events) { const choice = event.data?.choices?.[0]; const text = choice?.delta?.content ?? choice?.message?.content ?? event.data?.answer; if (typeof text === 'string') fragments.push(text); }
  return String(findFirst(objects, (item) => typeof item.answer === 'string')?.answer ?? fragments.join('')).trim();
}
function extractCitations(objects) {
  const candidate = findFirst(objects, (item) => Array.isArray(item.citations))?.citations;
  return Array.isArray(candidate) ? candidate.filter((item) => item && typeof item.title === 'string').map(({ title, source, content }) => ({ title, source, content })) : [];
}
function extractLeaveRoute(objects) {
  const raw = findFirst(objects, (item) => typeof item.route_id === 'string' && Number.isFinite(item.duration_days));
  return raw ? { duration_days: raw.duration_days, route_id: raw.route_id, approver_sequence: Array.isArray(raw.approver_sequence) ? raw.approver_sequence : [], material_required: Array.isArray(raw.material_required) ? raw.material_required : [], warnings: Array.isArray(raw.warnings) ? raw.warnings : [], ready_to_submit: raw.ready_to_submit === true } : undefined;
}
function extractLeave(objects) {
  // 确认分支依次产生草稿和提交结果；优先读取最终 submitted 记录，避免被早期 draft 覆盖。
  const candidates = objects.filter((item) => typeof item.application_id === 'string' && typeof item.status === 'string');
  const raw = candidates.findLast((item) => item.status === 'submitted') ?? candidates.at(-1);
  if (!raw) return undefined;
  // 提交节点只确认状态时，沿同一工作流末尾及路由结果补齐草稿已确定的字段，避免前端把确定的四天误显示为未知。
  const completed = [...candidates].reverse().find((item) => Number.isFinite(item.duration_days)) ?? raw;
  const routed = [...candidates].reverse().find((item) => typeof item.matched_route_id === 'string' || typeof item.route_id === 'string') ?? raw;
  const route = extractLeaveRoute(objects);
  // T03 必须保留 V0.3 审批状态字段；候选来自平台实际 HTTP 工具响应，绝不由浏览器输入补造。
  const full = [...candidates].reverse().find((item) => Array.isArray(item.approver_sequence) || Array.isArray(item.review_history) || Number.isInteger(item.approval_index)) ?? raw;
  return {
    application_id: raw.application_id,
    status: raw.status,
    current_assignee_role: raw.current_assignee_role ?? full.current_assignee_role ?? null,
    duration_days: completed.duration_days ?? full.duration_days ?? route?.duration_days,
    matched_route_id: raw.matched_route_id ?? raw.route_id ?? full.matched_route_id ?? full.route_id ?? routed.matched_route_id ?? routed.route_id ?? route?.route_id,
    approver_sequence: Array.isArray(full.approver_sequence) ? full.approver_sequence : undefined,
    approval_index: Number.isInteger(full.approval_index) ? full.approval_index : undefined,
    review_history: Array.isArray(full.review_history) ? full.review_history : undefined,
    supplement_request: full.supplement_request ?? undefined
  };
}

async function callApp(kind, content, knownChatId) {
  const app = APPS[kind]; const chatId = knownChatId || `contest-${kind}-${randomUUID()}`;
  const response = await fetch(`${FASTGPT_BASE}/api/v1/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${app.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ appId: app.id, chatId, stream: true, detail: true, messages: [{ role: 'user', content: typeof content === 'string' ? content : JSON.stringify(content) }] }) });
  const raw = await response.text();
  if (!response.ok) {
    // 仅提取受限格式的机器错误码；绝不把可能含敏感信息的响应正文写入日志。
    let upstreamCode;
    try {
      const parsed = JSON.parse(raw);
      const candidate = parsed?.code ?? parsed?.error?.code;
      if (typeof candidate === 'string' && /^[A-Z0-9_]{1,80}$/.test(candidate)) upstreamCode = candidate;
    } catch { /* 上游非 JSON 错误页不进入证据与日志。 */ }
    throw Object.assign(apiError(502, 'FASTGPT_UPSTREAM_ERROR', '智能体服务暂时不可用，请稍后重试'), { upstreamStatus: response.status, upstreamCode });
  }
  const events = parseSse(raw); const objects = collectObjects(events);
  return { chatId: findChatId(objects, chatId), events, objects, nodeIds: findNodeIds(objects) };
}

function normalizeMainRoute(run) {
  const terminals = { p2ToT01: 't01', p2ToT02: 't02', p2ToT03: 't03', p2Safe: 'safe' };
  const terminalNode = Object.keys(terminals).find((node) => run.nodeIds.includes(node));
  if (!terminalNode) throw Object.assign(apiError(502, 'MAIN_ROUTE_UNRESOLVED', '统一入口未返回可识别的服务终端'), { sseShape: summarizeSseShape(run.events) });
  // 只读取平台 flowResponses 的实际末节点，不根据浏览器输入文本推断服务类型。
  return { terminal: terminals[terminalNode], mainChatId: run.chatId, message: extractAnswer(run.events, run.objects) };
}
function normalizeT01(run) {
  const answer = extractAnswer(run.events, run.objects);
  if (!answer) throw Object.assign(apiError(502, 'T01_EMPTY_ANSWER', '制度咨询未返回可展示答复'), { sseShape: summarizeSseShape(run.events) });
  return { t01ChatId: run.chatId, answer, citations: extractCitations(run.objects) };
}
function normalizeT02Preview(run) {
  const route = extractLeaveRoute(run.objects);
  if (!route || !run.nodeIds.includes('p110Route')) throw apiError(502, 'T02_ROUTE_UNRESOLVED', '请假规则引擎未返回审批预览');
  // 仅回传执行过的节点布尔值，供封板证据审计，不泄露平台原始流或凭据。
  // 预览资格仅保存在服务端内存且短时失效，用于拒绝未就绪会话绕过浏览器直接请求确认写入。
  for (const [chatId, guard] of t02PreviewGuards) if (guard.expiresAt < Date.now()) t02PreviewGuards.delete(chatId);
  t02PreviewGuards.set(run.chatId, { readyToSubmit: route.ready_to_submit === true, expiresAt: Date.now() + T02_PREVIEW_TTL_MS });
  return { t02ChatId: run.chatId, route, observedNodes: { p110Route: true, p110Draft: false, p110Submit: false } };
}
function normalizeT02Decision(run, action) {
  const draftObserved = run.nodeIds.includes('p110Draft'); const submitObserved = run.nodeIds.includes('p110Submit');
  const observedNodes = { p110Route: run.nodeIds.includes('p110Route'), p110Draft: draftObserved, p110Submit: submitObserved };
  if (action === 'cancel') return { t02ChatId: run.chatId, cancelled: !draftObserved && !submitObserved, writeObserved: draftObserved || submitObserved, observedNodes };
  const leave = extractLeave(run.objects);
  if (!draftObserved || !submitObserved || !leave || leave.status !== 'submitted') {
    throw Object.assign(apiError(502, 'T02_SUBMIT_UNRESOLVED', '确认链路未返回完整的 DEMO 提交结果'), { sseShape: summarizeSseShape(run.events) });
  }
  return { t02ChatId: run.chatId, leave, writeObserved: true, observedNodes };
}
function normalizeT03(run) {
  const leave = extractLeave(run.objects);
  if (!leave || !run.nodeIds.includes('p110T03Query')) throw Object.assign(apiError(502, 'T03_QUERY_UNRESOLVED', '状态查询未返回完整办件信息'), { sseShape: summarizeSseShape(run.events) });
  return { t03ChatId: run.chatId, leave };
}
async function runMain(message, knownChatId) {
  const initial = knownChatId ? undefined : await callApp('main', '开始');
  if (initial && !hasInteractive(initial.events, initial.objects)) throw Object.assign(apiError(502, 'MAIN_INTERACTIVE_MISSING', '统一入口未返回问题输入表单'), { sseShape: summarizeSseShape(initial.events) });
  return normalizeMainRoute(await callApp('main', { question: message }, knownChatId || initial.chatId));
}
async function runT01(question, knownChatId) {
  const first = await callApp('t01', question, knownChatId);
  if (!hasInteractive(first.events, first.objects)) return normalizeT01(first);
  return normalizeT01(await callApp('t01', { question }, first.chatId));
}
async function runT02(action, form, knownChatId) {
  if (action === 'preview') {
    if (!form || typeof form.reason !== 'string' || typeof form.start_at !== 'string' || typeof form.end_at !== 'string') throw apiError(400, 'INVALID_LEAVE_FORM', '请假表单不完整');
    // 每次预览都强制创建新会话，绝不把修改后的表单投递到已经停在确认节点的旧会话。
    const initial = await callApp('t02', '开始');
    if (!hasInteractive(initial.events, initial.objects)) throw Object.assign(apiError(502, 'T02_INTERACTIVE_MISSING', '请假应用未返回初始表单'), { sseShape: summarizeSseShape(initial.events) });
    // 保留 P1/P2 实测通过的 legacy 时间文本，避免浏览器或服务端发生 UTC 偏移。
    const fields = {
      leave_request_summary: form.reason,
      leave_period: `${form.start_at} 至 ${form.end_at}`,
      leave_type: form.leave_type,
      is_offcampus_internship: form.off_campus_internship,
      // 仅传递布尔声明，绝不把浏览器本地选择的病假文件名或二进制传入 FastGPT。
      has_hospital_certificate: form.has_hospital_certificate === true
    };
    return normalizeT02Preview(await callApp('t02', fields, initial.chatId));
  }
  if (!knownChatId) throw apiError(400, 'T02_CHAT_REQUIRED', '请先完成审批预览');
  const previewGuard = t02PreviewGuards.get(knownChatId);
  if (action === 'confirm' && (!previewGuard || previewGuard.expiresAt < Date.now() || !previewGuard.readyToSubmit)) {
    throw apiError(409, 'T02_NOT_READY', '当前申请暂不满足提交条件，请补充材料或转人工确认后重新办理');
  }
  const decision = normalizeT02Decision(await callApp('t02', { decision: action === 'confirm' ? 'confirm_submit' : 'cancel_abort' }, knownChatId), action);
  // 正常结束后立即释放会话门控状态，避免内存累积，也阻断同一预览被二次写入。
  t02PreviewGuards.delete(knownChatId);
  return decision;
}
async function runT03(applicationId, knownChatId) {
  const initial = knownChatId ? undefined : await callApp('t03', '开始查询');
  if (initial && !hasInteractive(initial.events, initial.objects)) throw Object.assign(apiError(502, 'T03_INTERACTIVE_MISSING', '状态应用未返回申请编号表单'), { sseShape: summarizeSseShape(initial.events) });
  return normalizeT03(await callApp('t03', { application_id: applicationId }, knownChatId || initial.chatId));
}

const server = createServer(async (request, response) => {
  const requestId = randomUUID();
  try {
    const path = new URL(request.url, `http://${request.headers.host}`).pathname;
    // 仅暴露不含配置、凭据或上游状态的存活探针，供本机 systemd 与 Nginx 部署验收使用。
    if (request.method === 'GET' && path === '/health') return send(response, 200, { status: 'ok' });
    if (request.method !== 'POST') return send(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST' } });
    const body = await readJson(request);
    let result;
    if (path === '/api/main') { if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1000) throw apiError(400, 'INVALID_MESSAGE', '问题内容无效'); result = await runMain(body.message.trim(), body.chatId); }
    else if (path === '/api/t01') { if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 1000) throw apiError(400, 'INVALID_QUESTION', '制度问题无效'); result = await runT01(body.question.trim(), body.chatId); }
    else if (path === '/api/t02') { if (!['preview', 'confirm', 'cancel'].includes(body.action)) throw apiError(400, 'INVALID_T02_ACTION', '请假操作无效'); result = await runT02(body.action, body.form, body.chatId); }
    else if (path === '/api/t03') { if (!/^DEMO-APP-[A-Z0-9-]{3,32}$/.test(String(body.applicationId ?? ''))) throw apiError(400, 'INVALID_APPLICATION_ID', '申请编号格式无效'); result = await runT03(body.applicationId, body.chatId); }
    else if (path === '/api/student/application') { if (!/^DEMO-APP-[A-Z0-9-]{3,32}$/.test(String(body.applicationId ?? ''))) throw apiError(400, 'INVALID_APPLICATION_ID', '申请编号格式无效'); result = await callDemoApi(`/v1/leave?application_id=${encodeURIComponent(body.applicationId)}`); }
    else if (path === '/api/student/supplement') {
      if (!/^DEMO-APP-[A-Z0-9-]{3,32}$/.test(String(body.applicationId ?? ''))) throw apiError(400, 'INVALID_APPLICATION_ID', '申请编号格式无效');
      result = await callDemoApi('/v1/leave/supplement', { method: 'POST', payload: { application_id: body.applicationId, reason_summary: body.reasonSummary, has_hospital_certificate: body.hasHospitalCertificate === true, comment: body.comment } });
    }
    else if (path === '/api/reviewer/tasks') {
      if (!['counselor', 'teaching_vice_dean', 'academic_affairs'].includes(String(body.role))) throw apiError(400, 'INVALID_REVIEWER_ROLE', '审核角色无效');
      result = await callDemoApi(`/v1/reviewer/tasks?role=${encodeURIComponent(body.role)}`, { role: body.role });
    }
    else if (path === '/api/reviewer/application') {
      if (!['counselor', 'teaching_vice_dean', 'academic_affairs'].includes(String(body.role))) throw apiError(400, 'INVALID_REVIEWER_ROLE', '审核角色无效');
      if (!/^DEMO-APP-[A-Z0-9-]{3,32}$/.test(String(body.applicationId ?? ''))) throw apiError(400, 'INVALID_APPLICATION_ID', '申请编号格式无效');
      result = await callDemoApi(`/v1/reviewer/application?application_id=${encodeURIComponent(body.applicationId)}`, { role: body.role });
    }
    else if (path === '/api/reviewer/action') {
      if (!['counselor', 'teaching_vice_dean', 'academic_affairs'].includes(String(body.role))) throw apiError(400, 'INVALID_REVIEWER_ROLE', '审核角色无效');
      if (!['approve', 'reject', 'request_more_info'].includes(String(body.action))) throw apiError(400, 'INVALID_REVIEW_ACTION', '审核动作无效');
      if (!/^DEMO-APP-[A-Z0-9-]{3,32}$/.test(String(body.applicationId ?? ''))) throw apiError(400, 'INVALID_APPLICATION_ID', '申请编号格式无效');
      result = await callDemoApi('/v1/reviewer/action', { method: 'POST', role: body.role, payload: { application_id: body.applicationId, action: body.action, comment: body.comment } });
    }
    else return send(response, 404, { error: { code: 'NOT_FOUND', message: '接口不存在' } });
    send(response, 200, result);
  } catch (error) {
    const status = Number(error?.status) || 500;
    // 日志保留最小诊断字段，绝不记录 Key、Cookie、表单事由或 FastGPT 原始响应。
    console.error(JSON.stringify({ request_id: requestId, path: request.url, status, upstream_status: error?.upstreamStatus, upstream_code: error?.upstreamCode, sse_shape: error?.sseShape, code: error?.code ?? 'GATEWAY_ERROR' }));
    send(response, status, { error: { code: error?.code ?? 'GATEWAY_ERROR', message: status >= 500 ? '服务暂时不可用，请稍后重试' : error.message } });
  }
});
server.listen(PORT, HOST, () => console.log(`contest demo gateway listening on ${HOST}:${PORT}`));
