import { notFound } from "next/navigation";
import { demoPeople, demoPhotos, demoYearbook } from "@/lib/mock";
import { isServerConfigured, supabaseServer } from "@/lib/supabase/server";
import { photoFromRow, personFromRow } from "@/lib/db";
import YearbookView from "@/components/YearbookView";
import type { Yearbook } from "@/lib/types";

export default async function YearbookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k: token } = await searchParams;

  // Fall back to the demo dataset whenever Supabase is not yet configured.
  if (!isServerConfigured()) {
    const yearbook: Yearbook = { ...demoYearbook, slug };
    return (
      <YearbookView
        yearbook={yearbook}
        photos={demoPhotos}
        people={demoPeople}
        token={null}
        demo
      />
    );
  }

  const supabase = await supabaseServer();
  const { data: yb } = await supabase
    .from("yearbooks")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!yb) notFound();

  const [{ data: photos }, { data: people }] = await Promise.all([
    supabase
      .from("photos")
      .select("*, contributors(display_name), photo_people(person_id)")
      .eq("yearbook_id", yb.id)
      .eq("status", "published")
      .order("taken_at", { ascending: true }),
    supabase.from("people").select("*").eq("yearbook_id", yb.id),
  ]);

  return (
    <YearbookView
      yearbook={{
        id: yb.id,
        slug: yb.slug,
        title: yb.title,
        cover_emoji: yb.cover_emoji,
        created_at: yb.created_at,
      }}
      photos={(photos ?? []).map(photoFromRow as never)}
      people={(people ?? []).map(personFromRow)}
      token={token ?? null}
    />
  );
}
