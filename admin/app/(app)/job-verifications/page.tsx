"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, HelpCircle } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { fetchJobVerifications, verificationActions } from "@/lib/api/ops";
import type { JobVerificationRow } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;
const TABS = [
  { key: "PENDING_PAYMENT", label: "Pending Payment", status: "PENDING_PAYMENT" },
  { key: "UNDER_REVIEW", label: "Under Review", status: "UNDER_REVIEW" },
  { key: "VERIFIED", label: "Verified", status: "VERIFIED" },
  { key: "REJECTED", label: "Rejected", status: "REJECTED" },
  { key: "EXPIRED", label: "Expired", status: "EXPIRED" },
];

export default function JobVerificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("UNDER_REVIEW");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<{ type: "approve" | "reject" | "info"; row: JobVerificationRow } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["job-verifications", tab, page, search],
    queryFn: () =>
      fetchJobVerifications({ status: tab, search: search || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });

  const doAction = async () => {
    if (!action) return;
    try {
      if (action.type === "approve") {
        await verificationActions.review(action.row.id, { approve: true, admin_notes: "Approved by admin" });
      } else if (action.type === "reject") {
        await verificationActions.review(action.row.id, { approve: false, rejection_reason: "Documents could not be verified" });
      } else {
        await verificationActions.requestInfo(action.row.id, "Please provide additional documents");
      }
      toast({ variant: "success", title: "Verification updated" });
      setAction(null);
      queryClient.invalidateQueries({ queryKey: ["job-verifications"] });
      refetch();
    } catch (err) {
      toast({ variant: "destructive", title: "Action failed", description: err instanceof Error ? err.message : undefined });
    }
  };

  const columns = useMemo<DataTableColumn<JobVerificationRow>[]>(
    () => [
      { key: "user", label: "User", cell: (row) => <span className="font-medium">{row.user_name ?? row.user_id}</span> },
      { key: "employer", label: "Employer", cell: (row) => row.employer_name },
      { key: "job_title", label: "Position", cell: (row) => row.job_title ?? "—" },
      { key: "type", label: "Type", cell: (row) => <Badge variant="outline">{row.employment_type}</Badge> },
      { key: "country", label: "Country", cell: (row) => row.country ?? "—" },
      {
        key: "amount",
        label: "Paid",
        cell: (row) => (row.amount_paid != null ? formatCurrency(row.amount_paid, row.currency ?? "INR") : "—"),
      },
      { key: "status", label: "Status", cell: (row) => <StatusBadge status={row.verification_status} /> },
      { key: "submitted", label: "Submitted", cell: (row) => formatDate(row.submitted_at) },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) =>
          row.verification_status === "UNDER_REVIEW" ? (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => setAction({ type: "approve", row })}>
                <Check className="h-4 w-4 text-emerald-500" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAction({ type: "reject", row })}>
                <X className="h-4 w-4 text-red-500" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAction({ type: "info", row })}>
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Job Verification"
        description="Review employment verification requests"
        breadcrumbs={[{ label: "Job Verification" }]}
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <ErrorState title="Unable to load verifications" error={error} onRetry={() => refetch()} />
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
          emptyTitle="No verifications in this queue"
          emptyDescription="There are currently no requests with this status."
          onRefresh={() => refetch()}
        />
      )}

      {action && (
        <ConfirmDialog
          open
          onOpenChange={() => setAction(null)}
          title={
            action.type === "approve"
              ? "Approve verification"
              : action.type === "reject"
                ? "Reject verification"
                : "Request more information"
          }
          description={
            action.type === "approve"
              ? "Mark this employment verification as approved. The user's profile will show it as verified."
              : action.type === "reject"
                ? "Reject this verification. The user will be notified with the rejection reason."
                : "Ask the user for additional documents. They will be notified."
          }
          confirmLabel={action.type === "approve" ? "Approve" : action.type === "reject" ? "Reject" : "Request info"}
          confirmPhrase={action.type === "reject" ? "REJECT" : undefined}
          destructive={action.type === "reject"}
          onConfirm={doAction}
        />
      )}
    </div>
  );
}
