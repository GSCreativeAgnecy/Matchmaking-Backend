"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { fetchAuditLogs } from "@/lib/api/ops";
import type { AuditRow } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

const PAGE_SIZE = 50;

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["audit", page, search, action],
    queryFn: () =>
      fetchAuditLogs({
        q: search || undefined,
        action: action || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
  });

  const columns = useMemo<DataTableColumn<AuditRow>[]>(
    () => [
      { key: "time", label: "Timestamp", cell: (row) => <span className="whitespace-nowrap">{formatDate(row.created_at)}</span> },
      { key: "admin", label: "Admin", cell: (row) => <span className="font-medium">{row.actor_name ?? "System"}</span> },
      { key: "action", label: "Action", cell: (row) => <Badge variant="secondary">{row.action}</Badge> },
      { key: "entity", label: "Entity", cell: (row) => <span className="text-sm">{row.entity_type ?? "—"}</span> },
      { key: "entity_id", label: "Entity ID", cell: (row) => <span className="font-mono text-xs">{row.entity_id ?? "—"}</span> },
      {
        key: "details",
        label: "Details",
        cell: (row) => (
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">view</summary>
            <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(row.details, null, 2)}</pre>
          </details>
        ),
      },
      { key: "ip", label: "IP", cell: (row) => <span className="text-xs text-muted-foreground">{row.ip_address ?? "—"}</span> },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Logs"
        description="Read-only record of all sensitive actions"
        breadcrumbs={[{ label: "Audit Logs" }]}
        actions={
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            <option value="admin.ban">admin.ban</option>
            <option value="admin.suspend">admin.suspend</option>
            <option value="admin.delete_user">admin.delete_user</option>
            <option value="admin.message_view">admin.message_view</option>
            <option value="admin.role_change">admin.role_change</option>
            <option value="payment.refund">payment.refund</option>
            <option value="verification.review">verification.review</option>
          </select>
        }
      />

      {error ? (
        <ErrorState title="Unable to load audit logs" error={error} onRetry={() => refetch()} />
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
          searchPlaceholder="Search action, admin, entity…"
          emptyTitle="No audit records found"
          emptyDescription="There are no events matching the current filters."
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
}
