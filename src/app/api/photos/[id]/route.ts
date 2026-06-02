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

const Body = z.object({
  status: z.enum(["hidden", "published"]).optional(),
  caption: z.string().max(280).nullable().optional(),
  takenAt: z.string().datetime({ offset: true }).optional(),
  sortAt: z.string().datetime({ offset: true }).nullable().optional(),
  eventId: z.string().uuid().nullable().optional(),
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

  // Status flips require the admin token.
  const admin = isAdmin(req);
  if (parsed.data.status !== undefined && !admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = supabaseAdmin();

  // Verrouillage global : non-admin bloqué.
  if (!(await checkUnlocked(supabase, admin))) {
    return NextResponse.json({ error: "locked" }, { status: 423 });
  }

  const update: Record<string, unknown> = {};
  const actions: { action: Parameters<typeof audit>[1]["action"]; details?: Record<string, unknown> }[] = [];
  if (parsed.data.status !== undefined) {
    update.status = parsed.data.status;
    actions.push({
      action: parsed.data.status === "hidden" ? "hide_photo" : "unhide_photo",
    });
  }
  if (parsed.data.caption !== undefined) {
    update.caption = parsed.data.caption ? parsed.data.caption.trim() : null;
    actions.push({ action: "edit_caption" });
  }
  if (parsed.data.takenAt !== undefined) {
    update.taken_at = parsed.data.takenAt;
    actions.push({ action: "edit_date", details: { takenAt: parsed.data.takenAt } });
  }
  if (parsed.data.sortAt !== undefined) {
    if (parsed.data.sortAt === null) {
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
    actions.push({ action: "move" });
  }
  if (parsed.data.eventId !== undefined) {
    update.event_id = parsed.data.eventId; // null = détache de l'event
    actions.push({
      action: "edit_caption", // pas d'action dédiée → réutilise 'edit'
      details: { eventId: parsed.data.eventId },
    });
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

  for (const a of actions) {
    await audit(supabase, {
      userName: parsed.data.userName,
      action: a.action,
      targetId: id,
      details: a.details,
    });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/photos/<id>
// Ouvert à tous (cohérent avec upload ouvert). Accepte userName en query
// pour le journal. Verrouillage : seul l'admin peut supprimer si locked.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isServerConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { id } = await params;
  const supabase = supabaseAdmin();
  const url = new URL(req.url);
  const userName = url.searchParams.get("name") ?? undefined;
  const admin = isAdmin(req);

  if (!(await checkUnlocked(supabase, admin))) {
    return NextResponse.json({ error: "locked" }, { status: 423 });
  }

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
  await audit(supabase, {
    userName,
    action: "delete_photo",
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
