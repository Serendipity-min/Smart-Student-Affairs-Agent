import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const base = (process.env.P35_E2E_BASE ?? 'https://demo-api.serendipituwpt.art').replace(/\/$/, '');
const token = process.env.DEMO_API_TOKEN ?? '';
// 生产服务目录由 root 管理；默认把可审计的合成 E2E 证据写到服务账户拥有的数据目录。
const evidenceDirectory = process.env.DEMO_DATA_FILE ? join(dirname(process.env.DEMO_DATA_FILE), 'evidence') : join(process.cwd(), 'evidence');
const evidencePath = process.env.P35_E2E_EVIDENCE_PATH ?? join(evidenceDirectory, `p35_e2e_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
const actorIds = { student: 'DEMO-STU-001', counselor: 'DEMO-REV-COUNSELOR', teaching_vice_dean: 'DEMO-REV-VICE-DEAN', academic_affairs: 'DEMO-REV-ACADEMIC' };

if (token.length < 32) throw new Error('DEMO_API_TOKEN 未配置，拒绝进行真实 E2E');

async function request(path, { method = 'GET', role = 'student', body } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Demo-User-Id': actorIds[role], 'X-Demo-User-Role': role }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${payload?.error?.code ?? 'UNKNOWN'}`);
  // 证据只保存响应与动作，不含 Authorization、Cookie 或任何真实身份资料。
  return { status: response.status, payload };
}

async function draftAndSubmit(name, fields) {
  const draft = await request('/v1/leave/draft', { method: 'POST', body: fields });
  const applicationId = draft.payload.application_id;
  const submit = await request('/v1/leave/submit', { method: 'POST', body: { application_id: applicationId, confirmed: true } });
  return { name, application_id: applicationId, draft, submit, actions: [] };
}
async function review(entry, role, action, comment) {
  const result = await request('/v1/reviewer/action', { method: 'POST', role, body: { application_id: entry.application_id, action, comment } });
  entry.actions.push({ role, action, result });
  return result.payload.leave;
}
async function query(entry) {
  entry.query = await request(`/v1/leave?application_id=${encodeURIComponent(entry.application_id)}`);
  return entry.query.payload.leave;
}

const results = [];
const e1 = await draftAndSubmit('E1', { leave_type: 'personal', reason_category: 'personal', reason_summary: 'E1 受控合成二天事假', start_at: '2026-10-01 08:00:00', end_at: '2026-10-02 18:00:00', off_campus_internship: false });
await review(e1, 'counselor', 'approve');
if ((await query(e1)).status !== 'approved') throw new Error('E1 未到达 approved');
results.push(e1);

const e2 = await draftAndSubmit('E2', { leave_type: 'personal', reason_category: 'personal', reason_summary: 'E2 受控合成四天事假', start_at: '2026-10-05 08:00:00', end_at: '2026-10-08 18:00:00', off_campus_internship: false });
await review(e2, 'counselor', 'approve');
await review(e2, 'teaching_vice_dean', 'approve');
if ((await query(e2)).status !== 'approved') throw new Error('E2 未到达 approved');
results.push(e2);

const e3 = await draftAndSubmit('E3', { leave_type: 'sick', reason_category: 'sick', reason_summary: 'E3 受控合成二天病假', start_at: '2026-10-10 08:00:00', end_at: '2026-10-11 18:00:00', off_campus_internship: false, has_hospital_certificate: false });
await review(e3, 'counselor', 'request_more_info', '请补充就医情况说明。');
e3.supplement = await request('/v1/leave/supplement', { method: 'POST', body: { application_id: e3.application_id, has_hospital_certificate: true, comment: '已准备医院证明，仅记录演示布尔状态。' } });
await review(e3, 'counselor', 'approve');
if ((await query(e3)).status !== 'approved') throw new Error('E3 未到达 approved');
results.push(e3);

const e4 = await draftAndSubmit('E4', { leave_type: 'official_activity', reason_category: 'official_activity', reason_summary: 'E4 受控合成校外实习三级审批', start_at: '2026-10-12 08:00:00', end_at: '2026-11-20 18:00:00', off_campus_internship: true });
await review(e4, 'counselor', 'approve');
await review(e4, 'teaching_vice_dean', 'approve');
await review(e4, 'academic_affairs', 'approve');
if ((await query(e4)).status !== 'approved') throw new Error('E4 未到达 approved');
results.push(e4);

await mkdir(dirname(evidencePath), { recursive: true, mode: 0o700 });
await writeFile(evidencePath, `${JSON.stringify({ contract: 'P3.5', ran_at: new Date().toISOString(), endpoint: base, results }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify({ contract: 'P3.5', status: 'PASS', evidence_path: evidencePath, applications: results.map((item) => ({ name: item.name, application_id: item.application_id, status: item.query.payload.leave.status, current_assignee_role: item.query.payload.leave.current_assignee_role, duration_days: item.query.payload.leave.duration_days })) }));
