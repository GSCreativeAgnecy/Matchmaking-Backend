"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PermissionGate } from "@/components/permission-gate";
import { useToast } from "@/components/ui/toast";
import { fetchReports, reportActions } from "@/lib/api/ops";
import type { ReportRow } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

const PAGE_SIZE = 25;
const TABS = [
  { key: "OPEN", label: "Open", status: "PENDING,UNDER_REVIEW,ESCALATED" },
  { key: "INVESTIGATING", label: "Investigating", status: "UNDER_REVIEW" },
  { key: "RESOLVED", label: "Resolved", status: "RESOLVED" },
  { key: "DISMISSED", label: "Dismissed", status: "DISMISSED" },
  { key: "ESCALATED", label: "Escalated", status: "ESCALATED" },
];

export default function ReportsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("OPEN");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [action, setAction] = useState<{ type: string; report: ReportRow } | null>(null);

  const status = TABS.find((t) => t.key === tab)?.status;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", tab, page, search],
    queryFn: () =>
      fetchReports({
        status,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    refetch();
  };

  const doAction = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast({ variant: "success", title: message });
      setAction(null);
      invalidate();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const columns = useMemo<DataTableColumn<ReportRow>[]>(
    () => [
      {
        key: "reported",
        label: "Reported User",
        cell: (row) => <span className="font-medium">{row.reported_name ?? row.reported_user_id}</span>,
      },
      { key: "reason", label: "Reason", cell: (row) => <Badge variant="outline">{titleCase(row.reason)}</Badge> },
      {
        key: "description",
        label: "Description",
        cell: (row) => <span className="line-clamp-1 text-muted-foreground">{row.description ?? "—"}</span>,
      },
      {
        key: "reporter",
        label: "Reporter",
        cell: (row) => <span className="text-sm">{row.reporter_name ?? "—"}</span>,
      },
      { key: "status", label: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      { key: "created", label: "Created", cell: (row) => formatDate(row.created_at) },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) => (
          <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>
            <Eye className="mr-1 h-4 w-4" /> Review
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Moderation"
        description="Investigate and resolve user reports"
        breadcrumbs={[{ label: "Reports & Moderation" }]}
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <ErrorState title="Unable to load reports" error={error} onRetry={() => refetch()} />
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
          emptyTitle="No reports found"
          emptyDescription="There are currently no reports in this queue."
          onRefresh={() => refetch()}
        />
      )}

      {/* Detail dialog */}
      {selected && <ReportDetailDialog report={selected} onClose={() => setSelected(null)} onAction={setAction} />}

      {action && (
        <ConfirmDialog
          open
          onOpenChange={() => setAction(null)}
          title={titleCase(action.type)}
          description={
            action.type === "warn"
              ? "Send a warning notification to the reported user."
              : action.type === "ban"
                ? "Ban the reported user and resolve the report."
                : action.type === "suspend"
                  ? "Suspend the reported user and resolve the report."
                  : `Transition the report to ${titleCase(action.type)}.`
          }
          confirmLabel={titleCase(action.type)}
          confirmPhrase={action.type === "ban" ? "BAN" : action.type === "suspend" ? "SUSPEND" : undefined}
          destructive={action.type === "ban" || action.type === "suspend"}
          onConfirm={() => {
            const r = action.report;
            if (action.type === "warn") return doAction(() => reportActions.warn(r.id, "Our moderation team reviewed your account."), "Warning sent");
            if (action.type === "ban") return doAction(() => reportActions.ban(r.id, { reason: "Confirmed violation" }), "User banned");
            if (action.type === "suspend") return doAction(() => reportActions.suspend(r.id, { reason: "Suspended following review" }), "User suspended");
            return doAction(() => reportActions.transition(r.id, action.type), `Report ${titleCase(action.type).toLowerCase()}`);
          }}
        />
      )}
    </div>
  );
}

function ReportDetailDialog({
  report,
  onClose,
  onAction,
}: {
  report: ReportRow;
  onClose: () => void;
  onAction: (action: { type: string; report: ReportRow }) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <Card className="relative z-10 w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Report {report.id.slice(0, 8)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Reporter:</span> {report.reporter_name ?? report.reporter_id}</p>
            <p><span className="text-muted-foreground">Reported:</span> {report.reported_name ?? report.reported_user_id}</p>
            <p><span className="text-muted-foreground">Reason:</span> {titleCase(report.reason)}</p>
            <p><span className="text-muted-foreground">Status:</span> <StatusBadge status={report.status} /></p>
            <p><span className="text-muted-foreground">Created:</span> {formatDate(report.created_at)}</p>
          </div>
          {report.description && (
            <div className="rounded-md bg-muted p-3 text-sm">{report.description}</div>
          )}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => onAction({ type: "UNDER_REVIEW", report })}>Investigate</Button>
            <PermissionGate permission="reports.resolve">
              <Button variant="outline" size="sm" onClick={() => onAction({ type: "warn", report })}>Warn</Button>
              <Button variant="outline" size="sm" onClick={() => onAction({ type: "suspend", report })}>Suspend</Button>
              <Button variant="destructive" size="sm" onClick={() => onAction({ type: "ban", report })}>Ban</Button>
              <Button variant="outline" size="sm" onClick={() => onAction({ type: "DISMISSED", report })}>Dismiss</Button>
              <Button variant="outline" size="sm" onClick={() => onAction({ type: "ESCALATED", report })}>Escalate</Button>
              <Button size="sm" onClick={() => onAction({ type: "RESOLVED", report })}>Resolve</Button>
            </PermissionGate>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
