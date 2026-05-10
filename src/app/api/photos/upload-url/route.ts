import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, isServerConfigured } from "@/lib/supabase/server";
import { YEARBOOK_ID } from "@/lib/config";

const Body = z.object({
  contentType: z.string().regex(/^image\//),
  takenAt: z.string().datetime().optional(),
  caption: z.string().max(280).optional(),
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
  const photoId = crypto.randomUUID();
  const ext = parsed.data.contentType.split("/")[1] ?? "jpg";
  const key = `${YEARBOOK_ID}/${photoId}.${ext}`;

  const { data: signed, error: signErr } = await supabase.storage
    .from("photos")
    .createSignedUploadUrl(key);
  if (signErr || !signed) {
    console.error("upload-url: signed URL failed", signErr);
    return NextResponse.json(
      { error: "sign_failed", detail: signErr?.message },
      { status: 500 },
    );
  }

  const { error: insertErr } = await supabase.from("photos").insert({
    id: photoId,
    yearbook_id: YEARBOOK_ID,
    r2_key: key,
    taken_at: parsed.data.takenAt ?? new Date().toISOString(),
    caption: parsed.data.caption,
    status: "pending",
  });
  if (insertErr) {
    console.error("upload-url: insert failed", insertErr);
    // Most common cause: migration 0003 not applied → yearbook row missing,
    // FK violation here.
    return NextResponse.json(
      {
        error: "insert_failed",
        detail: insertErr.message,
        hint:
          insertErr.message?.includes("foreign key") ||
          insertErr.code === "23503"
            ? "Apply supabase/migrations/0003_single_yearbook.sql"
            : undefined,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    uploadUrl: signed.signedUrl,
    token: signed.token,
    photoId,
    key,
  });
}
