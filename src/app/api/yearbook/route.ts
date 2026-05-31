import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, isServerConfigured } from "@/lib/supabase/server";
import { YEARBOOK_ID } from "@/lib/config";
import { audit } from "@/lib/audit";

function isAdmin(req: Request): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("admin");
  const fromHeader = req.headers.get("x-admin-token");
  return fromQuery === adminToken || fromHeader === adminToken;
}

// GET /api/yearbook — retourne l'état (locked, …).
export async function GET() {
  if (!isServerConfigured()) {
    return NextResponse.json({ yearbook: { id: YEARBOOK_ID, locked: false } });
  }
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("yearbooks")
    .select("id, locked")
    .eq("id", YEARBOOK_ID)
    .maybeSingle();
  return NextResponse.json(
    { yearbook: data ?? { id: YEARBOOK_ID, locked: false } },
    { headers: { "cache-control": "no-store" } },
  );
}

// PATCH /api/yearbook?admin=… — toggle locked.
const Body = z.object({
  locked: z.boolean().optional(),
  userName: z.string().max(40).optional(),
});

export async function PATCH(req: Request) {
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
  if (parsed.data.locked === undefined) {
    return NextResponse.json({ ok: true });
  }
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("yearbooks")
    .update({ locked: parsed.data.locked })
    .eq("id", YEARBOOK_ID);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await audit(supabase, {
    userName: parsed.data.userName ?? "admin",
    action: parsed.data.locked ? "lock" : "unlock",
  });
  return NextResponse.json({ ok: true });
}
