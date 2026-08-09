"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { useToast } from "@/components/ui/toast";
import { PermissionGate } from "@/components/permission-gate";
import { fetchAdminUsers, adminUserActions } from "@/lib/api/ops";
import type { AdminUserRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const ROLES = ["MODERATOR", "VERIFIER", "SUPPORT", "FINANCE", "ANALYST", "ADMIN", "SUPER_ADMIN"];

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.string(),
});

type CreateValues = z.infer<typeof createSchema>;

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ type: "disable" | "enable" | "reset2fa" | "revoke"; user: AdminUserRow } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => fetchAdminUsers({ limit: 25, offset: (page - 1) * 25 }),
  });

  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    refetch();
  };

  const onCreate = async (values: CreateValues) => {
    try {
      await adminUserActions.create({ email: values.email, password: values.password || undefined, role: values.role });
      toast({ variant: "success", title: "Admin created" });
      setCreateOpen(false);
      form.reset();
      invalidate();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to create admin", description: err instanceof Error ? err.message : undefined });
    }
  };

  const runConfirm = async (fn: () => Promise<unknown>, message: string) => {
    if (!confirm) return;
    try {
      await fn();
      toast({ variant: "success", title: message });
      setConfirm(null);
      invalidate();
    } catch (err) {
      toast({ variant: "destructive", title: "Action failed", description: err instanceof Error ? err.message : undefined });
    }
  };

  const columns = useMemo<DataTableColumn<AdminUserRow>[]>(
    () => [
      { key: "email", label: "Name", cell: (row) => <span className="font-medium">{row.email ?? "—"}</span> },
      { key: "role", label: "Role", cell: (row) => <Badge variant={row.role === "SUPER_ADMIN" ? "success" : "secondary"}>{row.role}</Badge> },
      { key: "status", label: "Status", cell: (row) => <StatusBadge status={row.account_status} /> },
      { key: "2fa", label: "2FA", cell: (row) => <Badge variant={row.two_factor_enabled ? "success" : "neutral"}>{row.two_factor_enabled ? "Enabled" : "Disabled"}</Badge> },
      { key: "last_login", label: "Last Login", cell: (row) => formatDate(row.last_login_at) },
      { key: "created", label: "Created", cell: (row) => formatDate(row.created_at) },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) => (
          <PermissionGate permission="admin_users.manage">
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: "reset2fa", user: row })}>Reset 2FA</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: "revoke", user: row })}>Revoke sessions</Button>
              {row.account_status === "SUSPENDED" ? (
                <Button variant="outline" size="sm" onClick={() => setConfirm({ type: "enable", user: row })}>Enable</Button>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => setConfirm({ type: "disable", user: row })}>Disable</Button>
              )}
            </div>
          </PermissionGate>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin Users"
        description="Manage administrator accounts"
        breadcrumbs={[{ label: "System" }, { label: "Admin Users" }]}
        actions={
          <PermissionGate permission="admin_users.manage">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create admin
            </Button>
          </PermissionGate>
        }
      />

      {error ? (
        <ErrorState title="Unable to load admin users" error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          total={data?.meta.total ?? 0}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          loading={isLoading}
          emptyTitle="No admin users"
          emptyDescription="Create an administrator to get started."
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create admin user</DialogTitle>
            <DialogDescription>If the email exists, the account is promoted; otherwise a new account is created.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password (new accounts only)</Label>
              <Input id="password" type="password" {...form.register("password")} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.watch("role")} onValueChange={(v) => form.setValue("role", v)}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create admin</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={() => setConfirm(null)}
          title={
            confirm.type === "disable" ? "Disable admin" :
            confirm.type === "enable" ? "Enable admin" :
            confirm.type === "reset2fa" ? "Reset two-factor" : "Revoke sessions"
          }
          description={`Apply to ${confirm.user.email}? This action is audited.`}
          confirmLabel={
            confirm.type === "disable" ? "Disable" :
            confirm.type === "enable" ? "Enable" :
            confirm.type === "reset2fa" ? "Reset 2FA" : "Revoke sessions"
          }
          confirmPhrase={confirm.type === "disable" ? "DISABLE" : undefined}
          destructive={confirm.type === "disable"}
          onConfirm={() => {
            const u = confirm.user;
            if (confirm.type === "disable") return runConfirm(() => adminUserActions.disable(u.id, "Disabled by admin"), "Admin disabled");
            if (confirm.type === "enable") return runConfirm(() => adminUserActions.enable(u.id), "Admin enabled");
            if (confirm.type === "reset2fa") return runConfirm(() => adminUserActions.reset2fa(u.id), "Two-factor reset");
            return runConfirm(() => adminUserActions.revokeSessions(u.id), "Sessions revoked");
          }}
        />
      )}
    </div>
  );
}
