import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_PREFIX = "/api/v1";
const COOKIE_NAME = "mm_admin_refresh";
const SECURE = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(COOKIE_NAME)?.value;
  if (refreshToken) {
    try {
      await fetch(`${API_URL}${API_PREFIX}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Best-effort: the refresh token is cleared client-side regardless.
    }
  }
  const response = NextResponse.json({ data: { logged_out: true } });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: SECURE,
    path: "/",
    maxAge: 0,
  });
  return response;
}
