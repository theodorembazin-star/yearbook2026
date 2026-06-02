"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Filter, Settings, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Aurora from "./Aurora";
import Hero from "./Hero";
import { extractPalette, DEFAULT_PALETTE, HERO_PALETTE } from "@/lib/colors";
import { YEARBOOK_SUBTITLE } from "@/lib/config";
import type { Event, Person, Photo, Yearbook } from "@/lib/types";
import { monthKey, formatMonthFr } from "@/lib/utils";
import Timeline from "./Timeline";
import PhotoSection, { type TimelineItem } from "./PhotoSection";
import EventModal from "./EventModal";
import UploadDialog from "./UploadDialog";
import PeopleFilter from "./PeopleFilter";
import AdminPanel from "./AdminPanel";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { photoFromRow, eventFromRow } from "@/lib/db";
import { YEARBOOK_ID } from "@/lib/config";

type Props = {
  yearbook: Yearbook;
  photos: Photo[];
  people: Person[];
  events: Event[];
  isAdmin?: boolean;
  demo?: boolean;
};

export default function YearbookView({
  yearbook,
  photos: initial,
  people: initialPeople,
  events: initialEvents,
  isAdmin = false,
  demo = false,
}: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [locked, setLocked] = useState<boolean>(Boolean(yearbook.locked));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activePeople, setActivePeople] = useState<string[]>([]);
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  // Mutations are gated by 'locked && !isAdmin'.
  const canMutate = isAdmin || !locked;

  // Close the info popover when the user clicks anywhere else.
  useEffect(() => {
    if (!infoOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && !t.closest("[data-info-root]")) setInfoOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [infoOpen]);

  // Single source of truth for refetching photos + events. Goes through a
  // server endpoint that uses the service-role client, so it never gets
  // blocked by RLS.
  const refreshPhotos = useCallback(async () => {
    if (demo || !isSupabaseConfigured()) return;
    try {
      const adminToken =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("admin") ?? ""
          : "";
      const res = await fetch(
        `/api/photos${adminToken ? `?admin=${encodeURIComponent(adminToken)}` : ""}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        console.warn("refreshPhotos failed:", res.status);
        return;
      }
      const { photos: rows, events: evRows } = (await res.json()) as {
        photos: unknown[];
        events?: unknown[];
      };
      setPhotos((rows ?? []).map(photoFromRow as never));
      if (Array.isArray(evRows))
        setEvents(evRows.map(eventFromRow as never));
    } catch (e) {
      console.warn("refreshPhotos network error:", e);
    }
  }, [demo, isAdmin]);

  const optimisticUpdate = useCallback(
    (id: string, patch: Partial<Photo>) => {
      setPhotos((prev) => {
        const out = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
        return isAdmin ? out : out.filter((p) => p.status !== "hidden");
      });
    },
    [isAdmin],
  );
  const optimisticDelete = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Realtime
  useEffect(() => {
    if (demo || !isSupabaseConfigured()) return;
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`yearbook:${YEARBOOK_ID}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos", filter: `yearbook_id=eq.${YEARBOOK_ID}` },
        () => void refreshPhotos(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `yearbook_id=eq.${YEARBOOK_ID}` },
        () => void refreshPhotos(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "yearbooks", filter: `id=eq.${YEARBOOK_ID}` },
        (payload) => {
          const next = payload.new as { locked?: boolean };
          if (typeof next.locked === "boolean") setLocked(next.locked);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "people", filter: `yearbook_id=eq.${YEARBOOK_ID}` },
        async () => {
          const { data } = await supabase
            .from("people")
            .select("*")
            .eq("yearbook_id", YEARBOOK_ID)
            .order("created_at", { ascending: true });
          if (data) {
            setPeople(
              data.map((p: { id: string; name: string; cover_url?: string | null; cover_photo_id?: string | null }) => ({
                id: p.id,
                yearbook_id: YEARBOOK_ID,
                name: p.name,
                cover_url: p.cover_url ?? undefined,
                cover_photo_id: p.cover_photo_id ?? undefined,
              })),
            );
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [demo, isAdmin, refreshPhotos]);

  const filtered = useMemo(() => {
    if (activePeople.length === 0) return photos;
    return photos.filter((p) =>
      activePeople.every((id) => p.people_ids.includes(id)),
    );
  }, [photos, activePeople]);

  // Build the timeline items: orphan photos as single tiles, events as
  // bundle tiles. Order is driven by sort_at (so DnD wins over date edits).
  // Events surface at their earliest photo's sort_at.
  const { sections, orphanIds, eventTimelineIds } = useMemo(() => {
    const eventPhotos = new Map<string, Photo[]>();
    const orphans: Photo[] = [];
    for (const p of filtered) {
      if (p.event_id) {
        const list = eventPhotos.get(p.event_id) ?? [];
        list.push(p);
        eventPhotos.set(p.event_id, list);
      } else {
        orphans.push(p);
      }
    }

    const items: (TimelineItem & { _date: number })[] = [];

    for (const p of orphans) {
      items.push({
        _date: +new Date((p.sort_at ?? p.taken_at)),
        kind: "photo",
        photo: p,
      });
    }

    for (const ev of events) {
      const list = (eventPhotos.get(ev.id) ?? []).sort(
        (a, b) => +new Date((a.sort_at ?? a.taken_at)) - +new Date((b.sort_at ?? b.taken_at)),
      );
      if (list.length === 0) continue;
      const cover = list.find((p) => p.id === ev.cover_photo_id) ?? list[0];
      // sort_at de l'event prime ; fallback : 1re photo, puis created_at.
      const evSort =
        ev.sort_at ?? list[0].sort_at ?? list[0].taken_at ?? ev.created_at;
      items.push({
        _date: +new Date(evSort),
        kind: "event",
        bundle: {
          event: ev,
          cover,
          count: list.length,
          date: evSort,
        },
      });
    }

    items.sort((a, b) => a._date - b._date);

    const groups = new Map<string, TimelineItem[]>();
    for (const it of items) {
      const k = monthKey(
        it.kind === "photo"
          ? (it.photo.sort_at ?? it.photo.taken_at)
          : it.bundle.date,
      );
      const list = groups.get(k) ?? [];
      list.push(it);
      groups.set(k, list);
    }
    const sections = Array.from(groups.entries()).map(([key, list]) => ({
      key,
      title: formatMonthFr(key),
      items: list,
    }));

    // Flat list of orphan photo IDs and event IDs, in timeline order.
    const orphanIds = items
      .filter((it): it is Extract<typeof items[number], { kind: "photo" }> => it.kind === "photo")
      .map((it) => it.photo.id);
    const eventTimelineIds = items
      .filter((it): it is Extract<typeof items[number], { kind: "event" }> => it.kind === "event")
      .map((it) => it.bundle.event.id);

    return { sections, orphanIds, eventTimelineIds };
  }, [filtered, events]);

  const contributorCount = useMemo(
    () => new Set(photos.map((p) => p.uploader_name)).size,
    [photos],
  );

  function onUploaded(newPhotos: Photo[]) {
    setPhotos((prev) => [...prev, ...newPhotos]);
  }

  // ---------- Aurora palette derived from currently visible photos ----------
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE);
  const [onHero, setOnHero] = useState(true);
  const palettesRef = useRef<Map<string, string[]>>(new Map());
  const visibleRef = useRef<Set<string>>(new Set());
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;

  useEffect(() => {
    let cancelled = false;
    let inflight = 0;
    const queue = photos.filter((p) => !palettesRef.current.has(p.id));
    async function pump() {
      while (!cancelled && queue.length > 0 && inflight < 2) {
        const p = queue.shift()!;
        inflight++;
        extractPalette(p.thumb_url)
          .then((palette) => {
            if (cancelled) return;
            palettesRef.current.set(p.id, palette);
            const top = topmostVisiblePalette();
            if (top) setPalette(top);
          })
          .finally(() => {
            inflight--;
            pump();
          });
      }
    }
    pump();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  function topmostVisiblePalette(): string[] | null {
    const visible = visibleRef.current;
    if (visible.size === 0) return null;
    for (const p of photosRef.current) {
      if (visible.has(p.id)) {
        const palette = palettesRef.current.get(p.id);
        if (palette) return palette;
      }
    }
    return null;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.photoId;
          if (!id) continue;
          if (e.isIntersecting) visibleRef.current.add(id);
          else visibleRef.current.delete(id);
        }
        const top = topmostVisiblePalette();
        if (top) setPalette(top);
      },
      { threshold: 0.35, rootMargin: "-10% 0px -40% 0px" },
    );
    document.querySelectorAll("[data-photo-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Photos that belong to the currently-open event (for the modal).
  const openEventPhotos = useMemo(() => {
    if (!openEventId) return [];
    return photos
      .filter((p) => p.event_id === openEventId)
      .sort((a, b) => +new Date((a.sort_at ?? a.taken_at)) - +new Date((b.sort_at ?? b.taken_at)));
  }, [openEventId, photos]);
  const openEvent = useMemo(
    () => events.find((e) => e.id === openEventId) ?? null,
    [openEventId, events],
  );

  // ---------- Reorder via up/down arrows ----------
  // Works for photos AND events. Both share the same mixed timeline,
  // the same swap-within-month / jump-across-months rules, and the same
  // optimistic-update + PATCH pipeline. PATCH route differs by kind:
  // /api/photos/[id] for photos, /api/events/[id] for events.
  async function moveItem(
    id: string,
    kind: "photo" | "event",
    direction: -1 | 1,
  ) {
    // Reconstruit la liste mixte (photos orphelines + events) groupée par mois.
    type FlatEntry = { id: string; kind: "photo" | "event"; sort_at: string };
    const entries: FlatEntry[] = [];
    for (const p of photos) {
      if (p.event_id) continue;
      entries.push({
        id: p.id,
        kind: "photo",
        sort_at: p.sort_at ?? p.taken_at,
      });
    }
    for (const ev of events) {
      // Filtre events sans photos (sinon non rendus).
      const hasPhotos = photos.some((p) => p.event_id === ev.id);
      if (!hasPhotos) continue;
      const evSort =
        ev.sort_at ??
        (photos
          .filter((p) => p.event_id === ev.id)
          .map((p) => p.sort_at ?? p.taken_at)
          .sort()[0] ??
          ev.created_at);
      entries.push({ id: ev.id, kind: "event", sort_at: evSort });
    }
    entries.sort(
      (a, b) => +new Date(a.sort_at) - +new Date(b.sort_at),
    );

    const groups = new Map<string, FlatEntry[]>();
    for (const e of entries) {
      const k = monthKey(e.sort_at);
      const list = groups.get(k) ?? [];
      list.push(e);
      groups.set(k, list);
    }
    const months = Array.from(groups.entries()).map(([key, list]) => ({
      key,
      list,
    }));

    let sectionIdx = -1;
    let inIdx = -1;
    for (let i = 0; i < months.length; i++) {
      const idxIn = months[i].list.findIndex(
        (e) => e.id === id && e.kind === kind,
      );
      if (idxIn >= 0) {
        sectionIdx = i;
        inIdx = idxIn;
        break;
      }
    }
    if (sectionIdx < 0) return;
    const me = months[sectionIdx].list[inIdx];
    const mySort = me.sort_at;

    type Patch = { id: string; kind: "photo" | "event"; sortAt: string };
    const patches: Patch[] = [];
    const norm = (s: string) => new Date(s).toISOString();

    if (direction === -1) {
      if (inIdx > 0) {
        const neighbor = months[sectionIdx].list[inIdx - 1];
        patches.push({ id: me.id, kind: me.kind, sortAt: norm(neighbor.sort_at) });
        patches.push({ id: neighbor.id, kind: neighbor.kind, sortAt: norm(mySort) });
      } else {
        const prev = months[sectionIdx - 1];
        if (!prev) return;
        const last = prev.list[prev.list.length - 1];
        const lastDate = new Date(last.sort_at);
        let candidate = new Date(lastDate.getTime() + 60 * 1000);
        const endOfPrev = new Date(
          lastDate.getFullYear(),
          lastDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
        if (candidate > endOfPrev) candidate = endOfPrev;
        patches.push({ id: me.id, kind: me.kind, sortAt: candidate.toISOString() });
      }
    } else {
      const list = months[sectionIdx].list;
      if (inIdx < list.length - 1) {
        const neighbor = list[inIdx + 1];
        patches.push({ id: me.id, kind: me.kind, sortAt: norm(neighbor.sort_at) });
        patches.push({ id: neighbor.id, kind: neighbor.kind, sortAt: norm(mySort) });
      } else {
        const next = months[sectionIdx + 1];
        if (!next) return;
        const first = next.list[0];
        const firstDate = new Date(first.sort_at);
        let candidate = new Date(firstDate.getTime() - 60 * 1000);
        const startOfNext = new Date(
          firstDate.getFullYear(),
          firstDate.getMonth(),
          1,
          0,
          0,
          0,
          0,
        );
        if (candidate < startOfNext) candidate = startOfNext;
        patches.push({ id: me.id, kind: me.kind, sortAt: candidate.toISOString() });
      }
    }

    // Optimistic local updates.
    for (const p of patches) {
      if (p.kind === "photo") {
        optimisticUpdate(p.id, { sort_at: p.sortAt });
      } else {
        setEvents((prev) =>
          prev.map((ev) => (ev.id === p.id ? { ...ev, sort_at: p.sortAt } : ev)),
        );
      }
    }

    const userName =
      typeof window !== "undefined"
        ? localStorage.getItem("yb_name") ?? ""
        : "";

    try {
      const results = await Promise.all(
        patches.map((p) =>
          fetch(
            p.kind === "photo" ? `/api/photos/${p.id}` : `/api/events/${p.id}`,
            {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                sortAt: p.sortAt,
                userName: userName || undefined,
              }),
            },
          ),
        ),
      );
      let failedDetail: string | null = null;
      for (const res of results) {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error("Move PATCH failed", res.status, body);
          failedDetail = JSON.stringify(body);
        }
      }
      if (failedDetail && typeof window !== "undefined") {
        if (/sort_at/i.test(failedDetail)) {
          window.alert(
            "Sauvegarde impossible : applique les migrations Supabase 0007 (photos) et 0009 (events).",
          );
        } else if (/locked/i.test(failedDetail)) {
          window.alert("Les modifications sont actuellement verrouillées par l'admin.");
        } else {
          window.alert("Sauvegarde de la position en échec.\n\nDétail :\n" + failedDetail);
        }
      }
    } catch (e) {
      console.error("Move PATCH network error", e);
    } finally {
      void refreshPhotos();
    }
  }

  // Backwards-compatible wrapper for the existing PhotoSection prop.
  function moveOrphan(id: string, direction: -1 | 1) {
    return moveItem(id, "photo", direction);
  }
  function moveEventItem(id: string, direction: -1 | 1) {
    return moveItem(id, "event", direction);
  }

  return (
    <div className="min-h-screen">
      <Aurora colors={onHero ? HERO_PALETTE : palette} fast={onHero} />

      <Hero
        title={yearbook.title}
        subtitle={YEARBOOK_SUBTITLE}
        onProgress={(p) => setOnHero(p < 0.5)}
      />

      <div
        id="yearbook-content"
        className="mx-auto flex max-w-6xl gap-8 px-6 pt-12"
      >
        <aside className="sticky top-12 hidden h-[calc(100vh-3rem)] w-64 shrink-0 lg:block">
          <Timeline sections={sections} />
        </aside>

        <main className="min-w-0 flex-1 pb-32">
          <Stats
            photoCount={photos.length}
            contributors={contributorCount}
            demo={demo}
            isAdmin={isAdmin}
          />

          {people.length > 0 && (
            <div className="mb-6 mt-6 flex items-center gap-3">
              <Filter className="h-4 w-4 text-white/60" />
              <PeopleFilter
                people={people}
                active={activePeople}
                onChange={setActivePeople}
              />
            </div>
          )}

          {!canMutate && (
            <div className="mt-2 mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-100/80">
              Les modifications sont actuellement désactivées par l'admin.
            </div>
          )}

          {sections.length === 0 ? (
            <EmptyState
              isAdmin={isAdmin}
              hasPeople={people.length > 0}
              canMutate={canMutate}
              onUploadClick={() => setUploadOpen(true)}
              onAdminClick={() => setAdminOpen(true)}
            />
          ) : (
            sections.map((s) => (
              <PhotoSection
                key={s.key}
                id={`s-${s.key}`}
                title={s.title}
                items={s.items}
                isAdmin={isAdmin}
                canMutate={canMutate}
                events={events}
                orphanIds={orphanIds}
                eventTimelineIds={eventTimelineIds}
                onMovePhoto={canMutate ? moveOrphan : undefined}
                onMoveEvent={canMutate ? moveEventItem : undefined}
                onOpenEvent={(id) => setOpenEventId(id)}
                onPhotoUpdate={(id, patch) => {
                  optimisticUpdate(id, patch);
                  void refreshPhotos();
                }}
                onPhotoDelete={(id) => {
                  optimisticDelete(id);
                  void refreshPhotos();
                }}
              />
            ))
          )}
        </main>
      </div>

      <div
        className={cn(
          "fixed bottom-6 right-6 z-30 flex items-end gap-2 transition-all duration-500 ease-out",
          onHero
            ? "pointer-events-none translate-y-32 opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <div data-info-root>
          {infoOpen && (
            <div className="fixed bottom-20 right-4 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#0d1422]/90 p-5 shadow-2xl backdrop-blur-2xl">
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                aria-label="Fermer"
                className="absolute right-2 top-2 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white/90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="pr-5 text-base leading-snug text-white/85">
                Veille à proposer des images qui résument un moment marquant
                pour plusieurs élèves.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                Le contenu est en accès libre — pas d'image sans le
                consentement des personnes visibles.
              </p>
              <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-white/40">
                Réservé aux 2e année de la prépa de l'Essouriau et à leurs
                professeurs
              </p>
              <p className="mt-3 text-[11px] italic leading-relaxed text-white/40">
                Les délégués feront ensuite le tri pour que le rendu final
                ressemble à toute la promo.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            aria-label="Informations"
            aria-expanded={infoOpen}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/10 backdrop-blur transition",
              infoOpen
                ? "border-white/40 text-white"
                : "border-white/15 text-white/80 hover:bg-white/20 hover:text-white",
            )}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={() => setAdminOpen(true)}
            aria-label="Membres"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 shadow-sm backdrop-blur transition hover:bg-white/20 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
        {canMutate && (
          <button
            onClick={() => setUploadOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85 shadow-sm backdrop-blur transition hover:bg-white/20 hover:text-white",
            )}
          >
            <Plus className="h-4 w-4" />
            Ajouter une photo
          </button>
        )}
      </div>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        people={people}
        events={events}
        demo={demo}
        onUploaded={onUploaded}
        onCommit={() => {
          void refreshPhotos();
        }}
        onEventCreated={(ev) => {
          setEvents((prev) =>
            prev.find((e) => e.id === ev.id) ? prev : [...prev, ev],
          );
        }}
      />

      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        people={people}
        locked={locked}
        demo={demo}
      />

      {openEvent && (
        <EventModal
          event={openEvent}
          photos={openEventPhotos}
          isAdmin={isAdmin}
          canMutate={canMutate}
          events={events}
          onClose={() => setOpenEventId(null)}
          onPhotoUpdate={(id, patch) => {
            optimisticUpdate(id, patch);
            void refreshPhotos();
          }}
          onPhotoDelete={(id) => {
            optimisticDelete(id);
            void refreshPhotos();
          }}
        />
      )}
    </div>
  );
}

function Stats({
  photoCount,
  contributors,
  demo,
  isAdmin,
}: {
  photoCount: number;
  contributors: number;
  demo: boolean;
  isAdmin: boolean;
}) {
  if (photoCount === 0 && !demo && !isAdmin) return null;
  return (
    <p className="float-in pb-2 text-xs text-white/55">
      {photoCount > 0 && (
        <>
          {photoCount} photo{photoCount > 1 ? "s" : ""} ·{" "}
          {contributors || 1} contributeur{contributors > 1 ? "s" : ""}
        </>
      )}
      {(demo || isAdmin) && (
        <>
          {photoCount > 0 ? " · " : ""}
          {demo && <span className="text-accent">démo</span>}
          {demo && isAdmin && " · "}
          {isAdmin && <span className="text-white/85">admin</span>}
        </>
      )}
    </p>
  );
}

function EmptyState({
  isAdmin,
  hasPeople,
  canMutate,
  onUploadClick,
  onAdminClick,
}: {
  isAdmin: boolean;
  hasPeople: boolean;
  canMutate: boolean;
  onUploadClick: () => void;
  onAdminClick: () => void;
}) {
  return (
    <div className="mt-16 rounded-3xl border-2 border-dashed border-white/15 p-12 text-center">
      <div className="text-5xl">📷</div>
      <h2 className="font-display mt-3 text-2xl font-semibold text-white/70">
        Pas encore de photo
      </h2>
      <p className="mt-2 text-white/60">
        Sois le premier à en déposer pour démarrer la frise.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {canMutate && (
          <button
            onClick={onUploadClick}
            className="rounded-full bg-accent px-6 py-3 text-cream"
          >
            Ajouter des photos
          </button>
        )}
        {isAdmin && !hasPeople && (
          <button
            onClick={onAdminClick}
            className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm text-white/70 hover:bg-white/15"
          >
            Configurer les membres
          </button>
        )}
      </div>
    </div>
  );
}
