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

// GET /api/events — list events for the current yearbook.
export async function GET() {
  if (!isServerConfigured()) {
    return NextResponse.json({ events: [] });
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("yearbook_id", YEARBOOK_ID)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { events: data ?? [] },
    { headers: { "cache-control": "no-store" } },
  );
}

// POST /api/events — anyone can create an event (open auth, like uploads).
const CreateBody = z.object({
  title: z.string().min(1).max(80),
  userName: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  if (!isServerConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  if (!(await checkUnlocked(supabase, isAdmin(req)))) {
    return NextResponse.json({ error: "locked" }, { status: 423 });
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ yearbook_id: YEARBOOK_ID, title: parsed.data.title.trim() })
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "insert_failed" },
      { status: 500 },
    );
  }
  await audit(supabase, {
    userName: parsed.data.userName,
    action: "create_event",
    targetId: (data as { id: string }).id,
    details: { title: parsed.data.title.trim() },
  });
  return NextResponse.json({ event: data });
}
