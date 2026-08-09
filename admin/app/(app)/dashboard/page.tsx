"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  HeartHandshake,
  ShieldAlert,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  fetchActionCenter,
  fetchDashboardSummary,
  fetchEngagement,
  fetchModeration,
  fetchRecentActivity,
  fetchRevenue,
  fetchUserGrowth,
} from "@/lib/api/users";
import { formatCurrency, initials, relativeTime, titleCase } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";

const RANGE = "7d";

function SummaryCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="mt-1 h-6 w-20" /> : <p className="text-2xl font-bold">{value}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { hasAnyPermission } = useAuth();
  const canSeeUsers = hasAnyPermission("users.read", "analytics.read");
  const canSeeRevenue = hasAnyPermission("payments.read", "analytics.read");
  const canSeeReports = hasAnyPermission("reports.read", "analytics.read");

  const summary = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary, enabled: canSeeUsers });
  const actionCenter = useQuery({ queryKey: ["dashboard-action-center"], queryFn: fetchActionCenter, enabled: canSeeUsers });
  const recent = useQuery({ queryKey: ["dashboard-recent"], queryFn: () => fetchRecentActivity(20), enabled: canSeeUsers });
  const growth = useQuery({ queryKey: ["dashboard-growth", RANGE], queryFn: () => fetchUserGrowth(RANGE), enabled: canSeeUsers });
  const engagement = useQuery({ queryKey: ["dashboard-engagement", RANGE], queryFn: () => fetchEngagement(RANGE), enabled: canSeeUsers });
  const revenue = useQuery({ queryKey: ["dashboard-revenue", RANGE], queryFn: () => fetchRevenue(RANGE), enabled: canSeeRevenue });
  const moderation = useQuery({ queryKey: ["dashboard-moderation", RANGE], queryFn: () => fetchModeration(RANGE), enabled: canSeeUsers });

  if (summary.error && !summary.data) {
    return (
      <ErrorState
        title="Unable to load the dashboard"
        error={summary.error}
        onRetry={() => summary.refetch()}
      />
    );
  }

  const s = summary.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operational overview of the Matchmaking platform"
        breadcrumbs={[{ label: "Dashboard" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Users" value={s ? s.total_users.toLocaleString() : "—"} icon={Users} loading={!s} />
        <SummaryCard label="New Users Today" value={s ? s.new_users_today.toLocaleString() : "—"} icon={UserPlus} loading={!s} />
        <SummaryCard label="Active Users Today" value={s ? s.active_users_today.toLocaleString() : "—"} icon={Activity} loading={!s} />
        <SummaryCard label="New Matches Today" value={s ? s.new_matches_today.toLocaleString() : "—"} icon={HeartHandshake} loading={!s} />
        <SummaryCard label="Pending Verifications" value={s ? s.pending_verifications.toLocaleString() : "—"} icon={BadgeCheck} loading={!s} />
        <SummaryCard label="Open Reports" value={s ? s.open_reports.toLocaleString() : "—"} icon={ShieldAlert} loading={!s} />
        <SummaryCard label="Today's Revenue" value={s ? formatCurrency(s.today_revenue) : "—"} icon={Wallet} loading={!s} />
        <SummaryCard label="Active Premium" value={s ? s.active_premium_subscriptions.toLocaleString() : "—"} icon={BadgeCheck} loading={!s} />
      </div>

      {/* Action center */}
      <Card>
        <CardHeader>
          <CardTitle>Action Center</CardTitle>
          <CardDescription>Items that need your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {actionCenter.data?.map((item) => (
              <Link
                key={item.key}
                href={item.link}
                className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="text-2xl font-bold">{item.count.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
            {!actionCenter.data && !actionCenter.isLoading && (
              <p className="col-span-full text-sm text-muted-foreground">No pending actions.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>New registrations over the last {RANGE}</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Registrations" stroke="#7C3AED" fill="#7C3AED33" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
            <CardDescription>Swipes, likes, matches and messages</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagement.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="swipes" stroke="#7C3AED" name="Swipes" />
                <Line type="monotone" dataKey="likes" stroke="#EC4899" name="Likes" />
                <Line type="monotone" dataKey="matches" stroke="#10B981" name="Matches" />
                <Line type="monotone" dataKey="messages" stroke="#F59E0B" name="Messages" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Confirmed payments over the last {RANGE}</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moderation</CardTitle>
            <CardDescription>Reports, suspensions and bans</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moderation.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="reports" name="Reports" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="suspensions" name="Suspensions" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bans" name="Bans" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest audit events across the platform</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/audit-logs">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.data?.length ? (
            <ul className="divide-y">
              {recent.data.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-secondary text-xs">{initials(item.actor_name ?? "?")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{item.actor_name ?? "System"}</span>{" "}
                      <span className="text-muted-foreground">{titleCase(item.action).toLowerCase()}</span>
                      {item.entity_type && <span className="text-muted-foreground"> · {titleCase(item.entity_type)}</span>}
                    </p>
                  </div>
                  <StatusBadge status={item.action} className="hidden sm:inline-flex" />
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(item.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No recent activity.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
