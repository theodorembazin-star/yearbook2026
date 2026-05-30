"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Layers, Loader2, Trash2, X } from "lucide-react";
import type { Event, Photo } from "@/lib/types";
import { cn, formatDateFr } from "@/lib/utils";
import { Lightbox } from "./PhotoSection";

type Variant = "small" | "medium" | "large" | "hero";

const VARIANT_CLASS: Record<Variant, string> = {
  small: "col-span-1 md:col-span-2",
  medium: "col-span-2 md:col-span-3",
  large: "col-span-2 md:col-span-4",
  hero: "col-span-2 md:col-span-6",
};

type Props = {
  event: Event;
  photos: Photo[];
  isAdmin?: boolean;
  onClose: () => void;
  onPhotoUpdate?: (id: string, patch: Partial<Photo>) => void;
  onPhotoDelete?: (id: string) => void;
};

export default function EventModal({
  event,
  photos,
  isAdmin = false,
  onClose,
  onPhotoUpdate,
  onPhotoDelete,
}: Props) {
  const search = useSearchParams();
  const adminToken = search.get("admin") ?? "";
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  // Lock scroll while open
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const variants = useMemo(() => {
    const map = new Map<string, Variant>();
    photos.forEach((p, i) => {
      const ratio = (p.width || 1200) / (p.height || 800);
      let v: Variant;
      if (ratio > 1.85) v = "hero";
      else if (ratio > 1.4) v = i % 3 === 0 ? "large" : "medium";
      else if (ratio > 0.9) v = i % 4 === 0 ? "large" : "medium";
      else v = i % 5 === 0 ? "medium" : "small";
      if (i > 0 && i % 7 === 0 && v !== "hero" && ratio > 1.1) v = "hero";
      map.set(p.id, v);
    });
    return map;
  }, [photos]);

  const range = useMemo(() => {
    if (photos.length === 0) return null;
    const first = photos[0]?.taken_at;
    const last = photos[photos.length - 1]?.taken_at;
    if (!first || !last) return null;
    if (first === last) return formatDateFr(first);
    return `${formatDateFr(first)} → ${formatDateFr(last)}`;
  }, [photos]);

  async function deleteEvent() {
    if (busyDelete) return;
    setBusyDelete(true);
    try {
      const res = await fetch(
        `/api/events/${event.id}?admin=${encodeURIComponent(adminToken)}`,
        { method: "DELETE" },
      );
      if (res.ok) onClose();
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto min-h-screen max-w-6xl px-6 py-12"
      >
        <header className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-white/70 backdrop-blur">
              <Layers className="h-3 w-3" />
              Évènement
            </div>
            <h2 className="font-display mt-2 text-3xl font-bold leading-tight tracking-tight text-white/90 md:text-5xl">
              {event.title}
            </h2>
            <p className="mt-2 text-sm text-white/55">
              {photos.length} photo{photos.length > 1 ? "s" : ""}
              {range && <> · {range}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={deleteEvent}
                disabled={busyDelete}
                aria-label="Supprimer l'évènement"
                title="Supprimer l'évènement (les photos sont conservées)"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 backdrop-blur transition hover:bg-red-600/30 hover:text-white disabled:opacity-50"
              >
                {busyDelete ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {photos.length === 0 ? (
          <p className="text-center text-white/55">Aucune photo dans cet évènement.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6 [grid-auto-flow:dense] items-start">
            {photos.map((p) => (
              <EventPhotoCard
                key={p.id}
                photo={p}
                variantClass={VARIANT_CLASS[variants.get(p.id) ?? "medium"]}
                isAdmin={isAdmin}
                adminToken={adminToken}
                onOpen={() => setLightbox(p)}
                onUpdate={onPhotoUpdate}
                onDelete={onPhotoDelete}
              />
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <Lightbox
          photo={lightbox}
          onClose={() => setLightbox(null)}
          onUpdate={onPhotoUpdate}
        />
      )}
    </div>
  );
}

function EventPhotoCard({
  photo,
  variantClass,
  isAdmin,
  adminToken,
  onOpen,
  onUpdate,
  onDelete,
}: {
  photo: Photo;
  variantClass: string;
  isAdmin: boolean;
  adminToken: string;
  onOpen: () => void;
  onUpdate?: (id: string, patch: Partial<Photo>) => void;
  onDelete?: (id: string) => void;
}) {
  const w = photo.width || 1200;
  const h = photo.height || 800;
  const isVideo = photo.kind === "video";
  const isHidden = photo.status === "hidden";
  const [busy, setBusy] = useState<"hide" | "delete" | null>(null);

  async function toggleHide(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy("hide");
    const next: Photo["status"] = isHidden ? "published" : "hidden";
    try {
      const res = await fetch(
        `/api/photos/${photo.id}?admin=${encodeURIComponent(adminToken)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      if (res.ok) onUpdate?.(photo.id, { status: next });
    } finally {
      setBusy(null);
    }
  }

  async function remove(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy("delete");
    try {
      const res = await fetch(
        `/api/photos/${photo.id}?admin=${encodeURIComponent(adminToken)}`,
        { method: "DELETE" },
      );
      if (res.ok) onDelete?.(photo.id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group relative block w-full cursor-pointer overflow-hidden rounded-2xl bg-ink/5 shadow-sm transition hover:shadow-xl",
        variantClass,
        isHidden && "opacity-50",
      )}
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      {isVideo ? (
        <video
          src={photo.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        <Image
          src={photo.thumb_url}
          alt={photo.caption ?? "Photo"}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="translate-y-3 transition-transform duration-300 ease-out group-hover:translate-y-0">
          {photo.caption && (
            <p className="font-display text-lg italic text-white/85">
              {photo.caption}
            </p>
          )}
          <p className="mt-1 text-xs text-white/75">
            {formatDateFr(photo.taken_at)} · par {photo.uploader_name}
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="absolute right-2 top-2 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={toggleHide}
            disabled={busy !== null}
            aria-label={isHidden ? "Afficher" : "Masquer"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/85 backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
          >
            {busy === "hide" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isHidden ? (
              <span className="text-xs">👁</span>
            ) : (
              <span className="text-xs">⊘</span>
            )}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            aria-label="Supprimer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/85 backdrop-blur transition hover:bg-red-600/80 hover:text-white disabled:opacity-50"
          >
            {busy === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
