import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, isServerConfigured } from "@/lib/supabase/server";
import { YEARBOOK_ID } from "@/lib/config";

const Body = z.object({
  photoId: z.string().uuid(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  takenAt: z.string().datetime().optional(),
  caption: z.string().max(280).optional(),
  uploaderName: z.string().min(1).max(40),
  peopleIds: z.array(z.string().uuid()).optional(),
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
  };
  if (parsed.data.width) update.width = parsed.data.width;
  if (parsed.data.height) update.height = parsed.data.height;
  if (parsed.data.takenAt) update.taken_at = parsed.data.takenAt;
  if (parsed.data.caption) update.caption = parsed.data.caption;

  const { error } = await supabase
    .from("photos")
    .update(update)
    .eq("id", parsed.data.photoId)
    .eq("yearbook_id", YEARBOOK_ID);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (parsed.data.peopleIds && parsed.data.peopleIds.length > 0) {
    const rows = parsed.data.peopleIds.map((pid) => ({
      photo_id: parsed.data.photoId,
      person_id: pid,
    }));
    await supabase.from("photo_people").upsert(rows, { onConflict: "photo_id,person_id" });
  }

  return NextResponse.json({ ok: true });
}
