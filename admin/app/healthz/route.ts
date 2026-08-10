import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Container health check for the admin app (standalone server).
export async function GET() {
  return NextResponse.json({ ok: true });
}
