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

// DELETE /api/events/<id>?admin=<token>
// Removes the event. Photos that belonged to it are detached
// (event_id -> NULL by the FK ON DELETE SET NULL), not deleted.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("yearbook_id", YEARBOOK_ID);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
