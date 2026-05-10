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

  // Try to clean up the portrait file too. We don't fail if it's already gone.
  const { data: person } = await supabase
    .from("people")
    .select("cover_url")
    .eq("id", id)
    .eq("yearbook_id", YEARBOOK_ID)
    .maybeSingle();

  if (person && (person as { cover_url?: string | null }).cover_url) {
    const cover = (person as { cover_url: string }).cover_url;
    const idx = cover.indexOf("/photos/");
    if (idx !== -1) {
      const key = cover.slice(idx + "/photos/".length);
      await supabase.storage.from("photos").remove([key]);
    }
  }

  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", id)
    .eq("yearbook_id", YEARBOOK_ID);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
