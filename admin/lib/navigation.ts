import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  HeartHandshake,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  UserCheck,
  Users,
  Wallet,
  Briefcase,
  Share2,
  ClipboardList,
  KeyRound,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission required to see the item (any of these grants visibility). */
  permissions?: string[];
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permissions: ["analytics.read", "users.read", "reports.read"],
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        permissions: ["analytics.read"],
      },
    ],
  },
  {
    label: "Users",
    items: [
      {
        label: "All Users",
        href: "/users",
        icon: Users,
        permissions: ["users.read"],
      },
      {
        label: "Active Users",
        href: "/users?account_status=ACTIVE",
        icon: UserCheck,
        permissions: ["users.read"],
      },
      {
        label: "Suspended",
        href: "/users?account_status=SUSPENDED",
        icon: ShieldAlert,
        permissions: ["users.read"],
      },
      {
        label: "Banned",
        href: "/users?account_status=BANNED",
        icon: ShieldAlert,
        permissions: ["users.read"],
      },
      {
        label: "Premium",
        href: "/users?premium=true",
        icon: Wallet,
        permissions: ["users.read"],
      },
    ],
  },
  {
    label: "Profiles & Verification",
    items: [
      {
        label: "Profiles",
        href: "/profiles",
        icon: FileText,
        permissions: ["profiles.read"],
      },
      {
        label: "Photo Verification",
        href: "/photos",
        icon: FileCheck2,
        permissions: ["photos.moderate"],
      },
      {
        label: "Job Verification",
        href: "/job-verifications",
        icon: Briefcase,
        permissions: ["job_verification.read"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Matches",
        href: "/matches",
        icon: HeartHandshake,
        permissions: ["users.read", "reports.read"],
      },
      {
        label: "Messages",
        href: "/messages",
        icon: MessageSquare,
        permissions: ["messages.read_private"],
      },
      {
        label: "Reports & Moderation",
        href: "/reports",
        icon: ShieldCheck,
        permissions: ["reports.read"],
      },
      {
        label: "Profile Shares",
        href: "/profile-shares",
        icon: Share2,
        permissions: ["users.read"],
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Payments",
        href: "/payments",
        icon: CreditCard,
        permissions: ["payments.read"],
      },
      {
        label: "Subscriptions",
        href: "/subscriptions",
        icon: Wallet,
        permissions: ["subscriptions.read"],
      },
      {
        label: "Subscription Plans",
        href: "/subscriptions/plans",
        icon: SlidersHorizontal,
        permissions: ["subscriptions.read"],
      },
    ],
  },
  {
    label: "Engagement",
    items: [
      {
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        permissions: ["notifications.send"],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "App Configuration",
        href: "/settings/app",
        icon: Settings,
        permissions: ["app_config.read", "app_config.update"],
      },
      {
        label: "Audit Logs",
        href: "/audit-logs",
        icon: ClipboardList,
        permissions: ["audit_logs.read"],
      },
      {
        label: "Admin Users",
        href: "/admin-users",
        icon: KeyRound,
        permissions: ["admin_users.read"],
      },
      {
        label: "Roles & Permissions",
        href: "/roles",
        icon: ShieldCheck,
        permissions: ["admin_users.read"],
      },
    ],
  },
];
