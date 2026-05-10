"use client";

import { useCallback, useState } from "react";
import { X, UploadCloud, Loader2, Check } from "lucide-react";
import type { Photo } from "@/lib/types";
import { nanoid } from "nanoid";

type Props = {
  open: boolean;
  onClose: () => void;
  yearbookId: string;
  onUploaded: (photos: Photo[]) => void;
};

type Pending = {
  id: string;
  file: File;
  preview: string;
  takenAt: string | null;
  status: "queued" | "processing" | "done" | "error";
  progress: number;
};

export default function UploadDialog({ open, onClose, yearbookId, onUploaded }: Props) {
  const [items, setItems] = useState<Pending[]>([]);
  const [name, setName] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("yb_name") ?? "" : "",
  );
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const next: Pending[] = arr.map((file) => ({
      id: nanoid(),
      file,
      preview: URL.createObjectURL(file),
      takenAt: null,
      status: "queued",
      progress: 0,
    }));
    setItems((prev) => [...prev, ...next]);

    // Process EXIF + compression sequentially (keeps memory low for large batches)
    for (const item of next) {
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: "processing" } : p)),
      );
      try {
        const [{ default: exifr }, { default: imageCompression }] = await Promise.all([
          import("exifr"),
          import("browser-image-compression"),
        ]);
        const exif = await exifr.parse(item.file).catch(() => null);
        const takenAt = exif?.DateTimeOriginal
          ? new Date(exif.DateTimeOriginal).toISOString()
          : new Date(item.file.lastModified).toISOString();

        // Compress to ~1600px max edge for upload, keep original for high-quality export
        await imageCompression(item.file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          onProgress: (pct: number) => {
            setItems((prev) =>
              prev.map((p) => (p.id === item.id ? { ...p, progress: pct } : p)),
            );
          },
        });

        // TODO: real upload to /api/photos/upload-url → R2 PUT presigned
        // Simulating a successful upload here so the demo flow works without backend.
        await new Promise((r) => setTimeout(r, 400));

        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: "done", progress: 100, takenAt }
              : p,
          ),
        );
      } catch (e) {
        console.error(e);
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "error" } : p)),
        );
      }
    }
  }, []);

  function commit() {
    if (!name.trim()) return;
    localStorage.setItem("yb_name", name.trim());
    const done = items.filter((i) => i.status === "done");
    const photos: Photo[] = done.map((i) => ({
      id: i.id,
      yearbook_id: yearbookId,
      url: i.preview,
      thumb_url: i.preview,
      width: 1200,
      height: 800,
      taken_at: i.takenAt ?? new Date().toISOString(),
      uploaded_at: new Date().toISOString(),
      uploader_id: "local",
      uploader_name: name.trim(),
      people_ids: [],
      status: "published",
    }));
    onUploaded(photos);
    setItems([]);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-cream p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-ink/5"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-display text-3xl font-bold tracking-tight">Ajouter des photos</h2>
        <p className="mt-1 text-sm text-ink/60">
          Pas besoin de compte. Juste un prénom pour qu'on sache à qui dire merci.
        </p>

        <label className="mt-6 block">
          <span className="text-sm font-medium">Ton prénom</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Léa"
            className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-2 outline-none focus:border-accent"
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
          className={`mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragOver ? "border-accent bg-accent/5" : "border-ink/15"
          }`}
        >
          <UploadCloud className="h-8 w-8 text-ink/40" />
          <p className="mt-3 text-sm text-ink/70">
            Glisse-dépose tes photos ici, ou
          </p>
          <label className="mt-2 cursor-pointer rounded-full bg-ink px-4 py-2 text-sm text-cream hover:opacity-90">
            Choisir des fichiers
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </label>
          <p className="mt-2 text-xs text-ink/40">
            Date de prise de vue lue automatiquement (EXIF) · compression côté navigateur
          </p>
        </div>

        {items.length > 0 && (
          <div className="mt-5 max-h-60 space-y-2 overflow-y-auto pr-1">
            {items.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white/70 p-2"
              >
                <img
                  src={i.preview}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{i.file.name}</div>
                  <div className="text-xs text-ink/50">
                    {i.takenAt
                      ? new Date(i.takenAt).toLocaleDateString("fr-FR")
                      : "lecture date…"}
                  </div>
                </div>
                <StatusIcon status={i.status} progress={i.progress} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-ink/40"
          >
            Annuler
          </button>
          <button
            onClick={commit}
            disabled={
              !name.trim() ||
              items.length === 0 ||
              items.some((i) => i.status === "processing" || i.status === "queued")
            }
            className="rounded-full bg-accent px-5 py-2 text-sm text-cream disabled:opacity-50"
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
  if (status === "done") return <Check className="h-5 w-5 text-emerald-600" />;
  if (status === "error") return <X className="h-5 w-5 text-red-600" />;
  if (status === "processing")
    return (
      <div className="flex items-center gap-1 text-xs text-ink/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        {Math.round(progress)}%
      </div>
    );
  return <span className="text-xs text-ink/40">en attente</span>;
}
