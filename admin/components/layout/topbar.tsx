"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <span>Environment: {process.env.NEXT_PUBLIC_ENV_LABEL ?? "production"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden sm:inline text-muted-foreground">Signed in as</span>
        <span className="font-medium">{user?.email}</span>
      </div>
    </header>
  );
}
