"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, ShieldAlert } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
import { fetchConversations, fetchConversation } from "@/lib/api/ops";
import type { ConversationRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { ForbiddenState } from "@/components/permission-gate";

const PAGE_SIZE = 25;

export default function MessagesPage() {
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<ConversationRow | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["conversations", page, search],
    queryFn: () =>
      fetchConversations({ search: search || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    enabled: hasPermission("messages.read_private") || hasPermission("users.read"),
  });

  const conversation = useQuery({
    queryKey: ["conversation", viewing?.id],
    queryFn: () => fetchConversation(viewing!.id),
    enabled: Boolean(viewing),
  });

  const columns = useMemo<DataTableColumn<ConversationRow>[]>(
    () => [
      {
        key: "participants",
        label: "Participants",
        cell: (row) => (
          <div className="flex flex-col">
            {row.participants.map((p) => (
              <span key={p.user_id} className="text-sm">{p.email ?? p.phone_number ?? p.user_id}</span>
            ))}
          </div>
        ),
      },
      { key: "messages", label: "Messages", cell: (row) => row.message_count },
      { key: "last", label: "Last Message", cell: (row) => formatDate(row.last_message_at) },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) => (
          <Button variant="ghost" size="sm" onClick={() => setViewing(row)} disabled={!hasPermission("messages.read_private")}>
            <Eye className="mr-1 h-4 w-4" /> View
          </Button>
        ),
      },
    ],
    [hasPermission],
  );

  if (!hasPermission("messages.read_private")) {
    return (
      <div className="space-y-4">
        <PageHeader title="Messages" description="Investigate private conversations" breadcrumbs={[{ label: "Messages" }]} />
        <ForbiddenState title="You do not have permission to inspect conversations" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        description="Conversation investigation. Every access is audited."
        breadcrumbs={[{ label: "Messages" }]}
        actions={
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="h-4 w-4" /> Access is logged in the audit trail
          </span>
        }
      />

      {error ? (
        <ErrorState title="Unable to load conversations" error={error} onRetry={() => refetch()} />
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
          searchPlaceholder="Search by participant email…"
          emptyTitle="No conversations found"
          emptyDescription="Try a different search."
          onRefresh={() => refetch()}
        />
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setViewing(null)} aria-hidden />
          <Card className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Conversation {viewing.id.slice(0, 8)}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>Close</Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <p className="mb-4 flex items-center gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                <ShieldAlert className="h-4 w-4" /> You are viewing private messages. This access has been recorded.
              </p>
              {conversation.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <div className="space-y-2">
                  {((conversation.data?.messages ?? []) as Array<Record<string, unknown>>).map((m) => (
                    <div key={String(m.id)} className="rounded-md border p-3">
                      <p className="text-sm">{String(m.body ?? "")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        From {String(m.sender_id).slice(0, 8)} · {formatDate(String(m.created_at ?? ""))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
