"use client";

import { useCallback, useMemo, useState } from "react";
import { X, UploadCloud, Loader2, Check } from "lucide-react";
import type { Event, Photo, Person } from "@/lib/types";
import { eventFromRow } from "@/lib/db";
import { Layers, Plus as PlusIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { YEARBOOK_ID } from "@/lib/config";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  people: Person[];
  events: Event[];
  demo?: boolean;
  /** Demo-mode: inject the freshly produced photos straight into the parent. */
  onUploaded: (photos: Photo[]) => void;
  /** Live-mode: ask the parent to refetch from the DB so the grid catches up. */
  onCommit?: () => void;
  /** Called when a new event has just been created from this dialog. */
  onEventCreated?: (ev: Event) => void;
};

type Pending = {
  id: string;
  file: File;
  preview: string;
  takenAt: string | null;
  width?: number;
  height?: number;
  kind: "image" | "video";
  caption: string;
  status: "queued" | "processing" | "uploading" | "done" | "error";
  progress: number;
  remoteId?: string;
};

function readImageSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const out = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function readVideoSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const out = { width: video.videoWidth, height: video.videoHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    video.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    video.src = url;
  });
}

export default function UploadDialog({
  open,
  onClose,
  people,
  events,
  demo = false,
  onUploaded,
  onCommit,
  onEventCreated,
}: Props) {
  const [items, setItems] = useState<Pending[]>([]);
  const [name, setName] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("yb_name") ?? "" : "",
  );
  const [dragOver, setDragOver] = useState(false);
  const [tagged, setTagged] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [eventId, setEventId] = useState<string>("");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [creatingBusy, setCreatingBusy] = useState(false);

  const live = !demo && isSupabaseConfigured();

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
      );
      const next: Pending[] = arr.map((file) => ({
        id: nanoid(),
        file,
        preview: URL.createObjectURL(file),
        takenAt: null,
        kind: file.type.startsWith("video/") ? "video" : "image",
        caption: "",
        status: "queued",
        progress: 0,
      }));
      setItems((prev) => [...prev, ...next]);

      for (const item of next) {
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "processing" } : p)),
        );
        try {
          const isVideo = item.kind === "video";
          let payload: Blob = item.file;
          let takenAt: string;
          let width = 0;
          let height = 0;

          if (isVideo) {
            // No EXIF and no client-side compression for videos in v1.
            // Use the file's lastModified as the closest signal we have
            // for the capture date.
            takenAt = new Date(item.file.lastModified).toISOString();
            const size = await readVideoSize(item.file).catch(() => ({
              width: 0,
              height: 0,
            }));
            width = size.width;
            height = size.height;
            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, progress: 100, width, height } : p,
              ),
            );
          } else {
            const [{ default: exifr }, { default: imageCompression }] =
              await Promise.all([
                import("exifr"),
                import("browser-image-compression"),
              ]);
            const exif = await exifr.parse(item.file).catch(() => null);
            takenAt = exif?.DateTimeOriginal
              ? new Date(exif.DateTimeOriginal).toISOString()
              : new Date(item.file.lastModified).toISOString();

            const compressed = await imageCompression(item.file, {
              maxSizeMB: 1.5,
              maxWidthOrHeight: 1600,
              useWebWorker: true,
              onProgress: (pct: number) => {
                setItems((prev) =>
                  prev.map((p) => (p.id === item.id ? { ...p, progress: pct } : p)),
                );
              },
            });
            payload = compressed;
            const size = await readImageSize(compressed).catch(() => ({
              width: 0,
              height: 0,
            }));
            width = size.width;
            height = size.height;
            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, width, height } : p,
              ),
            );
          }

          if (live) {
            setItems((prev) =>
              prev.map((p) => (p.id === item.id ? { ...p, status: "uploading" } : p)),
            );
            const signRes = await fetch("/api/photos/upload-url", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ contentType: payload.type, takenAt }),
            });
            if (!signRes.ok) {
              const j = await signRes.json().catch(() => ({}));
              throw new Error(
                `upload-url ${signRes.status}: ${j.error ?? ""} ${j.detail ?? ""} ${j.hint ?? ""}`,
              );
            }
            const { photoId, key, token } = await signRes.json();

            const supabase = supabaseBrowser();
            const { error } = await supabase.storage
              .from("photos")
              .uploadToSignedUrl(key, token, payload);
            if (error) throw error;

            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, status: "done", progress: 100, takenAt, remoteId: photoId }
                  : p,
              ),
            );
          } else {
            await new Promise((r) => setTimeout(r, 300));
            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, status: "done", progress: 100, takenAt } : p,
              ),
            );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("upload error:", msg);
          setErrors((prev) => ({ ...prev, [item.id]: msg }));
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, status: "error" } : p)),
          );
        }
      }
    },
    [live],
  );

  async function commit() {
    if (!name.trim()) return;
    localStorage.setItem("yb_name", name.trim());
    const done = items.filter((i) => i.status === "done");

    if (live) {
      // Finalize each photo (sets status=published, attaches contributor, tags people)
      await Promise.all(
        done.map((i) =>
          fetch("/api/photos/finalize", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              photoId: i.remoteId,
              takenAt: i.takenAt,
              width: i.width,
              height: i.height,
              uploaderName: name.trim(),
              peopleIds: tagged,
              caption: i.caption.trim() || undefined,
              eventId: eventId || undefined,
            }),
          }),
        ),
      );
      // Trigger an explicit refetch in the parent — Realtime alone is
      // unreliable so we don't want to depend on it for the visible result.
      onCommit?.();
    } else {
      const photos: Photo[] = done.map((i) => ({
        id: i.id,
        yearbook_id: YEARBOOK_ID,
        url: i.preview,
        thumb_url: i.preview,
        width: i.width || 1200,
        height: i.height || 800,
        taken_at: i.takenAt ?? new Date().toISOString(),
        uploaded_at: new Date().toISOString(),
        uploader_id: "local",
        uploader_name: name.trim(),
        caption: i.caption.trim() || undefined,
        people_ids: tagged,
        status: "published",
        kind: i.kind,
      }));
      onUploaded(photos);
    }

    setItems([]);
    setTagged([]);
    setEventId("");
    onClose();
  }

  async function createEvent() {
    const title = newEventTitle.trim();
    if (!title || creatingBusy) return;
    setCreatingBusy(true);
    try {
      if (!live) {
        // Demo: fabricate locally
        const fake: Event = {
          id: nanoid(),
          yearbook_id: "demo",
          title,
          created_at: new Date().toISOString(),
        };
        onEventCreated?.(fake);
        setEventId(fake.id);
      } else {
        const userName =
          typeof window !== "undefined"
            ? localStorage.getItem("yb_name") ?? ""
            : "";
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, userName: userName || undefined }),
        });
        if (res.ok) {
          const { event } = (await res.json()) as { event: unknown };
          if (event) {
            const ev = eventFromRow(event as never);
            onEventCreated?.(ev);
            setEventId(ev.id);
          }
        }
      }
      setCreatingEvent(false);
      setNewEventTitle("");
    } finally {
      setCreatingBusy(false);
    }
  }

  const canPublish = useMemo(
    () =>
      name.trim().length > 0 &&
      items.length > 0 &&
      items.every((i) => i.status === "done" || i.status === "error") &&
      items.some((i) => i.status === "done"),
    [name, items],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-[#0d1422]/85 text-white/85 shadow-2xl backdrop-blur-2xl">
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto p-8 pb-4">

        <h2 className="font-display text-3xl font-bold tracking-tight text-white/90">
          Ajouter des photos
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Pas besoin de compte. Juste un prénom pour qu'on sache à qui dire merci.
        </p>
        {!live && (
          <p className="mt-2 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent">
            Mode démo — uploads simulés en local
          </p>
        )}

        <label className="mt-6 block">
          <span className="text-sm font-medium text-white/80">Ton prénom</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Léa"
            className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white placeholder-white/30 outline-none transition focus:border-accent focus:bg-white/10"
          />
        </label>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition",
            dragOver
              ? "border-accent bg-accent/10"
              : "border-white/15 bg-white/[0.03]",
          )}
        >
          <UploadCloud className="h-8 w-8 text-white/45" />
          <p className="mt-3 text-sm text-white/65">
            Glisse-dépose tes photos ici, ou
          </p>
          <label className="mt-2 cursor-pointer rounded-full bg-white/15 px-4 py-2 text-sm text-white/90 backdrop-blur transition hover:bg-white/25">
            Choisir des fichiers
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </label>
          <p className="mt-2 text-xs text-white/35">
            Photos et vidéos. Date de prise lue automatiquement (EXIF), compression côté navigateur pour les images.
          </p>
        </div>

        {items.length > 0 && (
          <div className="mt-5 space-y-2">
            {items.map((i) => (
              <div
                key={i.id}
                className="rounded-xl border border-white/10 bg-white/5 p-2"
              >
                <div className="flex items-center gap-3">
                  {i.kind === "video" ? (
                    <video
                      src={i.preview}
                      muted
                      playsInline
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.preview}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white/80">
                      {i.file.name}
                      {i.kind === "video" && (
                        <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
                          vidéo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/45">
                      {i.takenAt
                        ? new Date(i.takenAt).toLocaleDateString("fr-FR")
                        : "lecture date…"}
                    </div>
                    {errors[i.id] && (
                      <div className="mt-1 truncate text-xs text-red-400">
                        {errors[i.id]}
                      </div>
                    )}
                  </div>
                  <StatusIcon status={i.status} progress={i.progress} />
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2">
                  <input
                    type="text"
                    value={i.caption}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p) =>
                          p.id === i.id ? { ...p, caption: e.target.value } : p,
                        ),
                      )
                    }
                    placeholder="Légende (optionnel)"
                    maxLength={280}
                    className="min-w-0 flex-1 bg-transparent text-xs text-white/80 placeholder-white/30 outline-none"
                  />
                  {i.caption.length > 200 && (
                    <span className="shrink-0 text-[10px] text-white/35 tabular-nums">
                      {i.caption.length}/280
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-white/80">
              Lié à un évènement ?
            </p>
            <p className="text-xs text-white/45">
              Optionnel — toutes les photos du lot rejoindront ce groupe.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEventId("")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  eventId === ""
                    ? "border-white bg-white text-ink/70"
                    : "border-white/20 bg-white/5 text-white/75 hover:bg-white/15",
                )}
              >
                Aucun
              </button>
              {events.map((ev) => {
                const active = eventId === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setEventId(ev.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition",
                      active
                        ? "border-white bg-white text-ink/70"
                        : "border-white/20 bg-white/5 text-white/75 hover:bg-white/15",
                    )}
                  >
                    <Layers className="h-3 w-3" />
                    {ev.title}
                  </button>
                );
              })}
              {creatingEvent ? (
                <div className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/5 px-1 py-0.5">
                  <input
                    autoFocus
                    type="text"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void createEvent();
                      } else if (e.key === "Escape") {
                        setCreatingEvent(false);
                        setNewEventTitle("");
                      }
                    }}
                    placeholder="Titre"
                    maxLength={80}
                    className="w-32 bg-transparent px-2 py-0.5 text-xs text-white/85 placeholder-white/30 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void createEvent()}
                    disabled={!newEventTitle.trim() || creatingBusy}
                    className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-cream disabled:opacity-50"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingEvent(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/25 bg-transparent px-3 py-1 text-xs text-white/65 hover:bg-white/10 hover:text-white/85"
                >
                  <PlusIcon className="h-3 w-3" />
                  Nouvel évènement
                </button>
              )}
            </div>
          </div>
        )}

        {people.length > 0 && items.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-white/80">Qui est sur ces photos ?</p>
            <p className="text-xs text-white/45">
              Optionnel — utile pour filtrer plus tard. S'applique à toutes les
              photos de ce lot.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {people.map((p) => {
                const active = tagged.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setTagged((prev) =>
                        active ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                      active
                        ? "border-white bg-white text-ink/80"
                        : "border-white/20 bg-white/5 text-white/75 hover:bg-white/15",
                    )}
                  >
                    {p.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.cover_url}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    )}
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        </div>

        {/* Sticky action bar so the publish button is always visible. */}
        <div className="flex justify-end gap-3 rounded-b-3xl border-t border-white/10 bg-[#0d1422]/95 px-8 py-4 backdrop-blur">
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:border-white/30 hover:text-white/90"
          >
            Annuler
          </button>
          <button
            onClick={commit}
            disabled={!canPublish}
            className="rounded-full bg-accent px-5 py-2 text-sm text-cream shadow-lg shadow-accent/20 transition hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
          >
            Publier {items.filter((i) => i.status === "done").length} photo
            {items.filter((i) => i.status === "done").length > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status, progress }: { status: Pending["status"]; progress: number }) {
  if (status === "done") return <Check className="h-5 w-5 text-emerald-400" />;
  if (status === "error") return <X className="h-5 w-5 text-red-400" />;
  if (status === "uploading")
    return (
      <div className="flex items-center gap-1 text-xs text-white/55">
        <Loader2 className="h-4 w-4 animate-spin" /> upload
      </div>
    );
  if (status === "processing")
    return (
      <div className="flex items-center gap-1 text-xs text-white/55">
        <Loader2 className="h-4 w-4 animate-spin" />
        {Math.round(progress)}%
      </div>
    );
  return <span className="text-xs text-white/35">en attente</span>;
}
