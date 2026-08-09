"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { fetchPhotos, reviewPhoto } from "@/lib/api/ops";
import type { PhotoRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;
const TABS = [
  { key: "PENDING", label: "Pending", status: "PENDING" },
  { key: "VERIFIED", label: "Verified", status: "VERIFIED" },
  { key: "REJECTED", label: "Rejected", status: "REJECTED" },
  { key: "UNVERIFIED", label: "Unverified", status: "UNVERIFIED" },
];

export default function PhotosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [review, setReview] = useState<{ photo: PhotoRow; action: "approve" | "reject" | "request_replacement" } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["photos", tab, page, search],
    queryFn: () =>
      fetchPhotos({ status: tab, search: search || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });

  const doReview = async () => {
    if (!review) return;
    try {
      await reviewPhoto(review.photo.id, { action: review.action });
      toast({ variant: "success", title: `Photo ${review.action}` });
      setReview(null);
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      refetch();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to review photo", description: err instanceof Error ? err.message : undefined });
    }
  };

  const columns = useMemo<DataTableColumn<PhotoRow>[]>(
    () => [
      {
        key: "photo",
        label: "Photo",
        cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-muted">
              {row.url && <img src={row.url} alt="" className="h-full w-full object-cover" loading="lazy" />}
            </div>
            <span className="text-xs text-muted-foreground">{row.id.slice(0, 8)}</span>
          </div>
        ),
      },
      { key: "user", label: "User", cell: (row) => <span className="text-sm font-medium">{row.user_name ?? row.user_id}</span> },
      { key: "status", label: "Status", cell: (row) => <StatusBadge status={row.verification_status} /> },
      { key: "profile", label: "Profile", cell: (row) => (row.is_profile_photo ? "Yes" : "No") },
      { key: "uploaded", label: "Uploaded", cell: (row) => formatDate(row.uploaded_at) },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setReview({ photo: row, action: "approve" })}>
              <Check className="h-4 w-4 text-emerald-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReview({ photo: row, action: "reject" })}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Photo Verification"
        description="Approve or reject user photos"
        breadcrumbs={[{ label: "Photo Verification" }]}
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <ErrorState title="Unable to load photos" error={error} onRetry={() => refetch()} />
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
          emptyTitle="No photos in this queue"
          emptyDescription="There are currently no photos with this status."
          onRefresh={() => refetch()}
        />
      )}

      {review && (
        <ConfirmDialog
          open
          onOpenChange={() => setReview(null)}
          title={`${review.action === "approve" ? "Approve" : "Reject"} photo`}
          description={
            review.action === "approve"
              ? "This photo will be marked as verified."
              : "This photo will be marked as rejected and the user asked to replace it."
          }
          confirmLabel={review.action === "approve" ? "Approve" : "Reject"}
          confirmPhrase={review.action === "reject" ? "REJECT" : undefined}
          destructive={review.action !== "approve"}
          onConfirm={doReview}
        />
      )}
    </div>
  );
}
