"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PermissionGate } from "@/components/permission-gate";
import { useToast } from "@/components/ui/toast";
import { fetchPayments, refundPayment } from "@/lib/api/ops";
import type { PaymentRow } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;
const TABS = [
  { key: "ALL", label: "All", status: undefined },
  { key: "SUCCESS", label: "Successful", status: "SUCCESS" },
  { key: "PENDING", label: "Pending", status: "PENDING" },
  { key: "FAILED", label: "Failed", status: "FAILED" },
  { key: "REFUNDED", label: "Refunded", status: "REFUNDED" },
];

export default function PaymentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [refund, setRefund] = useState<PaymentRow | null>(null);

  const status = TABS.find((t) => t.key === tab)?.status;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["payments", tab, page, search],
    queryFn: () =>
      fetchPayments({
        status: status || undefined,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
  });

  const doRefund = async () => {
    if (!refund) return;
    try {
      await refundPayment(refund.id, "Refunded by admin");
      toast({ variant: "success", title: "Payment refunded" });
      setRefund(null);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      refetch();
    } catch (err) {
      toast({ variant: "destructive", title: "Refund failed", description: err instanceof Error ? err.message : undefined });
    }
  };

  const columns = useMemo<DataTableColumn<PaymentRow>[]>(
    () => [
      { key: "id", label: "Payment ID", cell: (row) => <span className="font-mono text-xs">{row.id.slice(0, 8)}</span> },
      { key: "user", label: "User", cell: (row) => <span className="font-medium">{row.user_name ?? row.user_id}</span> },
      { key: "amount", label: "Amount", cell: (row) => <span className="font-medium">{formatCurrency(row.amount, row.currency)}</span> },
      { key: "type", label: "Product", cell: (row) => <Badge variant="outline">{row.payment_type}</Badge> },
      { key: "provider", label: "Provider", cell: (row) => row.provider },
      { key: "status", label: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      { key: "created", label: "Created", cell: (row) => formatDate(row.created_at) },
      { key: "completed", label: "Completed", cell: (row) => formatDate(row.paid_at) },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) =>
          row.status === "SUCCESS" ? (
            <PermissionGate permission="payments.refund">
              <Button variant="ghost" size="sm" onClick={() => setRefund(row)}>
                <RotateCcw className="mr-1 h-4 w-4" /> Refund
              </Button>
            </PermissionGate>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description="Transactions across the platform" breadcrumbs={[{ label: "Payments" }]} />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <ErrorState title="Unable to load payments" error={error} onRetry={() => refetch()} />
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
          searchPlaceholder="Search by user or payment id…"
          emptyTitle="No payments found"
          emptyDescription="There are no payments matching the current filters."
          onRefresh={() => refetch()}
        />
      )}

      {refund && (
        <ConfirmDialog
          open
          onOpenChange={() => setRefund(null)}
          title="Refund payment"
          description={`Refund ${formatCurrency(refund.amount, refund.currency)} to ${refund.user_name ?? refund.user_id}? This action is audited.`}
          confirmLabel="Refund"
          confirmPhrase="REFUND"
          destructive
          onConfirm={doRefund}
        />
      )}
    </div>
  );
}
