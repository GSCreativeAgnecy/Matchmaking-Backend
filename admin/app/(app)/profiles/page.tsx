"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { fetchProfiles } from "@/lib/api/ops";
import { formatDate, titleCase } from "@/lib/utils";

const PAGE_SIZE = 25;
const TABS = [
  { key: "ALL", label: "All Profiles", params: {} },
  { key: "INCOMPLETE", label: "Incomplete", params: { incomplete: true } },
  { key: "REPORTED", label: "Reported", params: { reported: true } },
  { key: "PENDING", label: "Pending Review", params: { review_status: "PENDING" } },
  { key: "RECENT", label: "Recently Updated", params: { recently_updated: true } },
];

export default function ProfilesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const params = TABS.find((t) => t.key === tab)?.params ?? {};

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["profiles", tab, page, search],
    queryFn: () =>
      fetchProfiles({ ...params, search: search || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });

  const columns = useMemo<DataTableColumn<Record<string, unknown>>[]>(
    () => [
      {
        key: "name",
        label: "Name",
        cell: (row) => (
          <Link href={`/users/${row.user_id}`} className="font-medium hover:underline">
            {row.name as string ?? "—"}
          </Link>
        ),
      },
      { key: "email", label: "Email", cell: (row) => <span className="text-sm">{row.email as string}</span> },
      { key: "gender", label: "Gender", cell: (row) => titleCase(row.gender as string) },
      { key: "age", label: "Age", cell: (row) => String(row.age ?? "—") },
      { key: "city", label: "City", cell: (row) => row.city as string },
      { key: "occupation", label: "Occupation", cell: (row) => row.occupation as string },
      {
        key: "completeness",
        label: "Completeness",
        cell: (row) => {
          const pct = row.completeness as number;
          const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
          return (
            <div className="flex items-center gap-2">
              <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{pct}%</span>
            </div>
          );
        },
      },
      { key: "review", label: "Review Status", cell: (row) => <StatusBadge status={row.review_status as string} /> },
      { key: "updated", label: "Updated", cell: (row) => formatDate(row.updated_at as string) },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) => (
          <Link href={`/users/${row.user_id}`} className="inline-flex items-center text-primary hover:underline">
            View <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profiles"
        description="Review and moderate member profiles"
        breadcrumbs={[{ label: "Profiles" }]}
        actions={<Badge variant="secondary">{data?.meta.total ?? 0} profiles</Badge>}
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <ErrorState title="Unable to load profiles" error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          total={data?.meta.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          loading={isLoading}
          search={search}
          onSearch={setSearch}
          emptyTitle="No profiles found"
          emptyDescription="Try a different filter or search term."
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
}
