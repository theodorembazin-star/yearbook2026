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

const Body = z.object({
  name: z.string().min(1).max(40),
  contentType: z.string().regex(/^image\//),
});

// POST /api/people?admin=<token>
// Creates a member + returns a signed upload URL for their portrait.
// The client uploads, then PATCH /api/people/<id>/portrait to confirm.
export async function POST(req: Request) {
  if (!isServerConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const personId = crypto.randomUUID();
  const ext = parsed.data.contentType.split("/")[1] ?? "jpg";
  const key = `${YEARBOOK_ID}/members/${personId}.${ext}`;

  const { data: signed, error: signErr } = await supabase.storage
    .from("photos")
    .createSignedUploadUrl(key);
  if (signErr || !signed) {
    return NextResponse.json(
      { error: signErr?.message ?? "sign_failed" },
      { status: 500 },
    );
  }

  const { data: pub } = supabase.storage.from("photos").getPublicUrl(key);

  const { error: insertErr } = await supabase.from("people").insert({
    id: personId,
    yearbook_id: YEARBOOK_ID,
    name: parsed.data.name,
    cover_url: pub.publicUrl,
  });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    personId,
    uploadUrl: signed.signedUrl,
    token: signed.token,
    key,
    coverUrl: pub.publicUrl,
  });
}
