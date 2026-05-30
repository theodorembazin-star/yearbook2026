import { demoPeople, demoPhotos } from "@/lib/mock";
import { isServerConfigured, supabaseAdmin } from "@/lib/supabase/server";
import { eventFromRow, photoFromRow, personFromRow } from "@/lib/db";
import YearbookView from "@/components/YearbookView";
import { YEARBOOK_ID, YEARBOOK_TITLE, YEARBOOK_EMOJI } from "@/lib/config";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  const { admin } = await searchParams;
  const isAdmin =
    !!admin && !!process.env.ADMIN_TOKEN && admin === process.env.ADMIN_TOKEN;

  const yearbook = {
    id: YEARBOOK_ID,
    slug: "main",
    title: YEARBOOK_TITLE,
    cover_emoji: YEARBOOK_EMOJI,
    created_at: "",
  };

  if (!isServerConfigured()) {
    return (
      <YearbookView
        yearbook={yearbook}
        photos={demoPhotos}
        people={demoPeople}
        events={[]}
        isAdmin={isAdmin}
        demo
      />
    );
  }

  try {
    // Use the admin client server-side so we can read regardless of RLS state
    // (which is currently disabled — see migration 0001).
    const supabase = supabaseAdmin();
    // Admins also see hidden photos so they can manage them; visitors only
    // get the published ones.
    const visibleStatuses = isAdmin ? ["published", "hidden"] : ["published"];

    // sort_at may be missing if migration 0007 hasn't been applied yet —
    // fall back to taken_at so the page still renders.
    async function loadPhotos() {
      const first = await supabase
        .from("photos")
        .select("*, contributors(display_name), photo_people(person_id)")
        .eq("yearbook_id", YEARBOOK_ID)
        .in("status", visibleStatuses)
        .order("sort_at", { ascending: true });
      if (!first.error) return first;
      if (/sort_at/i.test(first.error.message)) {
        return supabase
          .from("photos")
          .select("*, contributors(display_name), photo_people(person_id)")
          .eq("yearbook_id", YEARBOOK_ID)
          .in("status", visibleStatuses)
          .order("taken_at", { ascending: true });
      }
      return first;
    }
    async function loadEvents() {
      const first = await supabase
        .from("events")
        .select("*")
        .eq("yearbook_id", YEARBOOK_ID)
        .order("created_at", { ascending: true });
      if (first.error && /relation .*events.* does not exist/i.test(first.error.message)) {
        return { data: [] as never[], error: null } as typeof first;
      }
      return first;
    }

    const [{ data: photos }, { data: people }, { data: events }] =
      await Promise.all([
        loadPhotos(),
        supabase
          .from("people")
          .select("*")
          .eq("yearbook_id", YEARBOOK_ID)
          .order("created_at", { ascending: true }),
        loadEvents(),
      ]);

    return (
      <YearbookView
        yearbook={yearbook}
        photos={(photos ?? []).map(photoFromRow as never)}
        people={(people ?? []).map(personFromRow)}
        events={(events ?? []).map(eventFromRow as never)}
        isAdmin={isAdmin}
      />
    );
  } catch (e) {
    console.warn("Falling back to demo dataset:", e);
    return (
      <YearbookView
        yearbook={yearbook}
        photos={demoPhotos}
        people={demoPeople}
        events={[]}
        isAdmin={isAdmin}
        demo
      />
    );
  }
}
