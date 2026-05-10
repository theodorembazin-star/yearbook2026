"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import type { Photo } from "@/lib/types";
import { cn, formatDateFr } from "@/lib/utils";

type Variant = "small" | "medium" | "large" | "hero";

const VARIANT_CLASS: Record<Variant, string> = {
  small: "col-span-1 md:col-span-2",
  medium: "col-span-2 md:col-span-3",
  large: "col-span-2 md:col-span-4",
  hero: "col-span-2 md:col-span-6",
};

export default function PhotoSection({
  id,
  title,
  photos,
  isAdmin = false,
}: {
  id: string;
  title: string;
  photos: Photo[];
  isAdmin?: boolean;
}) {
  const variants = useMemo<Map<string, Variant>>(() => {
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

  return (
    <section id={id} className="scroll-mt-28 py-12">
      <div className="mb-6 flex items-baseline gap-4">
        <h2 className="font-display text-3xl font-semibold capitalize tracking-tight">
          {title}
        </h2>
        <span className="text-sm text-white/50">
          {photos.length} photo{photos.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-6 [grid-auto-flow:dense] items-start">
        {photos.map((p) => (
          <PhotoCard
            key={p.id}
            photo={p}
            variantClass={VARIANT_CLASS[variants.get(p.id) ?? "medium"]}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </section>
  );
}

function PhotoCard({
  photo,
  variantClass,
  isAdmin,
}: {
  photo: Photo;
  variantClass: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const search = useSearchParams();
  const adminToken = search.get("admin") ?? "";

  const w = photo.width || 1200;
  const h = photo.height || 800;
  const isVideo = photo.kind === "video";
  const isHidden = photo.status === "hidden";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        data-photo-id={photo.id}
        data-thumb-url={photo.thumb_url}
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

        {/* Caption gradient — non-interactive so it never eats clicks. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent p-4 text-left opacity-0 transition group-hover:opacity-100">
          {photo.caption && (
            <p className="font-hand text-lg text-white/70">{photo.caption}</p>
          )}
          <p className="mt-1 text-xs text-white/80">
            {formatDateFr(photo.taken_at)} · par {photo.uploader_name}
          </p>
        </div>

        {isHidden && (
          <div className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70 backdrop-blur">
            masqué
          </div>
        )}

        {isAdmin && (
          <AdminControls
            photo={photo}
            adminToken={adminToken}
            isHidden={isHidden}
          />
        )}
      </div>

      {open && <Lightbox photo={photo} onClose={() => setOpen(false)} />}
    </>
  );
}

function AdminControls({
  photo,
  adminToken,
  isHidden,
}: {
  photo: Photo;
  adminToken: string;
  isHidden: boolean;
}) {
  const [busy, setBusy] = useState<"hide" | "delete" | null>(null);

  async function toggleHide(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy("hide");
    try {
      await fetch(
        `/api/photos/${photo.id}?admin=${encodeURIComponent(adminToken)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status: isHidden ? "published" : "hidden",
          }),
        },
      );
      // Realtime will reflect the change.
    } finally {
      setBusy(null);
    }
  }

  async function remove(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    if (!confirm("Supprimer cette photo définitivement ?")) return;
    setBusy("delete");
    try {
      await fetch(
        `/api/photos/${photo.id}?admin=${encodeURIComponent(adminToken)}`,
        { method: "DELETE" },
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="absolute right-2 top-2 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
      <button
        type="button"
        onClick={toggleHide}
        disabled={busy !== null}
        aria-label={isHidden ? "Afficher" : "Masquer"}
        title={isHidden ? "Afficher" : "Masquer"}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/85 backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
      >
        {busy === "hide" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isHidden ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy !== null}
        aria-label="Supprimer"
        title="Supprimer"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/85 backdrop-blur transition hover:bg-red-600/80 hover:text-white disabled:opacity-50"
      >
        {busy === "delete" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function Lightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const isVideo = photo.kind === "video";
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-full max-w-5xl"
      >
        {isVideo ? (
          <video
            src={photo.url}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] w-auto rounded-xl"
          />
        ) : (
          <Image
            src={photo.url}
            alt={photo.caption ?? ""}
            width={photo.width || 1200}
            height={photo.height || 800}
            className="max-h-[80vh] w-auto rounded-xl object-contain"
          />
        )}
        <div className="mt-3 text-center text-cream">
          {photo.caption && <p className="font-hand text-2xl">{photo.caption}</p>}
          <p className="mt-1 text-sm text-cream/70">
            {formatDateFr(photo.taken_at)} · par {photo.uploader_name}
          </p>
        </div>
      </div>
    </div>
  );
}
