import { Badge, type BadgeProps } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

const VARIANT_MAP: Record<string, BadgeProps["variant"]> = {
  ACTIVE: "success",
  VERIFIED: "success",
  APPROVED: "success",
  SUCCESS: "success",
  RESOLVED: "success",
  DONE: "success",
  ENABLED: "success",
  QUEUED: "info",
  UNDER_REVIEW: "info",
  PENDING: "warning",
  PENDING_PAYMENT: "warning",
  INVESTIGATING: "warning",
  SENDING: "warning",
  REQUEST_CHANGES: "warning",
  SUSPENDED: "warning",
  FAILED: "destructive",
  REJECTED: "destructive",
  BANNED: "destructive",
  DISMISSED: "neutral",
  EXPIRED: "neutral",
  CANCELED: "neutral",
  CANCELLED: "neutral",
  UNMATCHED: "neutral",
  UNVERIFIED: "neutral",
  REFUNDED: "info",
  ESCALATED: "destructive",
  DELETED: "destructive",
  BLOCKED: "destructive",
  INACTIVE: "neutral",
};

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return <Badge variant="neutral">—</Badge>;
  return (
    <Badge variant={VARIANT_MAP[status.toUpperCase()] ?? "neutral"} className={className}>
      {titleCase(status)}
    </Badge>
  );
}
