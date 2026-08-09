"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HeartHandshake } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";
import { fetchMatches } from "@/lib/api/ops";
import type { MatchRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function MatchesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["matches", page, search, status],
    queryFn: () =>
      fetchMatches({
        search: search || undefined,
        status: status || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
  });

  const columns = useMemo<DataTableColumn<MatchRow>[]>(
    () => [
      {
        key: "pair",
        label: "User A ⇄ User B",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.user1_name ?? row.user1_id}</span>
            <HeartHandshake className="h-4 w-4 text-primary" />
            <span className="font-medium">{row.user2_name ?? row.user2_id}</span>
          </div>
        ),
      },
      { key: "matched", label: "Matched At", cell: (row) => formatDate(row.matched_at) },
      { key: "status", label: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      { key: "unmatched", label: "Unmatched At", cell: (row) => formatDate(row.unmatched_at) },
      { key: "created", label: "Created", cell: (row) => formatDate(row.created_at) },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Matches"
        description="Search matches between users"
        breadcrumbs={[{ label: "Matches" }]}
        actions={
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="UNMATCHED">Unmatched</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {error ? (
        <ErrorState title="Unable to load matches" error={error} onRetry={() => refetch()} />
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
          searchPlaceholder="Search by user email…"
          emptyTitle="No matches found"
          emptyDescription="No matches match the current filters."
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
}
