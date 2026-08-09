"use client";

import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";

interface PermissionGateProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Hides UI for admins without the permission. This is a presentation concern
 * only — authorization is enforced server-side by the backend.
 */
export function PermissionGate({ permission, fallback, children }: PermissionGateProps) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return fallback ? <>{fallback}</> : null;
  }
  return <>{children}</>;
}

export function ForbiddenState({ title = "You do not have access to this area" }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your role does not include the required permission. Contact a SUPER_ADMIN if you believe this is a mistake.
      </p>
    </div>
  );
}
