"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/components/permission-gate";
import { useToast } from "@/components/ui/toast";
import { fetchRoles, updateRolePermissions } from "@/lib/api/ops";
import type { RolePermissions } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const GROUPS: { group: string; permissions: string[] }[] = [
  { group: "Users", permissions: ["users.read", "users.update", "users.suspend", "users.ban", "users.delete"] },
  { group: "Profiles", permissions: ["profiles.read", "profiles.moderate", "photos.moderate"] },
  { group: "Verification", permissions: ["verification.read", "verification.approve", "verification.reject"] },
  { group: "Job verification", permissions: ["job_verification.read", "job_verification.approve", "job_verification.reject"] },
  { group: "Reports", permissions: ["reports.read", "reports.resolve"] },
  { group: "Messages", permissions: ["messages.read_private"] },
  { group: "Payments", permissions: ["payments.read", "payments.refund"] },
  { group: "Subscriptions", permissions: ["subscriptions.read", "subscriptions.manage"] },
  { group: "Notifications", permissions: ["notifications.send"] },
  { group: "App config", permissions: ["app_config.read", "app_config.update"] },
  { group: "Analytics", permissions: ["analytics.read"] },
  { group: "Audit", permissions: ["audit_logs.read"] },
  { group: "Admin users", permissions: ["admin_users.read", "admin_users.manage"] },
];

export default function RolesPage() {
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const [activeRole, setActiveRole] = useState("MODERATOR");
  const [draft, setDraft] = useState<Set<string>>(new Set());

  useEffect(() => {
    const current = data?.find((r) => r.role === activeRole);
    if (current) setDraft(new Set(current.permissions));
  }, [data, activeRole]);

  if (error) return <ErrorState title="Unable to load roles" error={error} onRetry={() => refetch()} />;

  const save = async () => {
    try {
      await updateRolePermissions(activeRole, Array.from(draft));
      toast({ variant: "success", title: "Permissions updated" });
      refetch();
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles & Permissions"
        description="The backend enforces these permissions on every request"
        breadcrumbs={[{ label: "System" }, { label: "Roles & Permissions" }]}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs value={activeRole} onValueChange={setActiveRole}>
          <TabsList className="flex-wrap h-auto">
            {data?.map((r) => (
              <TabsTrigger key={r.role} value={r.role}>{r.role}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeRole}>
            <Card>
              <CardHeader>
                <CardTitle>{titleCase(activeRole)}</CardTitle>
                <CardDescription>
                  Granting a permission here applies immediately to every admin with this role.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {GROUPS.map((group) => (
                  <div key={group.group}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.group}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.permissions.map((perm) => {
                        const checked = draft.has(perm);
                        return (
                          <button
                            key={perm}
                            type="button"
                            onClick={() =>
                              setDraft((prev) => {
                                const next = new Set(prev);
                                if (next.has(perm)) next.delete(perm);
                                else next.add(perm);
                                return next;
                              })
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              checked ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:border-primary"
                            }`}
                            aria-pressed={checked}
                          >
                            {perm}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t pt-4">
                  <Badge variant="secondary">{draft.size} permissions</Badge>
                  <PermissionGate permission="admin_users.manage">
                    <Button onClick={save}>
                      <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                  </PermissionGate>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
