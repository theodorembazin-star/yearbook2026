"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Filter } from "lucide-react";
import type { Person, Photo, Yearbook } from "@/lib/types";
import { monthKey, formatMonthFr } from "@/lib/utils";
import Timeline from "./Timeline";
import PhotoSection from "./PhotoSection";
import UploadDialog from "./UploadDialog";
import PeopleFilter from "./PeopleFilter";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { photoFromRow } from "@/lib/db";

type Props = {
  yearbook: Yearbook;
  photos: Photo[];
  people: Person[];
  token: string | null;
  demo?: boolean;
};

export default function YearbookView({
  yearbook,
  photos: initial,
  people,
  token,
  demo = false,
}: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activePeople, setActivePeople] = useState<string[]>([]);

  // Realtime: listen for new published photos in this yearbook
  useEffect(() => {
    if (demo || !isSupabaseConfigured()) return;
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`yearbook:${yearbook.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "photos",
          filter: `yearbook_id=eq.${yearbook.id}`,
        },
        async () => {
          // Re-fetch on any change — simpler than reconciling and good enough
          // for the volume we expect (a few dozen uploads per minute max).
          const { data } = await supabase
            .from("photos")
            .select("*, contributors(display_name), photo_people(person_id)")
            .eq("yearbook_id", yearbook.id)
            .eq("status", "published")
            .order("taken_at", { ascending: true });
          if (data) setPhotos(data.map(photoFromRow as never));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [yearbook.id, demo]);

  const filtered = useMemo(() => {
    if (activePeople.length === 0) return photos;
    return photos.filter((p) =>
      activePeople.every((id) => p.people_ids.includes(id)),
    );
  }, [photos, activePeople]);

  const sections = useMemo(() => {
    const groups = new Map<string, Photo[]>();
    [...filtered]
      .sort((a, b) => +new Date(a.taken_at) - +new Date(b.taken_at))
      .forEach((p) => {
        const k = monthKey(p.taken_at);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(p);
      });
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      title: formatMonthFr(key),
      items,
    }));
  }, [filtered]);

  const contributorCount = useMemo(
    () => new Set(photos.map((p) => p.uploader_name)).size,
    [photos],
  );

  function onUploaded(newPhotos: Photo[]) {
    setPhotos((prev) => [...prev, ...newPhotos]);
  }

  return (
    <div className="min-h-screen">
      <Header yearbook={yearbook} demo={demo} onUploadClick={() => setUploadOpen(true)} />

      <div className="mx-auto flex max-w-6xl gap-8 px-6">
        <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-44 shrink-0 lg:block">
          <Timeline sections={sections} />
        </aside>

        <main className="min-w-0 flex-1 pb-32">
          <Cover yearbook={yearbook} photoCount={photos.length} contributors={contributorCount} />

          {people.length > 0 && (
            <div className="mb-6 mt-10 flex items-center gap-3">
              <Filter className="h-4 w-4 text-ink/60" />
              <PeopleFilter
                people={people}
                active={activePeople}
                onChange={setActivePeople}
              />
            </div>
          )}

          {sections.length === 0 ? (
            <EmptyState onUploadClick={() => setUploadOpen(true)} />
          ) : (
            sections.map((s) => (
              <PhotoSection key={s.key} id={`s-${s.key}`} title={s.title} photos={s.items} />
            ))
          )}
        </main>
      </div>

      <button
        onClick={() => setUploadOpen(true)}
        className="fixed bottom-8 right-8 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-4 text-cream shadow-2xl shadow-accent/30 transition hover:scale-105"
      >
        <Plus className="h-5 w-5" />
        Ajouter des photos
      </button>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        yearbookId={yearbook.id}
        token={token}
        demo={demo}
        onUploaded={onUploaded}
      />
    </div>
  );
}

function Header({
  yearbook,
  demo,
  onUploadClick,
}: {
  yearbook: Yearbook;
  demo: boolean;
  onUploadClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Tous les yearbooks
        </Link>
        <div className="font-display text-lg font-semibold">
          <span className="mr-2">{yearbook.cover_emoji}</span>
          {yearbook.title}
          {demo && (
            <span className="ml-3 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
              démo
            </span>
          )}
        </div>
        <button
          onClick={onUploadClick}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm hover:border-ink/40"
        >
          + Photos
        </button>
      </div>
    </header>
  );
}

function Cover({
  yearbook,
  photoCount,
  contributors,
}: {
  yearbook: Yearbook;
  photoCount: number;
  contributors: number;
}) {
  return (
    <section className="float-in mt-10 border-b border-ink/10 pb-10">
      <div className="text-7xl">{yearbook.cover_emoji}</div>
      <h1 className="font-display mt-4 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
        {yearbook.title}
      </h1>
      <p className="mt-4 max-w-xl text-ink/70">
        {photoCount} photo{photoCount > 1 ? "s" : ""} · {contributors || 1} contributeur
        {contributors > 1 ? "s" : ""} · scroll pour traverser l'année
      </p>
    </section>
  );
}

function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="mt-16 rounded-3xl border-2 border-dashed border-ink/15 p-12 text-center">
      <div className="text-5xl">📷</div>
      <h2 className="font-display mt-3 text-2xl font-semibold">Pas encore de photo</h2>
      <p className="mt-2 text-ink/60">Sois le premier à en déposer pour démarrer la frise.</p>
      <button
        onClick={onUploadClick}
        className="mt-6 rounded-full bg-accent px-6 py-3 text-cream"
      >
        Ajouter des photos
      </button>
    </div>
  );
}
