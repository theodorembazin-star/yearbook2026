"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Filter, Settings, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Aurora from "./Aurora";
import Hero from "./Hero";
import { extractPalette, DEFAULT_PALETTE, HERO_PALETTE } from "@/lib/colors";
import { YEARBOOK_SUBTITLE } from "@/lib/config";
import type { Person, Photo, Yearbook } from "@/lib/types";
import { monthKey, formatMonthFr } from "@/lib/utils";
import Timeline from "./Timeline";
import PhotoSection from "./PhotoSection";
import UploadDialog from "./UploadDialog";
import PeopleFilter from "./PeopleFilter";
import AdminPanel from "./AdminPanel";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { photoFromRow } from "@/lib/db";
import { YEARBOOK_ID } from "@/lib/config";

type Props = {
  yearbook: Yearbook;
  photos: Photo[];
  people: Person[];
  isAdmin?: boolean;
  demo?: boolean;
};

export default function YearbookView({
  yearbook,
  photos: initial,
  people: initialPeople,
  isAdmin = false,
  demo = false,
}: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activePeople, setActivePeople] = useState<string[]>([]);

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

  // Single source of truth for refetching photos. Goes through a server
  // endpoint that uses the service-role client, so it never gets blocked
  // by RLS (the browser client + anon key sometimes returns empty here).
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
        return; // keep current state instead of blanking the grid
      }
      const { photos: rows } = (await res.json()) as { photos: unknown[] };
      setPhotos((rows ?? []).map(photoFromRow as never));
    } catch (e) {
      console.warn("refreshPhotos network error:", e);
    }
  }, [demo, isAdmin]);

  // Optimistic helpers — used in demo mode where there's no DB to refetch.
  const optimisticUpdate = useCallback(
    (id: string, patch: Partial<Photo>) => {
      setPhotos((prev) => {
        const out = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
        // If we're not admin and the photo just became hidden, drop it from
        // the local list too so the visitor view matches the server.
        return isAdmin
          ? out
          : out.filter((p) => p.status !== "hidden");
      });
    },
    [isAdmin],
  );
  const optimisticDelete = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Realtime: refetch on any photo or person change
  useEffect(() => {
    if (demo || !isSupabaseConfigured()) return;
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`yearbook:${YEARBOOK_ID}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos", filter: `yearbook_id=eq.${YEARBOOK_ID}` },
        () => {
          void refreshPhotos();
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
    // Demo path: append the freshly produced Photo[] to local state.
    setPhotos((prev) => [...prev, ...newPhotos]);
  }

  // ---------- Aurora palette derived from currently visible photos ----------
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE);
  // While the visitor is on the welcome screen we override with a navy/green
  // palette. Once they commit past the hero, we revert to the photo-derived
  // palette below. Threshold is intentionally low so the swap happens early
  // in the resistance zone — the Aurora's CSS transition smooths it out.
  const [onHero, setOnHero] = useState(true);
  const palettesRef = useRef<Map<string, string[]>>(new Map());
  const visibleRef = useRef<Set<string>>(new Set());
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;

  // Extract palettes for every photo in the background, with a 2-concurrent
  // queue so we don't block the main thread.
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
            // If this photo is currently the topmost visible, refresh palette.
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
    // Photos are already sorted ascending by date in the DOM order.
    for (const p of photosRef.current) {
      if (visible.has(p.id)) {
        const palette = palettesRef.current.get(p.id);
        if (palette) return palette;
      }
    }
    return null;
  }

  // Observe photo cards: when a new one becomes visible, refresh aurora.
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
    // Re-run when the rendered photo set changes
  }, [sections]);

  return (
    <div className="min-h-screen">
      <Aurora colors={onHero ? HERO_PALETTE : palette} fast={onHero} />

      <Hero
        title={yearbook.title}
        subtitle={YEARBOOK_SUBTITLE}
        onProgress={(p) => setOnHero(p < 0.5)}
      />

      {/* `snap-y` + `snap-proximity` provides a gentle pull at month
          boundaries without hard-stopping the scroll. */}
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

          {sections.length === 0 ? (
            <EmptyState
              isAdmin={isAdmin}
              hasPeople={people.length > 0}
              onUploadClick={() => setUploadOpen(true)}
              onAdminClick={() => setAdminOpen(true)}
            />
          ) : (
            sections.map((s) => (
              <PhotoSection
                key={s.key}
                id={`s-${s.key}`}
                title={s.title}
                photos={s.items}
                isAdmin={isAdmin}
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

      {/* Discreet floating actions bottom-right.
          - Hidden while the welcome screen is in view; slides up from
            below once the visitor crosses into the yearbook.
          - Upload: small pill, neutral colors
          - Admin (only when authenticated): icon-only gear */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-30 flex items-end gap-2 transition-all duration-500 ease-out",
          onHero
            ? "pointer-events-none translate-y-32 opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        {/* Info popover — anchored above the icon button */}
        <div className="relative" data-info-root>
          {infoOpen && (
            <div className="absolute bottom-full right-0 mb-3 w-80 rounded-2xl border border-white/10 bg-[#0d1422]/90 p-5 shadow-2xl backdrop-blur-2xl">
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
        <button
          onClick={() => setUploadOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85 shadow-sm backdrop-blur transition hover:bg-white/20 hover:text-white",
          )}
        >
          <Plus className="h-4 w-4" />
          Ajouter une photo
        </button>
      </div>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        people={people}
        demo={demo}
        onUploaded={onUploaded}
        onCommit={() => {
          void refreshPhotos();
        }}
      />

      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        people={people}
        demo={demo}
      />
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
  onUploadClick,
  onAdminClick,
}: {
  isAdmin: boolean;
  hasPeople: boolean;
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
        <button
          onClick={onUploadClick}
          className="rounded-full bg-accent px-6 py-3 text-cream"
        >
          Ajouter des photos
        </button>
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
