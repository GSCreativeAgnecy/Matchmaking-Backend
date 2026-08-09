"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, RotateCcw, ShieldAlert, Trash2, UserCheck, UserCog } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/auth-context";
import { PermissionGate } from "@/components/permission-gate";
import { userActions, fetchAdminUser, fetchUserSubresource } from "@/lib/api/ops";
import { fetchAuditLogs } from "@/lib/api/ops";
import type { AdminUserDetail } from "@/lib/types";
import { formatDate, formatCurrency, titleCase } from "@/lib/utils";

function ProfileFields({ user }: { user: AdminUserDetail }) {
  const p = (user.profile ?? {}) as Record<string, unknown>;
  const rows: [string, unknown][] = [
    ["First name", p.first_name],
    ["Last name", p.last_name],
    ["Gender", p.gender],
    ["Date of birth", p.date_of_birth],
    ["Religion", p.religion],
    ["Caste", p.caste],
    ["Education", p.education],
    ["Occupation", p.occupation],
    ["Job title", p.job_title],
    ["Workplace", p.workplace],
    ["City", p.city],
    ["State", p.state],
    ["Country", p.country],
    ["Annual income", p.annual_income ? formatCurrency(p.annual_income as number, (p.income_currency as string) ?? "INR") : null],
    ["Marital status", p.marital_status],
    ["Bio", p.bio],
    ["Profile review", p.review_status],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b py-1.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value ? titleCase(String(value)) : "—"}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InfoCard({ user }: { user: AdminUserDetail }) {
  const rows: [string, unknown][] = [
    ["Email", user.email],
    ["Phone", user.phone_number],
    ["Role", user.role],
    ["Account status", user.account_status],
    ["Email verified", user.email_verified ? "Yes" : "No"],
    ["Phone verified", user.phone_verified ? "Yes" : "No"],
    ["Premium", user.is_premium ? "Yes" : "No"],
    ["Last login", formatDate(user.last_login_at)],
    ["Last active", formatDate(user.last_active_at)],
    ["Created", formatDate(user.created_at)],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b py-1.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{String(value ?? "—")}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<
    { type: "suspend" | "ban" | "unban" | "delete" | "restore" } | null
  >(null);
  const [role, setRole] = useState<string>("");

  const user = useQuery({ queryKey: ["user", params.id], queryFn: () => fetchAdminUser(params.id) });

  const tabs = useMemo(
    () => [
      { key: "profile", label: "Profile", permission: "users.read" },
      { key: "photos", label: "Photos", permission: "users.read" },
      { key: "verifications", label: "Verification", permission: "users.read" },
      { key: "activity", label: "Activity", permission: "users.read" },
      { key: "matches", label: "Matches", permission: "users.read" },
      { key: "messages", label: "Messages", permission: "users.read" },
      { key: "payments", label: "Payments", permission: "users.read" },
      { key: "reports", label: "Reports", permission: "users.read" },
      { key: "audit", label: "Audit", permission: "audit_logs.read" },
    ],
    [],
  );
  const [tab, setTab] = useState("profile");

  const subresource = useQuery({
    queryKey: ["user-sub", params.id, tab],
    queryFn: () => fetchUserSubresource(params.id, tab),
    enabled: tab !== "profile" && tab !== "audit",
  });

  const audit = useQuery({
    queryKey: ["user-audit", params.id],
    queryFn: () => fetchAuditLogs({ user_id: params.id, limit: 100 }),
    enabled: tab === "audit",
  });

  if (user.error && !user.data) {
    return <ErrorState title="Unable to load user" error={user.error} onRetry={() => user.refetch()} />;
  }

  const u = user.data;

  const runAction = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast({ variant: "success", title: message });
      setDialog(null);
      user.refetch();
    } catch (err) {
      toast({ variant: "destructive", title: "Action failed", description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={u?.email ?? "User"}
        description={u ? `Role: ${u.role} · Status: ${titleCase(u.account_status)}` : undefined}
        breadcrumbs={[{ label: "Users", href: "/users" }, { label: u?.email ?? "User" }]}
        actions={
          <>
            <PermissionGate permission="users.ban">
              {u?.is_banned ? (
                <Button variant="outline" size="sm" onClick={() => setDialog({ type: "unban" })}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Unban
                </Button>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => setDialog({ type: "ban" })}>
                  <Ban className="mr-2 h-4 w-4" /> Ban
                </Button>
              )}
            </PermissionGate>
            <PermissionGate permission="users.suspend">
              <Button variant="outline" size="sm" onClick={() => setDialog({ type: "suspend" })}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Suspend
              </Button>
            </PermissionGate>
            <PermissionGate permission="users.delete">
              <Button variant="outline" size="sm" onClick={() => setDialog({ type: "delete" })}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </PermissionGate>
            <PermissionGate permission="users.update">
              <Button variant="outline" size="sm" onClick={() => runAction(() => userActions.verify(params.id, "email"), "Email marked verified")}>
                <UserCheck className="mr-2 h-4 w-4" /> Verify email
              </Button>
            </PermissionGate>
            <PermissionGate permission="admin_users.manage">
              <div className="flex items-center gap-2">
                <Select value={role} onValueChange={(v) => setRole(v)}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Change role" />
                  </SelectTrigger>
                  <SelectContent>
                    {["MODERATOR", "VERIFIER", "SUPPORT", "FINANCE", "ANALYST", "ADMIN", "SUPER_ADMIN"].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!role}
                  onClick={() => runAction(() => userActions.changeRole(params.id, role), "Role updated")}
                >
                  <UserCog className="mr-2 h-4 w-4" /> Apply
                </Button>
              </div>
            </PermissionGate>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto">
              {tabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="profile" className="space-y-4">
              {u && <ProfileFields user={u} />}
            </TabsContent>

            {["photos", "verifications", "matches", "messages", "payments", "reports"].map((key) => (
              <TabsContent key={key} value={key}>
                {subresource.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <Card>
                    <CardContent className="p-4">
                      {Array.isArray(subresource.data) && subresource.data.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No {key} found.</p>
                      ) : (
                        <pre className="max-h-[480px] overflow-auto rounded-md bg-muted p-4 text-xs">
                          {JSON.stringify(subresource.data ?? [], null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}

            <TabsContent value="activity">
              <Card>
                <CardContent className="p-4">
                  {audit.isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : audit.data?.rows.length ? (
                    <ul className="divide-y">
                      {audit.data.rows.map((row) => (
                        <li key={row.id} className="flex items-center justify-between py-2 text-sm">
                          <span className="font-medium">{titleCase(row.action)}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">No audit events found.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {u && (
            <>
              <InfoCard user={u} />
              <Card>
                <CardHeader>
                  <CardTitle>Current Subscription</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {u.subscription ? (
                    <div className="space-y-1.5">
                      <StatusBadge status={u.subscription.status as string} />
                      <p className="text-muted-foreground">Expires {formatDate(u.subscription.expires_at as string)}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No active subscription.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {dialog?.type === "ban" && (
        <BanDialog
          onClose={() => setDialog(null)}
          onConfirm={(reason) => runAction(() => userActions.ban(params.id, { reason }), "User banned")}
        />
      )}
      {dialog?.type === "unban" && (
        <ConfirmDialog
          open
          onOpenChange={() => setDialog(null)}
          title="Unban user"
          description="Restore this user's access to the platform."
          confirmLabel="Unban"
          destructive={false}
          onConfirm={() => runAction(() => userActions.unban(params.id), "User unbanned")}
        />
      )}
      {dialog?.type === "suspend" && (
        <SuspendDialog
          onClose={() => setDialog(null)}
          onConfirm={(reason, duration) =>
            runAction(() => userActions.suspend(params.id, { reason, duration_minutes: duration || null }), "User suspended")
          }
        />
      )}
      {dialog?.type === "delete" && (
        <ConfirmDialog
          open
          onOpenChange={() => setDialog(null)}
          title="Delete user"
          description="This soft-deletes the account and revokes all sessions. The user will not be able to log in."
          confirmLabel="Delete user"
          confirmPhrase="DELETE"
          destructive
          onConfirm={() => runAction(() => userActions.remove(params.id, { reason: "Deleted by admin" }), "User deleted")}
        />
      )}
    </div>
  );
}

function BanDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <ConfirmDialog
      open
      onOpenChange={onClose}
      title="Ban user"
      description="Banning revokes all sessions and blocks the account from the platform."
      confirmLabel="Ban user"
      confirmPhrase="BAN"
      destructive
      busy={false}
      onConfirm={() => onConfirm(reason || "Banned by admin")}
    >
      <ReasonField value={reason} onChange={setReason} />
    </ConfirmDialog>
  );
}

function SuspendDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (reason: string, durationMinutes?: number) => void;
}) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("60");
  return (
    <ConfirmDialog
      open
      onOpenChange={onClose}
      title="Suspend user"
      description="Suspending temporarily blocks the account. Set a duration in minutes."
      confirmLabel="Suspend"
      onConfirm={() => onConfirm(reason || "Suspended by admin", duration ? Number(duration) : undefined)}
    >
      <div className="space-y-3">
        <ReasonField value={reason} onChange={setReason} />
        <div>
          <label className="text-sm text-muted-foreground">Duration (minutes, blank = indefinite)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          />
        </div>
      </div>
    </ConfirmDialog>
  );
}

function ReasonField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-muted-foreground">Reason</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        placeholder="Why is this action being taken?"
      />
    </div>
  );
}
