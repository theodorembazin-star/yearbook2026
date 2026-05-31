"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { Event, Photo } from "@/lib/types";
import { cn, formatDateFr } from "@/lib/utils";

type Variant = "small" | "medium" | "large" | "hero";

const VARIANT_CLASS: Record<Variant, string> = {
  small: "col-span-1 md:col-span-2",
  medium: "col-span-2 md:col-span-3",
  large: "col-span-2 md:col-span-4",
  hero: "col-span-2 md:col-span-6",
};

export type TimelineItem =
  | { kind: "photo"; photo: Photo }
  | {
      kind: "event";
      bundle: { event: Event; cover: Photo; count: number; date: string };
    };

type SectionProps = {
  id: string;
  title: string;
  items: TimelineItem[];
  isAdmin?: boolean;
  /** false → uploads/edits/moves/deletes are disabled for everyone but admin. */
  canMutate?: boolean;
  events?: Event[];
  /** Flat ordered list of orphan photo IDs, used to enable/disable
   *  the up/down arrows on the first/last photo. */
  orphanIds?: string[];
  onMovePhoto?: (id: string, direction: -1 | 1) => void;
  onOpenEvent?: (id: string) => void;
  onPhotoUpdate?: (id: string, patch: Partial<Photo>) => void;
  onPhotoDelete?: (id: string) => void;
};

export default function PhotoSection({
  id,
  title,
  items,
  isAdmin = false,
  canMutate = true,
  events = [],
  orphanIds,
  onMovePhoto,
  onOpenEvent,
  onPhotoUpdate,
  onPhotoDelete,
}: SectionProps) {
  const variants = useMemo<Map<string, Variant>>(() => {
    const map = new Map<string, Variant>();
    items.forEach((it, i) => {
      const key = it.kind === "photo" ? it.photo.id : it.bundle.event.id;
      const dims =
        it.kind === "photo"
          ? { w: it.photo.width || 1200, h: it.photo.height || 800 }
          : {
              w: it.bundle.cover.width || 1200,
              h: it.bundle.cover.height || 800,
            };
      const ratio = dims.w / dims.h;
      let v: Variant;
      if (ratio > 1.85) v = "hero";
      else if (ratio > 1.4) v = i % 3 === 0 ? "large" : "medium";
      else if (ratio > 0.9) v = i % 4 === 0 ? "large" : "medium";
      else v = i % 5 === 0 ? "medium" : "small";
      if (i > 0 && i % 7 === 0 && v !== "hero" && ratio > 1.1) v = "hero";
      // Events get a bit more presence by default
      if (it.kind === "event" && v === "small") v = "medium";
      map.set(key, v);
    });
    return map;
  }, [items]);

  return (
    <section id={id} className="scroll-mt-28 py-12">
      <div className="mb-6 flex items-baseline gap-4">
        <h2 className="font-display text-3xl font-semibold capitalize tracking-tight">
          {title}
        </h2>
        <span className="text-sm text-white/50">
          {items.length} élément{items.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-6 [grid-auto-flow:dense] items-start">
        {items.map((it) =>
          it.kind === "photo" ? (
            <PhotoCard
              key={it.photo.id}
              photo={it.photo}
              variantClass={VARIANT_CLASS[variants.get(it.photo.id) ?? "medium"]}
              isAdmin={isAdmin}
              canMutate={canMutate}
              events={events}
              canMoveUp={
                !!orphanIds && orphanIds.indexOf(it.photo.id) > 0
              }
              canMoveDown={
                !!orphanIds &&
                orphanIds.indexOf(it.photo.id) >= 0 &&
                orphanIds.indexOf(it.photo.id) < orphanIds.length - 1
              }
              onMove={onMovePhoto}
              onUpdate={onPhotoUpdate}
              onDelete={onPhotoDelete}
            />
          ) : (
            <EventTile
              key={it.bundle.event.id}
              bundle={it.bundle}
              variantClass={
                VARIANT_CLASS[variants.get(it.bundle.event.id) ?? "medium"]
              }
              onOpen={() => onOpenEvent?.(it.bundle.event.id)}
            />
          ),
        )}
      </div>
    </section>
  );
}

function EventTile({
  bundle,
  variantClass,
  onOpen,
}: {
  bundle: { event: Event; cover: Photo; count: number; date: string };
  variantClass: string;
  onOpen: () => void;
}) {
  const w = bundle.cover.width || 1200;
  const h = bundle.cover.height || 800;
  const isVideo = bundle.cover.kind === "video";
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
      )}
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      {isVideo ? (
        <video
          src={bundle.cover.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        <Image
          src={bundle.cover.thumb_url}
          alt={bundle.event.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      )}

      {/* Stack indicator + title always visible at the bottom of the tile. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4">
        <div className="flex items-end justify-between gap-3">
          <p className="font-display text-lg font-semibold leading-tight text-white/90 line-clamp-2">
            {bundle.event.title}
          </p>
          <div className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/85 backdrop-blur">
            <Layers className="h-3 w-3" />
            {bundle.count}
          </div>
        </div>
      </div>

      {/* Top-right badge to signal it's a group, even before the title fades in. */}
      <div className="pointer-events-none absolute right-2 top-2 inline-flex h-6 items-center gap-1 rounded-full bg-black/50 px-2 text-[10px] uppercase tracking-wider text-white/80 backdrop-blur">
        <Layers className="h-3 w-3" />
        Évènement
      </div>
    </div>
  );
}

function PhotoCard({
  photo,
  variantClass,
  isAdmin,
  canMutate,
  events = [],
  canMoveUp,
  canMoveDown,
  onMove,
  onUpdate,
  onDelete,
}: {
  photo: Photo;
  variantClass: string;
  isAdmin: boolean;
  canMutate: boolean;
  events?: Event[];
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMove?: (id: string, direction: -1 | 1) => void;
  onUpdate?: (id: string, patch: Partial<Photo>) => void;
  onDelete?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const search = useSearchParams();
  const adminToken = search.get("admin") ?? "";

  const w = photo.width || 1200;
  const h = photo.height || 800;
  const isVideo = photo.kind === "video";
  const isHidden = photo.status === "hidden";

  function move(e: React.MouseEvent, direction: -1 | 1) {
    e.stopPropagation();
    onMove?.(photo.id, direction);
  }

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

        {isHidden && (
          <div className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70 backdrop-blur">
            masqué
          </div>
        )}

        {/* Reorder arrows — anyone can move a photo when mutations are open. */}
        {onMove && canMutate && (
          <div className="absolute left-2 top-2 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => move(e, -1)}
              disabled={!canMoveUp}
              aria-label="Reculer"
              title="Reculer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/85 backdrop-blur transition hover:bg-black/80 disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => move(e, 1)}
              disabled={!canMoveDown}
              aria-label="Avancer"
              title="Avancer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/85 backdrop-blur transition hover:bg-black/80 disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hover controls: admin gets hide/unhide; everyone gets delete
            (unless the yearbook is locked). */}
        {(isAdmin || canMutate) && (
          <HoverControls
            photo={photo}
            adminToken={adminToken}
            isAdmin={isAdmin}
            canDelete={canMutate}
            isHidden={isHidden}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        )}
      </div>

      {open && (
        <Lightbox
          photo={photo}
          canMutate={canMutate}
          events={events}
          onClose={() => setOpen(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}

function HoverControls({
  photo,
  adminToken,
  isAdmin,
  canDelete,
  isHidden,
  onUpdate,
  onDelete,
}: {
  photo: Photo;
  adminToken: string;
  isAdmin: boolean;
  canDelete: boolean;
  isHidden: boolean;
  onUpdate?: (id: string, patch: Partial<Photo>) => void;
  onDelete?: (id: string) => void;
}) {
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
    const userName =
      typeof window !== "undefined"
        ? localStorage.getItem("yb_name") ?? ""
        : "";
    try {
      const qs = new URLSearchParams();
      if (adminToken) qs.set("admin", adminToken);
      if (userName) qs.set("name", userName);
      const res = await fetch(`/api/photos/${photo.id}?${qs.toString()}`, {
        method: "DELETE",
      });
      if (res.ok) onDelete?.(photo.id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="absolute right-2 top-2 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
      {isAdmin && (
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
      )}
      {canDelete && (
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
      )}
    </div>
  );
}

// Convert an ISO date string to the value expected by <input type="datetime-local">
// (local time, no timezone suffix: "YYYY-MM-DDTHH:MM").
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function Lightbox({
  photo,
  canMutate = true,
  events = [],
  onClose,
  onUpdate,
}: {
  photo: Photo;
  canMutate?: boolean;
  events?: Event[];
  onClose: () => void;
  onUpdate?: (id: string, patch: Partial<Photo>) => void;
}) {
  const isVideo = photo.kind === "video";
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(photo.caption ?? "");
  const [draftDate, setDraftDate] = useState(isoToLocalInput(photo.taken_at));
  const [draftEventId, setDraftEventId] = useState<string>(photo.event_id ?? "");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function download(e: React.MouseEvent) {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(photo.url);
      if (!res.ok) throw new Error(`download_failed: ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const fromUrl = photo.url.split("?")[0].split(".").pop()?.toLowerCase();
      const fromMime = (blob.type || "").split("/")[1]?.split(";")[0];
      const ext =
        (fromUrl && fromUrl.length <= 4 ? fromUrl : fromMime) ??
        (isVideo ? "mp4" : "jpg");
      const safeName = (photo.uploader_name || "yearbook")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${safeName}-${photo.id.slice(0, 8)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }

  function startEdit() {
    setDraftCaption(photo.caption ?? "");
    setDraftDate(isoToLocalInput(photo.taken_at));
    setDraftEventId(photo.event_id ?? "");
    setEditError(null);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setEditError(null);
  }
  async function saveEdit() {
    if (saving) return;
    setSaving(true);
    setEditError(null);
    try {
      const body: Record<string, unknown> = {};
      const newCaption = draftCaption.trim();
      const currentCaption = (photo.caption ?? "").trim();
      if (newCaption !== currentCaption) body.caption = newCaption || null;
      if (draftDate) {
        const newIso = new Date(draftDate).toISOString();
        if (newIso !== photo.taken_at) body.takenAt = newIso;
      }
      const currentEvent = photo.event_id ?? "";
      if (draftEventId !== currentEvent) {
        body.eventId = draftEventId === "" ? null : draftEventId;
      }
      const userName =
        typeof window !== "undefined"
          ? localStorage.getItem("yb_name") ?? ""
          : "";
      if (userName) body.userName = userName;

      if (Object.keys(body).filter((k) => k !== "userName").length === 0) {
        setEditing(false);
        return;
      }
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `error_${res.status}`);
      }
      onUpdate?.(photo.id, {
        caption:
          typeof body.caption === "string"
            ? (body.caption as string)
            : body.caption === null
              ? undefined
              : photo.caption,
        taken_at:
          typeof body.takenAt === "string"
            ? (body.takenAt as string)
            : photo.taken_at,
        event_id:
          body.eventId === null
            ? undefined
            : typeof body.eventId === "string"
              ? (body.eventId as string)
              : photo.event_id,
      });
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

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

        {editing ? (
          <div className="mt-3 flex flex-col gap-2 text-cream">
            <input
              type="text"
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
              placeholder="Légende (optionnel)"
              maxLength={280}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-accent"
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="datetime-local"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent"
              />
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white">
                <Layers className="h-4 w-4 text-white/60" />
                <select
                  value={draftEventId}
                  onChange={(e) => setDraftEventId(e.target.value)}
                  className="bg-transparent text-white outline-none"
                >
                  <option value="" className="text-ink">
                    Aucun évènement
                  </option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id} className="text-ink">
                      {ev.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {editError && (
                <span className="text-xs text-red-300">{editError}</span>
              )}
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-2 text-sm text-white/75 hover:border-white/30 hover:text-white/90"
              >
                <X className="h-4 w-4" /> Annuler
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm text-cream shadow-lg shadow-accent/20 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-3 text-cream sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              {photo.caption && (
                <p className="font-display text-2xl italic">{photo.caption}</p>
              )}
              <p className="mt-1 text-sm text-cream/70">
                {formatDateFr(photo.taken_at)} · par {photo.uploader_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canMutate && (
                <button
                  type="button"
                  onClick={startEdit}
                  aria-label="Modifier"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/85 backdrop-blur transition hover:bg-white/20 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                  Modifier
                </button>
              )}
              <button
                type="button"
                onClick={download}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/85 backdrop-blur transition hover:bg-white/20 hover:text-white disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Télécharger
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
