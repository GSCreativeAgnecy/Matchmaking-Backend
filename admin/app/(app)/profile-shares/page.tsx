"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { apiGet } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;

interface ShareRow {
  id: string;
  owner_user_id: string;
  shared_with_user_id: string;
  owner_email?: string | null;
  shared_email?: string | null;
  permission: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  created_at?: string | null;
}

export default function ProfileSharesPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["profile-shares", page],
    queryFn: async () => {
      const res = await apiGet<{ data: ShareRow[]; meta: { total: number } }>(
        `/admin/profile-shares?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`,
      );
      return { rows: res.data, meta: { ...res.meta, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE } };
    },
  });

  const columns = useMemo<DataTableColumn<ShareRow>[]>(
    () => [
      { key: "owner", label: "Owner", cell: (row) => <span className="font-medium">{row.owner_email ?? row.owner_user_id}</span> },
      { key: "shared", label: "Shared With", cell: (row) => <span>{row.shared_email ?? row.shared_with_user_id}</span> },
      { key: "permission", label: "Permission", cell: (row) => <Badge variant="secondary">{row.permission}</Badge> },
      { key: "expires", label: "Expires", cell: (row) => formatDate(row.expires_at) },
      { key: "revoked", label: "Revoked", cell: (row) => formatDate(row.revoked_at) },
      { key: "created", label: "Created", cell: (row) => formatDate(row.created_at) },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profile Shares"
        description="Profiles shared between users"
        breadcrumbs={[{ label: "Profile Shares" }]}
      />

      {error ? (
        <ErrorState title="Unable to load profile shares" error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          total={data?.meta.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          loading={isLoading}
          emptyTitle="No profile shares found"
          emptyDescription="There are no profile shares to display."
        />
      )}
    </div>
  );
}
