import { NextResponse } from "next/server";
import { supabaseAdmin, isServerConfigured } from "@/lib/supabase/server";
import { YEARBOOK_ID } from "@/lib/config";

// GET /api/photos?admin=<token>
// Returns the current set of photos visible to the caller. Admins also get
// hidden ones. Always uses the service-role client server-side, so this
// works regardless of any RLS configuration on the photos table — which
// is exactly why it exists: the browser client (anon) can hit empty results
// in some setups, but this endpoint never will.
export async function GET(req: Request) {
  if (!isServerConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const adminToken = process.env.ADMIN_TOKEN;
  const fromQuery = url.searchParams.get("admin");
  const fromHeader = req.headers.get("x-admin-token");
  const isAdmin =
    !!adminToken && (fromQuery === adminToken || fromHeader === adminToken);

  const supabase = supabaseAdmin();
  const visibleStatuses = isAdmin ? ["published", "hidden"] : ["published"];
  const [photosRes, eventsRes] = await Promise.all([
    supabase
      .from("photos")
      .select("*, contributors(display_name), photo_people(person_id)")
      .eq("yearbook_id", YEARBOOK_ID)
      .in("status", visibleStatuses)
      .order("sort_at", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("yearbook_id", YEARBOOK_ID)
      .order("created_at", { ascending: true }),
  ]);
  if (photosRes.error) {
    return NextResponse.json({ error: photosRes.error.message }, { status: 500 });
  }
  return NextResponse.json(
    {
      photos: photosRes.data ?? [],
      events: eventsRes.data ?? [],
    },
    { headers: { "cache-control": "no-store" } },
  );
}
