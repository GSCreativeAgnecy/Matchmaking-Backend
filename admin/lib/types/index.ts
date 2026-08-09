// API types for the admin dashboard.
//
// These mirror the FastAPI response schemas. A generated copy can be produced
// from the backend OpenAPI spec with `npm run generate:types` (see docs); the
// hand-written types below keep the app buildable without a running API and are
// the source of truth for the UI.

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ApiError {
  error: ApiErrorDetail;
}

export interface PageMeta {
  total: number;
  limit: number;
  offset: number;
  count: number;
}

// ---------- auth ----------

export interface LoginResult {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  requires_2fa?: boolean;
  mfa_token?: string;
}

export interface MeResponse {
  id: string;
  email: string | null;
  phone_number: string | null;
  account_status: string;
  role: string;
  is_banned: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string | null;
}

// ---------- permissions ----------

export interface RolePermissions {
  role: string;
  permissions: string[];
}

// ---------- dashboard ----------

export interface DashboardSummary {
  total_users: number;
  new_users_today: number;
  active_users_today: number;
  new_matches_today: number;
  pending_verifications: number;
  open_reports: number;
  today_revenue: number;
  active_premium_subscriptions: number;
}

export interface ActionCenterItem {
  key: string;
  label: string;
  count: number;
  link: string;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  actor_user_id: string | null;
  actor_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string | null;
}

export interface TimeBucket {
  bucket: string;
  count: number;
}

export interface EngagementBucket {
  bucket: string;
  swipes: number;
  likes: number;
  matches: number;
  messages: number;
}

export interface RevenueBucket {
  bucket: string;
  revenue: number;
}

export interface ModerationBucket {
  bucket: string;
  reports: number;
  suspensions: number;
  bans: number;
  pending_verifications: number;
}

// ---------- users ----------

export interface AdminUserListRow {
  id: string;
  name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  gender?: string | null;
  age?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  religion?: string | null;
  caste?: string | null;
  education?: string | null;
  occupation?: string | null;
  role?: string | null;
  account_status?: string | null;
  is_banned?: boolean;
  is_premium?: boolean;
  verified?: boolean;
  profile_photo?: string | null;
  last_active_at?: string | null;
  created_at?: string | null;
}

export interface AdminUserDetail {
  id: string;
  email?: string | null;
  phone_number?: string | null;
  account_status: string;
  role: string;
  is_banned: boolean;
  banned_at?: string | null;
  suspended_at?: string | null;
  suspended_until?: string | null;
  suspended_reason?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  last_login_at?: string | null;
  last_active_at?: string | null;
  created_at?: string | null;
  profile?: Record<string, unknown> | null;
  is_premium?: boolean;
  subscription?: Record<string, unknown> | null;
}

// ---------- reports / moderation ----------

export interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reporter_name?: string | null;
  reported_name?: string | null;
  reason: string;
  description?: string | null;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
}

export interface ReportDetail extends ReportRow {
  reporter_email?: string | null;
  reported_email?: string | null;
  evidence?: Record<string, unknown> | null;
  history: Record<string, unknown>[];
}

export interface PhotoRow {
  id: string;
  user_id: string;
  user_name?: string | null;
  url?: string | null;
  thumbnail_url?: string | null;
  verification_status: string;
  mime_type?: string | null;
  is_profile_photo?: boolean;
  uploaded_at?: string | null;
  created_at?: string | null;
}

// ---------- job verification ----------

export interface JobVerificationRow {
  id: string;
  user_id: string;
  user_name?: string | null;
  employment_type: string;
  employer_name: string;
  job_title?: string | null;
  country?: string | null;
  verification_status: string;
  amount_paid?: number | null;
  currency?: string | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  expires_at?: string | null;
  reviewer_notes?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
}

// ---------- matches ----------

export interface MatchRow {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_name?: string | null;
  user2_name?: string | null;
  status: string;
  matched_at?: string | null;
  unmatched_at?: string | null;
  created_at?: string | null;
}

// ---------- messages ----------

export interface ConversationRow {
  id: string;
  participant_ids: string[];
  participants: { user_id: string; email?: string | null; phone_number?: string | null }[];
  last_message_at?: string | null;
  message_count: number;
  created_at?: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: string;
  body?: string | null;
  media_url?: string | null;
  created_at?: string | null;
  read_at?: string | null;
}

// ---------- payments ----------

export interface PaymentRow {
  id: string;
  user_id: string;
  user_name?: string | null;
  amount: number;
  currency: string;
  payment_type: string;
  status: string;
  provider: string;
  provider_payment_id?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
}

export interface PaymentDetail extends PaymentRow {
  meta?: Record<string, unknown> | null;
}

// ---------- subscriptions ----------

export interface SubscriptionRow {
  id: string;
  user_id: string;
  user_name?: string | null;
  plan_id?: string | null;
  plan_name?: string | null;
  status: string;
  starts_at?: string | null;
  expires_at?: string | null;
  auto_renew?: boolean;
  provider?: string | null;
  created_at?: string | null;
}

export interface SubscriptionPlanRow {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  duration_days: number;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at?: string | null;
}

// ---------- notifications ----------

export interface CampaignRow {
  id: string;
  title: string;
  message: string;
  channel: string;
  audience: Record<string, unknown>;
  status: string;
  target_count?: number | null;
  delivered_count: number;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

// ---------- audit ----------

export interface AuditRow {
  id: string;
  action: string;
  actor_user_id?: string | null;
  actor_name?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
}

// ---------- admin users / app config ----------

export interface AdminUserRow {
  id: string;
  email?: string | null;
  name?: string | null;
  role: string;
  account_status: string;
  is_banned?: boolean;
  two_factor_enabled?: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface AppConfigRow {
  key: string;
  value: unknown;
  value_type: string;
  category: string;
  is_public: boolean;
  is_active: boolean;
  description?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
}
