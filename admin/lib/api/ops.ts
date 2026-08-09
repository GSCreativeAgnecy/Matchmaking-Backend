import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "@/lib/api/client";
import type {
  AdminUserDetail,
  AdminUserRow,
  AppConfigRow,
  AuditRow,
  CampaignRow,
  ConversationRow,
  JobVerificationRow,
  MatchRow,
  PaymentRow,
  ReportRow,
  RolePermissions,
  SubscriptionPlanRow,
  SubscriptionRow,
} from "@/lib/types";
import { buildQuery } from "@/lib/api/client";

export interface ListResult<T> {
  rows: T[];
  meta: { total: number; limit: number; offset: number; count: number };
}

async function list<T>(path: string, params: Record<string, unknown> = {}): Promise<ListResult<T>> {
  const res = await apiGet<{ data: T[]; meta: ListResult<T>["meta"] }>(`${path}${buildQuery(params as never)}`);
  return { rows: res.data, meta: res.meta };
}

// ---------- users ----------

export async function fetchAdminUser(id: string): Promise<AdminUserDetail> {
  const res = await apiGet<{ data: AdminUserDetail }>(`/admin/users/${id}`);
  return res.data;
}

export const userActions = {
  suspend: (id: string, body: { reason: string; duration_minutes?: number | null; admin_notes?: string | null }) =>
    apiPost(`/admin/users/${id}/suspend`, body),
  ban: (id: string, body: { reason: string; admin_notes?: string | null }) => apiPost(`/admin/users/${id}/ban`, body),
  unban: (id: string) => apiPost(`/admin/users/${id}/unban`),
  remove: (id: string, body: { reason: string; admin_notes?: string | null }) => apiPost(`/admin/users/${id}/delete`, body),
  restore: (id: string) => apiPost(`/admin/users/${id}/restore`),
  verify: (id: string, kind: "email" | "phone") => apiPost(`/admin/users/${id}/verify`, { kind }),
  changeRole: (id: string, role: string) => apiPost(`/admin/users/${id}/role`, { role }),
};

export const fetchUserSubresource = (id: string, resource: string) =>
  apiGet<{ data: unknown[] }>(`/admin/users/${id}/${resource}`).then((r) => r.data);

// ---------- profiles ----------

export function fetchProfiles(params: Record<string, unknown> = {}) {
  return list<Record<string, unknown>>("/admin/profiles", params);
}

export function fetchProfileDetail(userId: string) {
  return apiGet<{ data: Record<string, unknown> }>(`/admin/profiles/${userId}`).then((r) => r.data);
}

export function moderateProfile(userId: string, body: { action: string; reason?: string }) {
  return apiPost(`/admin/profiles/${userId}/moderate`, body);
}

// ---------- photos ----------

export function fetchPhotos(params: Record<string, unknown> = {}) {
  return list<import("@/lib/types").PhotoRow>("/admin/photos", params);
}

export function reviewPhoto(id: string, body: { action: string; reason?: string }) {
  return apiPost(`/admin/photos/${id}/review`, body);
}

// ---------- reports ----------

export function fetchReports(params: Record<string, unknown> = {}) {
  return list<ReportRow>("/admin/reports", params);
}

export function fetchReport(id: string) {
  return apiGet<{ data: ReportRow & { history: Record<string, unknown>[] } }>(`/admin/reports/${id}`).then((r) => r.data);
}

export const reportActions = {
  assign: (id: string, assigneeId: string) => apiPost(`/admin/reports/${id}/assign`, { assignee_id: assigneeId }),
  transition: (id: string, status: string, reason?: string) =>
    apiPost(`/admin/reports/${id}/review`, { status, reason }),
  warn: (id: string, message: string) => apiPost(`/admin/reports/${id}/warn`, { message }),
  suspend: (id: string, body: { reason: string; duration_minutes?: number }) =>
    apiPost(`/admin/reports/${id}/suspend`, body),
  ban: (id: string, body: { reason: string; admin_notes?: string }) => apiPost(`/admin/reports/${id}/ban`, body),
};

// ---------- matches / messages ----------

export function fetchMatches(params: Record<string, unknown> = {}) {
  return list<MatchRow>("/admin/matches", params);
}

export function fetchConversations(params: Record<string, unknown> = {}) {
  return list<ConversationRow>("/admin/messages/conversations", params);
}

export function fetchConversation(id: string) {
  return apiGet<{ data: Record<string, unknown> }>(`/admin/messages/conversations/${id}`).then((r) => r.data);
}

// ---------- payments ----------

export function fetchPayments(params: Record<string, unknown> = {}) {
  return list<PaymentRow>("/admin/payments", params);
}

export function fetchPayment(id: string) {
  return apiGet<{ data: PaymentRow }>(`/admin/payments/${id}`).then((r) => r.data);
}

export function refundPayment(id: string, reason: string) {
  return apiPost(`/admin/payments/${id}/refund`, { reason });
}

// ---------- subscriptions ----------

export function fetchSubscriptions(params: Record<string, unknown> = {}) {
  return list<SubscriptionRow>("/admin/subscriptions", params);
}

export function fetchPlans(params: Record<string, unknown> = {}) {
  return list<SubscriptionPlanRow>("/admin/subscription-plans", params);
}

export const planActions = {
  create: (body: Record<string, unknown>) => apiPost("/admin/subscription-plans", body),
  update: (id: string, body: Record<string, unknown>) => apiPatch(`/admin/subscription-plans/${id}`, body),
  activate: (id: string) => apiPost(`/admin/subscription-plans/${id}/activate`),
  deactivate: (id: string) => apiPost(`/admin/subscription-plans/${id}/deactivate`),
};

// ---------- job verification ----------

export function fetchJobVerifications(params: Record<string, unknown> = {}) {
  return list<JobVerificationRow>("/admin/verifications/job", params);
}

export const verificationActions = {
  review: (id: string, body: { approve: boolean; rejection_reason?: string; admin_notes?: string; expires_in_days?: number }) =>
    apiPost(`/admin/verifications/job/${id}/review`, body),
  requestInfo: (id: string, reason: string) => apiPost(`/admin/verifications/job/${id}/request-info`, { reason }),
};

// ---------- notifications ----------

export function fetchCampaigns(params: Record<string, unknown> = {}) {
  return list<CampaignRow>("/admin/notifications/campaigns", params);
}

export function createCampaign(body: Record<string, unknown>) {
  return apiPost<{ data: CampaignRow }>("/admin/notifications/campaign", body);
}

// ---------- app config ----------

export function fetchAppConfig(params: Record<string, unknown> = {}) {
  return list<AppConfigRow>("/admin/app-config", params);
}

export const appConfigActions = {
  update: (key: string, body: Record<string, unknown>) => apiPatch(`/admin/app-config/${key}`, body),
  deactivate: (key: string) => apiDelete(`/admin/app-config/${key}`),
};

// ---------- analytics ----------

export function fetchAnalytics(section: "users" | "engagement" | "matching" | "revenue" | "moderation", range: string) {
  return apiGet<{ data: Record<string, unknown> }>(`/admin/analytics/${section}?range=${range}`).then((r) => r.data);
}

// ---------- audit ----------

export function fetchAuditLogs(params: Record<string, unknown> = {}) {
  return list<AuditRow>("/admin/audit-logs", params);
}

// ---------- admin users / roles ----------

export function fetchAdminUsers(params: Record<string, unknown> = {}) {
  return list<AdminUserRow>("/admin/admin-users", params);
}

export const adminUserActions = {
  create: (body: { email: string; password?: string; role: string }) => apiPost("/admin/admin-users", body),
  changeRole: (id: string, role: string) => apiPatch(`/admin/admin-users/${id}/role`, { role }),
  disable: (id: string, reason?: string) => apiPost(`/admin/admin-users/${id}/disable`, { reason }),
  enable: (id: string) => apiPost(`/admin/admin-users/${id}/enable`),
  reset2fa: (id: string) => apiPost(`/admin/admin-users/${id}/reset-2fa`),
  revokeSessions: (id: string) => apiPost(`/admin/admin-users/${id}/revoke-sessions`),
};

export function fetchRoles() {
  return apiGet<{ data: RolePermissions[] }>("/admin/roles").then((r) => r.data);
}

export function updateRolePermissions(role: string, permissions: string[]) {
  return apiPut(`/admin/roles/${role}/permissions`, { permissions });
}
