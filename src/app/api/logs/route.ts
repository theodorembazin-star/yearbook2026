import { NextResponse } from "next/server";
import { supabaseAdmin, isServerConfigured } from "@/lib/supabase/server";
import { YEARBOOK_ID } from "@/lib/config";

function isAdmin(req: Request): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("admin");
  const fromHeader = req.headers.get("x-admin-token");
  return fromQuery === adminToken || fromHeader === adminToken;
}

// GET /api/logs?admin=… — 100 derniers logs.
export async function GET(req: Request) {
  if (!isServerConfigured()) {
    return NextResponse.json({ logs: [] });
  }
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("yearbook_id", YEARBOOK_ID)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (/relation .*audit_logs.* does not exist/i.test(error.message)) {
      return NextResponse.json({ logs: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { logs: data ?? [] },
    { headers: { "cache-control": "no-store" } },
  );
}
