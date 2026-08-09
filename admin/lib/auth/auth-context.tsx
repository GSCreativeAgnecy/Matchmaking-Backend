"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MeResponse, RolePermissions } from "@/lib/types";
import { apiGet, setAccessToken } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/client";

interface LoginResponse {
  access_token?: string;
  requires_2fa?: boolean;
  mfa_token?: string;
  expires_in?: number;
}

interface AuthContextValue {
  user: MeResponse | null;
  permissions: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  completeMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  isAdminRole: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_ROLES = new Set(["MODERATOR", "VERIFIER", "SUPPORT", "FINANCE", "ANALYST", "ADMIN", "SUPER_ADMIN"]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback(async (me: MeResponse) => {
    setUser(me);
    try {
      const res = await apiGet<{ data: RolePermissions[] }>("/admin/roles");
      const mine = res.data.find((r) => r.role === me.role);
      setPermissions(mine?.permissions ?? []);
    } catch {
      setPermissions([]);
    }
  }, []);

  // On mount, try to restore a session from the HttpOnly refresh cookie.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" });
        if (res.ok) {
          const body = (await res.json()) as { data?: { access_token?: string } };
          const token = body.data?.access_token;
          if (token) {
            setAccessToken(token);
            const meRes = await fetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${token}` },
              credentials: "same-origin",
            });
            if (meRes.ok) {
              const meBody = (await meRes.json()) as { data: MeResponse };
              await applyUser(meBody.data);
            }
          }
        }
      } catch {
        // no session
      } finally {
        setLoading(false);
      }
    })();
  }, [applyUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new ApiClientError(res.status, body as never);
      }
      const data = body.data as LoginResponse;
      if (data.requires_2fa) {
        return data;
      }
      if (data.access_token) {
        setAccessToken(data.access_token);
        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
          credentials: "same-origin",
        });
        if (meRes.ok) {
          const meBody = (await meRes.json()) as { data: MeResponse };
          await applyUser(meBody.data);
        }
      }
      return data;
    },
    [applyUser],
  );

  const completeMfa = useCallback(
    async (mfaToken: string, code: string): Promise<void> => {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfa_token: mfaToken, code }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new ApiClientError(res.status, body as never);
      }
      const token = (body.data as LoginResponse).access_token;
      if (token) {
        setAccessToken(token);
        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "same-origin",
        });
        if (meRes.ok) {
          const meBody = (await meRes.json()) as { data: MeResponse };
          await applyUser(meBody.data);
        }
      }
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // ignore
    }
  }, []);

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (...required: string[]) => required.some((p) => permissions.includes(p)),
    [permissions],
  );

  const isAdminRole = useMemo(() => Boolean(user && ADMIN_ROLES.has(user.role)), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      loading,
      login,
      completeMfa,
      logout,
      hasPermission,
      hasAnyPermission,
      isAdminRole,
    }),
    [user, permissions, loading, login, completeMfa, logout, hasPermission, hasAnyPermission, isAdminRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
