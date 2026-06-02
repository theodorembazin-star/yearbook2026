import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, isServerConfigured } from "@/lib/supabase/server";
import { YEARBOOK_ID } from "@/lib/config";
import { audit, checkUnlocked } from "@/lib/audit";

function isAdmin(req: Request): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("admin");
  const fromHeader = req.headers.get("x-admin-token");
  return fromQuery === adminToken || fromHeader === adminToken;
}

// PATCH /api/events/<id>
// Ouvert à tous quand non verrouillé (cohérent avec POST /api/events).
// Accepte sortAt pour le déplacement dans la frise + userName pour l'audit.
const Body = z.object({
  sortAt: z.string().datetime({ offset: true }).optional(),
  title: z.string().min(1).max(80).optional(),
  userName: z.string().max(40).optional(),
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

  const { id } = await params;
  const supabase = supabaseAdmin();
  if (!(await checkUnlocked(supabase, isAdmin(req)))) {
    return NextResponse.json({ error: "locked" }, { status: 423 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.sortAt !== undefined) update.sort_at = parsed.data.sortAt;
  if (parsed.data.title !== undefined) update.title = parsed.data.title.trim();
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("events")
    .update(update)
    .eq("id", id)
    .eq("yearbook_id", YEARBOOK_ID);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.sortAt !== undefined) {
    await audit(supabase, {
      userName: parsed.data.userName,
      action: "move",
      targetId: id,
      details: { kind: "event" },
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/events/<id>?admin=<token>
// Admin only — détache les photos (FK on delete set null).
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
  await audit(supabase, { action: "delete_event", targetId: id });
  return NextResponse.json({ ok: true });
}
