"use client";

import Image from "next/image";
import { useState } from "react";
import type { Photo } from "@/lib/types";
import { formatDateFr } from "@/lib/utils";

export default function PhotoSection({
  id,
  title,
  photos,
}: {
  id: string;
  title: string;
  photos: Photo[];
}) {
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
        <span className="text-sm text-ink/50">
          {photos.length} photo{photos.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* CSS columns masonry: each photo flows at its natural aspect ratio,
          taller photos take more vertical space without cropping. */}
      <div className="columns-1 gap-4 md:columns-2 [column-fill:_balance]">
        {photos.map((p) => (
          <PhotoCard key={p.id} photo={p} />
        ))}
      </div>
    </section>
  );
}

function PhotoCard({ photo }: { photo: Photo }) {
  const [open, setOpen] = useState(false);

  // Fall back to 3:2 if width/height are missing (older uploads).
  const w = photo.width || 1200;
  const h = photo.height || 800;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-ink/5 shadow-sm transition hover:shadow-xl"
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        <Image
          src={photo.thumb_url}
          alt={photo.caption ?? "Photo"}
          fill
          // `object-contain` would letterbox; `object-cover` here is safe
          // because the container already has the photo's exact ratio.
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent p-4 text-left opacity-0 transition group-hover:opacity-100">
          {photo.caption && (
            <p className="font-hand text-lg text-white">{photo.caption}</p>
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
