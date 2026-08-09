"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAnalytics } from "@/lib/api/ops";
import { formatCurrency, titleCase } from "@/lib/utils";

const RANGES = ["today", "7d", "30d", "90d"];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Section({ title, description, data, keys }: { title: string; description: string; data?: Record<string, unknown>; keys: string[] }) {
  const stats = keys.map((k) => ({ k, v: data?.[k] }));
  const series = (data?.series ?? []) as Array<Record<string, unknown>>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(({ k, v }) => (
            <StatCard
              key={k}
              label={titleCase(k).replace(/_/g, " ")}
              value={
                typeof v === "number"
                  ? Number.isInteger(v)
                    ? v.toLocaleString()
                    : `${v}%`
                  : typeof v === "string"
                    ? formatCurrency(v)
                    : "—"
              }
            />
          ))}
        </div>
        {series.length > 0 && (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {Object.keys(series[0] ?? {})
                  .filter((k) => k !== "bucket")
                  .map((k, i) => (
                    <Line key={k} type="monotone" dataKey={k} stroke={["#7C3AED", "#EC4899", "#10B981", "#F59E0B"][i % 4]} name={titleCase(k)} />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");

  const users = useQuery({ queryKey: ["analytics-users", range], queryFn: () => fetchAnalytics("users", range) });
  const engagement = useQuery({ queryKey: ["analytics-engagement", range], queryFn: () => fetchAnalytics("engagement", range) });
  const matching = useQuery({ queryKey: ["analytics-matching", range], queryFn: () => fetchAnalytics("matching", range) });
  const revenue = useQuery({ queryKey: ["analytics-revenue", range], queryFn: () => fetchAnalytics("revenue", range) });
  const moderation = useQuery({ queryKey: ["analytics-moderation", range], queryFn: () => fetchAnalytics("moderation", range) });

  if (users.error && !users.data) {
    return <ErrorState title="Unable to load analytics" error={users.error} onRetry={() => users.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        description="Platform metrics computed server-side"
        breadcrumbs={[{ label: "Analytics" }]}
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => <SelectItem key={r} value={r}>{r === "today" ? "Today" : `Last ${r.replace("d", " days")}`}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Section title="Users" description="Signups, activity and retention" data={users.data} keys={["total_users", "new_users", "active_users", "retention", "dau", "wau", "mau"]} />
          <Section title="Engagement" description="Product usage" data={engagement.data} keys={["swipes", "likes", "matches", "messages"]} />
          <Section title="Matching" description="Funnel conversion" data={matching.data} keys={["likes", "matches", "messages", "like_to_match_rate", "match_to_conversation_rate"]} />
        </div>
        <div className="space-y-4">
          <Section title="Revenue" description="Money movement" data={revenue.data} keys={["revenue", "premium_conversion_rate", "premium_users", "subscription_revenue", "job_verification_revenue", "refunds"]} />
          <Section title="Moderation" description="Safety and enforcement" data={moderation.data} keys={["reports", "bans", "suspensions", "verification_queue"]} />
        </div>
      </div>
    </div>
  );
}
