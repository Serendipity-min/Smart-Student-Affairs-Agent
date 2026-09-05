import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLeaveRoute } from '../src/rules.mjs';

function route(start_at, end_at, extras = {}) {
  return calculateLeaveRoute({ start_at, end_at, leave_type: 'personal', off_campus_internship: false, ...extras });
}

test('P3.5 路由矩阵：普通请假按三天、自然月分流', () => {
  assert.deepEqual(route('2026-09-01', '2026-09-01').approver_sequence, ['counselor']);
  assert.equal(route('2026-09-01', '2026-09-03').route_id, 'ROUTE-LE3-NORMAL');
  assert.equal(route('2026-09-01', '2026-09-04').route_id, 'ROUTE-GT3-LE1M');
  assert.deepEqual(route('2026-09-01', '2026-09-04').approver_sequence, ['counselor', 'teaching_vice_dean']);
  assert.equal(route('2026-09-01', '2026-09-15').route_id, 'ROUTE-GT3-LE1M');
  assert.equal(route('2027-01-31', '2027-02-28').route_id, 'ROUTE-GT3-LE1M');
  assert.equal(route('2027-01-31', '2027-03-01').route_id, 'ROUTE-GT1M-SUSPENSION');
});

test('P3.5 校外实习优先于时长与休学提示', () => {
  for (const end_at of ['2026-09-01', '2026-09-04', '2026-10-20']) {
    const result = route('2026-09-01', end_at, { off_campus_internship: true });
    assert.equal(result.route_id, 'ROUTE-INTERNSHIP-3LEVEL');
    assert.deepEqual(result.approver_sequence, ['counselor', 'teaching_vice_dean', 'academic_affairs']);
    assert.equal(result.ready_to_submit, true);
  }
});

test('P3.5 病假证明为可选声明，未准备仍可提交', () => {
  const result = route('2026-09-01', '2026-09-02', { leave_type: 'sick', has_hospital_certificate: false });
  assert.equal(result.ready_to_submit, true);
  assert.equal(result.material_required.length, 0);
  assert.match(result.warnings.join(''), /审核环节要求补充/);
});

test('P3.5 移除实习假枚举，保留校外实习布尔字段', () => {
  const result = route('2026-09-01', '2026-09-02', { leave_type: 'internship' });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(''), /不在允许范围/);
});
