"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api/client";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  error?: unknown;
}

export function ErrorState({ title = "Something went wrong", description, onRetry, error }: ErrorStateProps) {
  const message =
    error instanceof ApiClientError
      ? error.message
      : description ?? "There was a problem loading this page. Please try again.";

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}
