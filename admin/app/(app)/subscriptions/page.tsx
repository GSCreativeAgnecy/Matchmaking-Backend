"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { fetchSubscriptions } from "@/lib/api/ops";
import type { SubscriptionRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function SubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["subscriptions", page, search, status],
    queryFn: () =>
      fetchSubscriptions({
        search: search || undefined,
        status: status || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
  });

  const columns = useMemo<DataTableColumn<SubscriptionRow>[]>(
    () => [
      { key: "user", label: "User", cell: (row) => <span className="font-medium">{row.user_name ?? row.user_id}</span> },
      { key: "plan", label: "Plan", cell: (row) => <span>{row.plan_name ?? "—"}</span> },
      { key: "status", label: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      { key: "starts", label: "Starts", cell: (row) => formatDate(row.starts_at) },
      { key: "expires", label: "Expires", cell: (row) => formatDate(row.expires_at) },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) => (
          <Link href={`/users/${row.user_id}`} className="inline-flex items-center text-primary hover:underline">
            View user <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscriptions"
        description="Active and historical subscriptions"
        breadcrumbs={[{ label: "Subscriptions" }]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/subscriptions/plans">Manage plans</Link>
          </Button>
        }
      />

      <div className="max-w-xs">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAST_DUE">Past due</SelectItem>
            <SelectItem value="CANCELED">Canceled</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <ErrorState title="Unable to load subscriptions" error={error} onRetry={() => refetch()} />
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
          searchPlaceholder="Search by user or plan…"
          emptyTitle="No subscriptions found"
          emptyDescription="There are no subscriptions matching the current filters."
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
}
