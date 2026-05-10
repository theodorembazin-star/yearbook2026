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
    <section id={id} className="scroll-mt-28 py-12">
      <div className="mb-6 flex items-baseline gap-4">
        <h2 className="font-display text-3xl font-semibold capitalize tracking-tight">
          {title}
        </h2>
        <span className="text-sm text-ink/50">
          {photos.length} photo{photos.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Magazine-style mosaic: alternating sizes */}
      <div className="grid grid-cols-12 gap-4">
        {photos.map((p, i) => (
          <PhotoCard key={p.id} photo={p} index={i} total={photos.length} />
        ))}
      </div>
    </section>
  );
}

function PhotoCard({ photo, index, total }: { photo: Photo; index: number; total: number }) {
  const [open, setOpen] = useState(false);

  // Simple mosaic heuristic: every 3rd photo is wider; first photo of section gets extra height.
  const wide = index % 3 === 0 && total > 1;
  const tall = index === 0 && total > 2;
  const colSpan = wide ? "col-span-12 md:col-span-8" : "col-span-12 md:col-span-4";
  const aspect = tall ? "aspect-[4/5]" : wide ? "aspect-[16/10]" : "aspect-[3/2]";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`group relative ${colSpan} ${aspect} overflow-hidden rounded-2xl bg-ink/5 shadow-sm transition hover:shadow-xl`}
      >
        <Image
          src={photo.thumb_url}
          alt={photo.caption ?? "Photo"}
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
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
          width={photo.width}
          height={photo.height}
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
