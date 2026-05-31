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
  photoId: z.string().uuid(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  takenAt: z.string().datetime().optional(),
  caption: z.string().max(280).optional(),
  uploaderName: z.string().min(1).max(40),
  peopleIds: z.array(z.string().uuid()).optional(),
  eventId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  if (!isServerConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  if (!(await checkUnlocked(supabase, isAdmin(req)))) {
    return NextResponse.json({ error: "locked" }, { status: 423 });
  }

  const { data: contrib } = await supabase
    .from("contributors")
    .upsert(
      { yearbook_id: YEARBOOK_ID, display_name: parsed.data.uploaderName },
      { onConflict: "yearbook_id,display_name" },
    )
    .select("id")
    .maybeSingle();

  const update: Record<string, unknown> = {
    status: "published",
    uploader_id: contrib?.id ?? null,
    // Denormalize the uploader name onto the photo so the UI never has
    // to chase the join — keeps the display reliable even if the
    // contributors row was somehow lost.
    uploader_name: parsed.data.uploaderName,
  };
  if (parsed.data.width) update.width = parsed.data.width;
  if (parsed.data.height) update.height = parsed.data.height;
  if (parsed.data.takenAt) update.taken_at = parsed.data.takenAt;
  if (parsed.data.caption) update.caption = parsed.data.caption;
  if (parsed.data.eventId) update.event_id = parsed.data.eventId;

  const { error } = await supabase
    .from("photos")
    .update(update)
    .eq("id", parsed.data.photoId)
    .eq("yearbook_id", YEARBOOK_ID);
  if (error) {
    console.error("finalize: update failed", error);
    return NextResponse.json(
      { error: "update_failed", detail: error.message },
      { status: 500 },
    );
  }

  if (parsed.data.peopleIds && parsed.data.peopleIds.length > 0) {
    const rows = parsed.data.peopleIds.map((pid) => ({
      photo_id: parsed.data.photoId,
      person_id: pid,
    }));
    await supabase.from("photo_people").upsert(rows, { onConflict: "photo_id,person_id" });
  }

  await audit(supabase, {
    userName: parsed.data.uploaderName,
    action: "upload",
    targetId: parsed.data.photoId,
    details: parsed.data.eventId ? { eventId: parsed.data.eventId } : undefined,
  });

  return NextResponse.json({ ok: true });
}
