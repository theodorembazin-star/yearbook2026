import { NextResponse } from "next/server";
import { z } from "zod";
import { verify } from "@/lib/tokens";
import { supabaseAdmin, isServerConfigured } from "@/lib/supabase/server";

// Called once the client has finished uploading the file. Marks the photo as
// published and stores final metadata. In a full setup, this is where you'd
// also enqueue the post-processing worker (EXIF, thumbnails, face embeddings).

const Body = z.object({
  token: z.string(),
  photoId: z.string().uuid(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  takenAt: z.string().datetime().optional(),
  caption: z.string().max(280).optional(),
  uploaderName: z.string().min(1).max(40),
});

export async function POST(req: Request) {
  if (!isServerConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const claims = verify(parsed.data.token);
  if (!claims) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = supabaseAdmin();

  // Upsert contributor by display_name within this yearbook (anonymous-friendly)
  const { data: contrib } = await supabase
    .from("contributors")
    .upsert(
      { yearbook_id: claims.yearbookId, display_name: parsed.data.uploaderName },
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
    .eq("yearbook_id", claims.yearbookId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
