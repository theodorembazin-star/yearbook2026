"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { X, UserPlus, Trash2, Loader2, Camera } from "lucide-react";
import type { Person } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  people: Person[];
  demo?: boolean;
};

export default function AdminPanel({ open, onClose, people, demo = false }: Props) {
  const search = useSearchParams();
  const adminToken = search.get("admin") ?? "";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex h-[80vh] w-full max-w-3xl flex-col rounded-3xl bg-cream p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-ink/5"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-display text-3xl font-bold tracking-tight">Membres</h2>
        <p className="mt-1 text-sm text-ink/60">
          Ajoute chaque membre avec son prénom et un portrait. Les contributeurs
          pourront ensuite identifier les personnes sur leurs photos.
        </p>
        {demo && (
          <p className="mt-3 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Mode démo — aucune écriture en base
          </p>
        )}

        <AddMemberForm adminToken={adminToken} disabled={demo} />

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          {people.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/50">
              Aucun membre pour le moment. Ajoute le premier ci-dessus.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {people.map((p) => (
                <MemberCard
                  key={p.id}
                  person={p}
                  adminToken={adminToken}
                  disabled={demo}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AddMemberForm({
  adminToken,
  disabled,
}: {
  adminToken: string;
  disabled: boolean;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !file || disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const { default: imageCompression } = await import("browser-image-compression");
      const portrait = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 600,
        useWebWorker: true,
      });

      const res = await fetch(`/api/people?admin=${encodeURIComponent(adminToken)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contentType: portrait.type,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `error_${res.status}`);
      }
      const { uploadUrl, token, key } = await res.json();

      const supabase = supabaseBrowser();
      const { error: upErr } = await supabase.storage
        .from("photos")
        .uploadToSignedUrl(key, token, portrait);
      if (upErr) throw upErr;

      // The Realtime subscription on YearbookView will pull the new person in.
      setName("");
      setFile(null);
      // Best-effort: clear the input by remounting via key — not strictly needed.
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-ink/10 bg-white/60 p-4"
    >
      <div className="flex-1">
        <label className="text-xs font-medium text-ink/60">Prénom</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Léa"
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 outline-none focus:border-accent"
        />
      </div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm hover:border-ink/40">
        <Camera className="h-4 w-4" />
        {file ? file.name.slice(0, 24) : "Portrait"}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <button
        type="submit"
        disabled={!name.trim() || !file || submitting || disabled}
        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm text-cream disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Ajouter
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

function MemberCard({
  person,
  adminToken,
  disabled,
}: {
  person: Person;
  adminToken: string;
  disabled: boolean;
}) {
  const [removing, setRemoving] = useState(false);

  async function remove() {
    if (disabled || removing) return;
    if (!confirm(`Supprimer ${person.name} ?`)) return;
    setRemoving(true);
    try {
      await fetch(
        `/api/people/${person.id}?admin=${encodeURIComponent(adminToken)}`,
        { method: "DELETE" },
      );
      // Realtime will reflect the deletion.
    } catch {
      setRemoving(false);
    }
  }

  return (
    <li className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div className="aspect-square w-full bg-ink/5">
        {person.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.cover_url}
            alt={person.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-ink/30">
            {person.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="px-3 py-2 text-sm font-medium">{person.name}</div>
      <button
        onClick={remove}
        disabled={removing || disabled}
        className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </li>
  );
}
