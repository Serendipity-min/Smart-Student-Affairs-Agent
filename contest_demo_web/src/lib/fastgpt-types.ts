export type AssistantRoute = 't01' | 't02' | 't03' | 'safe' | 'unknown';

export type Citation = { title: string; source?: string; content?: string };

export type LeaveRoute = {
  duration_days: number;
  route_id: string;
  approver_sequence: string[];
  material_required?: string[];
  warnings?: string[];
  ready_to_submit?: boolean;
};

export type LeaveStatus = {
  application_id: string;
  status: 'pending_confirmation' | 'submitted' | 'under_review' | 'need_more_info' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled' | string;
  current_assignee_role?: string | null;
  duration_days?: number;
  matched_route_id?: string;
  leave_type?: string;
  reason_summary?: string;
  start_at?: string;
  end_at?: string;
  off_campus_internship?: boolean;
  has_hospital_certificate?: boolean;
  approver_sequence?: string[];
  approval_index?: number;
  review_history?: ReviewHistory[];
  supplement_request?: SupplementRequest | null;
  created_at?: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
};

export type ReviewRole = 'counselor' | 'teaching_vice_dean' | 'academic_affairs';
// 演示角色只影响前端工作台入口；student 不具备任何审核 API 权限。
export type DemoRole = 'student' | ReviewRole;
export type ReviewHistory = { action_id: string; actor_role: string; action: string; action_type?: string; from_status: string | null; to_status: string; comment?: string | null; action_at: string };
export type SupplementRequest = { requested_by_role: ReviewRole; comment: string; requested_at: string };
export type ReviewerTask = Pick<LeaveStatus, 'application_id' | 'leave_type' | 'reason_summary' | 'duration_days' | 'off_campus_internship' | 'has_hospital_certificate' | 'status' | 'current_assignee_role' | 'submitted_at'> & { is_pending: boolean };

export type GatewayResult = {
  chatId?: string;
  terminal: AssistantRoute;
  answer?: string;
  citations?: Citation[];
  interactive?: { type?: string; status?: string; fields?: unknown[] };
  leaveRoute?: LeaveRoute;
  leave?: LeaveStatus;
  rawEventTypes?: string[];
};

export type MainRouteResult = { terminal: AssistantRoute; mainChatId: string; message?: string };
export type T01Result = { t01ChatId: string; answer: string; citations: Citation[] };
export type T02ObservedNodes = { p110Route: boolean; p110Draft: boolean; p110Submit: boolean };
export type T02Result = { t02ChatId: string; route?: LeaveRoute; leave?: LeaveStatus; cancelled?: boolean; writeObserved?: boolean; observedNodes?: T02ObservedNodes };
export type T03Result = { t03ChatId: string; leave: LeaveStatus };

export type DemoSessions = {
  main?: string;
  t01?: string;
  t02?: string;
  t03?: string;
};

export type LeaveFormPayload = {
  reason: string;
  start_at: string;
  end_at: string;
  leave_type: 'sick' | 'personal' | 'official_activity' | 'other';
  off_campus_internship: boolean;
  has_hospital_certificate: boolean;
};
