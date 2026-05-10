"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Photo } from "@/lib/types";
import { cn, formatDateFr } from "@/lib/utils";

type Variant = "small" | "medium" | "large" | "hero";

// Tailwind needs the literal class names at build time, so we map variants to
// strings rather than building them dynamically.
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
}: {
  id: string;
  title: string;
  photos: Photo[];
}) {
  // Decide each photo's size: ratio-driven, with small randomization based on
  // the photo id (so it's stable across re-renders, and varied between photos
  // even with the same ratio).
  const variants = useMemo<Map<string, Variant>>(() => {
    const map = new Map<string, Variant>();
    photos.forEach((p, i) => {
      const ratio = (p.width || 1200) / (p.height || 800);
      let v: Variant;
      if (ratio > 1.85) v = "hero";
      else if (ratio > 1.4) v = i % 3 === 0 ? "large" : "medium";
      else if (ratio > 0.9) v = i % 4 === 0 ? "large" : "medium";
      else v = i % 5 === 0 ? "medium" : "small";
      // Promote one photo every ~7 to add a hero break, regardless of ratio.
      if (i > 0 && i % 7 === 0 && v !== "hero" && ratio > 1.1) v = "hero";
      map.set(p.id, v);
    });
    return map;
  }, [photos]);

  return (
    <section
      id={id}
      // Soft pull at the bottom of each month thanks to `snap-end`
      // combined with `snap-y snap-proximity` on the parent.
      className="snap-end scroll-mt-28 py-12"
    >
      <div className="mb-6 flex items-baseline gap-4">
        <h2 className="font-display text-3xl font-semibold capitalize tracking-tight">
          {title}
        </h2>
        <span className="text-sm text-white/50">
          {photos.length} photo{photos.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* 6-column grid on desktop, 2 cols on mobile. Items take 2/3/4/6 cols
          depending on their aspect ratio + a touch of variation, so the page
          doesn't read as a uniform 3-up. `items-start` keeps each photo at
          its natural height (no vertical stretching). `grid-auto-flow: dense`
          lets the engine reshuffle small items into earlier gaps. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6 [grid-auto-flow:dense] items-start">
        {photos.map((p) => (
          <PhotoCard
            key={p.id}
            photo={p}
            variantClass={VARIANT_CLASS[variants.get(p.id) ?? "medium"]}
          />
        ))}
      </div>
    </section>
  );
}

function PhotoCard({
  photo,
  variantClass,
}: {
  photo: Photo;
  variantClass: string;
}) {
  const [open, setOpen] = useState(false);

  // Fall back to 3:2 if width/height are missing.
  const w = photo.width || 1200;
  const h = photo.height || 800;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-photo-id={photo.id}
        data-thumb-url={photo.thumb_url}
        className={cn(
          "group relative block w-full overflow-hidden rounded-2xl bg-ink/5 shadow-sm transition hover:shadow-xl",
          variantClass,
        )}
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        <Image
          src={photo.thumb_url}
          alt={photo.caption ?? "Photo"}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent p-4 text-left opacity-0 transition group-hover:opacity-100">
          {photo.caption && (
            <p className="font-hand text-lg text-white/70">{photo.caption}</p>
          )}
          <p className="mt-1 text-xs text-white/80">
            {formatDateFr(photo.taken_at)} · par {photo.uploader_name}
          </p>
        </div>
      </button>

      {open && <Lightbox photo={photo} onClose={() => setOpen(false)} />}
    </>
  );
}

function Lightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-full max-w-5xl"
      >
        <Image
          src={photo.url}
          alt={photo.caption ?? ""}
          width={photo.width || 1200}
          height={photo.height || 800}
          className="max-h-[80vh] w-auto rounded-xl object-contain"
        />
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
