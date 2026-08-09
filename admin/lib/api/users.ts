import { apiGet, apiPost } from "@/lib/api/client";
import type {
  ActionCenterItem,
  AdminUserListRow,
  DashboardSummary,
  EngagementBucket,
  ModerationBucket,
  PageMeta,
  RecentActivityItem,
  RevenueBucket,
  TimeBucket,
} from "@/lib/types";

const dash = (path: string, params: Record<string, string | number | boolean | null | undefined> = {}) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  const qs = search.toString();
  return `/admin/dashboard${path}${qs ? `?${qs}` : ""}`;
};

export async function fetchDashboardSummary() {
  const res = await apiGet<{ data: DashboardSummary }>(dash("/summary"));
  return res.data;
}

export async function fetchActionCenter() {
  const res = await apiGet<{ data: ActionCenterItem[] }>(dash("/action-center"));
  return res.data;
}

export async function fetchRecentActivity(limit = 20) {
  const res = await apiGet<{ data: RecentActivityItem[] }>(dash("/recent-activity", { limit }));
  return res.data;
}

export async function fetchUserGrowth(range: string) {
  const res = await apiGet<{ data: TimeBucket[] }>(dash("/user-growth", { range }));
  return res.data;
}

export async function fetchEngagement(range: string) {
  const res = await apiGet<{ data: EngagementBucket[] }>(dash("/engagement", { range }));
  return res.data;
}

export async function fetchRevenue(range: string) {
  const res = await apiGet<{ data: RevenueBucket[] }>(dash("/revenue", { range }));
  return res.data;
}

export async function fetchModeration(range: string) {
  const res = await apiGet<{ data: ModerationBucket[] }>(dash("/moderation", { range }));
  return res.data;
}

export interface UserListParams {
  search?: string;
  gender?: string;
  age_min?: number;
  age_max?: number;
  city?: string;
  state?: string;
  country?: string;
  religion?: string;
  caste?: string;
  education?: string;
  occupation?: string;
  premium?: boolean;
  verified?: boolean;
  account_status?: string;
  registered_from?: string;
  registered_to?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

export async function fetchUsers(params: UserListParams) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const res = await apiGet<{ data: AdminUserListRow[]; meta: PageMeta }>(`/admin/users?${search.toString()}`);
  return { rows: res.data, meta: res.meta };
}

export async function fetchUserDetail(id: string) {
  const res = await apiGet<{ data: AdminUserListRow & { profile?: unknown } }>(`/admin/users/${id}`);
  return res.data;
}
