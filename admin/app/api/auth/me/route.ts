import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_PREFIX = "/api/v1";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: { code: "NOT_AUTHENTICATED", message: "Not authenticated" } }, { status: 401 });
  }
  const resp = await fetch(`${API_URL}${API_PREFIX}/auth/me`, {
    headers: { Authorization: auth },
  });
  const body = await resp.json();
  return NextResponse.json(body, { status: resp.status });
}
