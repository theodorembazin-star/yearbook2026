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

// PATCH /api/photos/<id>
//
// Two roles share this endpoint:
//   - Anyone can edit caption and taken_at (same openness as upload).
//   - Only an admin can change status (hidden / published).
//
// Body accepts any combination of these fields; missing ones are left untouched.
const Body = z.object({
  status: z.enum(["hidden", "published"]).optional(),
  caption: z.string().max(280).nullable().optional(),
  takenAt: z.string().datetime().optional(),
  sortAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Status flips require the admin token; caption/date are open.
  if (parsed.data.status !== undefined && !isAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = supabaseAdmin();

  const update: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.caption !== undefined)
    update.caption = parsed.data.caption ? parsed.data.caption.trim() : null;
  if (parsed.data.takenAt !== undefined) update.taken_at = parsed.data.takenAt;
  if (parsed.data.sortAt !== undefined) {
    if (parsed.data.sortAt === null) {
      // Reset: sort_at follows taken_at again.
      if (parsed.data.takenAt) {
        update.sort_at = parsed.data.takenAt;
      } else {
        const { data: row } = await supabase
          .from("photos")
          .select("taken_at")
          .eq("id", id)
          .maybeSingle();
        update.sort_at = (row as { taken_at?: string } | null)?.taken_at;
      }
    } else {
      update.sort_at = parsed.data.sortAt;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("photos")
    .update(update)
    .eq("id", id)
    .eq("yearbook_id", YEARBOOK_ID);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/photos/<id>?admin=<token>
// Permanently removes the row + its storage object. Admin only.
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
