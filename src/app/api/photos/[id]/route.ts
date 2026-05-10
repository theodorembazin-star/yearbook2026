import { NextResponse } from "next/server";
import { z } from "zod";
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

// PATCH /api/photos/<id>?admin=<token>
// Body: { status: 'hidden' | 'published' }
// Toggles visibility. Hidden photos are still fetched by admin sessions
// (so they can unhide), but never shown to the public.
export async function PATCH(
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
  const parsed = z
    .object({ status: z.enum(["hidden", "published"]) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("photos")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .eq("yearbook_id", YEARBOOK_ID);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/photos/<id>?admin=<token>
// Permanently removes the row + its storage object.
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

  // Fetch the storage key first so we can clean it up.
  const { data: photo } = await supabase
    .from("photos")
    .select("r2_key, thumb_key")
    .eq("id", id)
    .eq("yearbook_id", YEARBOOK_ID)
    .maybeSingle();

  if (photo) {
    const keys = [
      (photo as { r2_key?: string | null }).r2_key,
      (photo as { thumb_key?: string | null }).thumb_key,
    ].filter((k): k is string => !!k);
    if (keys.length > 0) {
      await supabase.storage.from("photos").remove(keys);
    }
  }

  const { error } = await supabase
    .from("photos")
    .delete()
    .eq("id", id)
    .eq("yearbook_id", YEARBOOK_ID);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
