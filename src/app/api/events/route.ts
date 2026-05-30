import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, isServerConfigured } from "@/lib/supabase/server";
import { YEARBOOK_ID } from "@/lib/config";

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
  return NextResponse.json({ event: data });
}
