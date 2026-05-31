"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  X,
  UserPlus,
  Trash2,
  Loader2,
  Camera,
  Lock,
  Unlock,
  Users,
  ScrollText,
} from "lucide-react";
import type { AuditLog, Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  people: Person[];
  locked: boolean;
  demo?: boolean;
};

type Tab = "members" | "lock" | "logs";

export default function AdminPanel({
  open,
  onClose,
  people,
  locked,
  demo = false,
}: Props) {
  const search = useSearchParams();
  const adminToken = search.get("admin") ?? "";
  const [tab, setTab] = useState<Tab>("members");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative flex h-[85vh] w-full max-w-3xl flex-col rounded-3xl border border-white/10 bg-[#0d1422]/90 p-6 text-white/85 shadow-2xl backdrop-blur-2xl">
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-1">
          <TabButton active={tab === "members"} onClick={() => setTab("members")} icon={<Users className="h-4 w-4" />}>
            Membres
          </TabButton>
          <TabButton active={tab === "lock"} onClick={() => setTab("lock")} icon={<Lock className="h-4 w-4" />}>
            Verrouillage
          </TabButton>
          <TabButton active={tab === "logs"} onClick={() => setTab("logs")} icon={<ScrollText className="h-4 w-4" />}>
            Logs
          </TabButton>
          {demo && (
            <span className="ml-auto rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent">
              démo
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === "members" && (
            <MembersTab adminToken={adminToken} people={people} disabled={demo} />
          )}
          {tab === "lock" && (
            <LockTab adminToken={adminToken} locked={locked} disabled={demo} />
          )}
          {tab === "logs" && <LogsTab adminToken={adminToken} disabled={demo} />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
        active
          ? "bg-white/15 text-white"
          : "text-white/55 hover:bg-white/5 hover:text-white/80",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Members tab (existing logic)
// ----------------------------------------------------------------------------

function MembersTab({
  adminToken,
  people,
  disabled,
}: {
  adminToken: string;
  people: Person[];
  disabled: boolean;
}) {
  return (
    <>
      <h2 className="font-display text-3xl font-bold tracking-tight text-white/90">
        Membres
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Ajoute chaque membre avec son prénom et un portrait.
      </p>

      <AddMemberForm adminToken={adminToken} disabled={disabled} />

      <div className="mt-6">
        {people.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
            Aucun membre pour le moment. Ajoute le premier ci-dessus.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {people.map((p) => (
              <MemberCard
                key={p.id}
                person={p}
                adminToken={adminToken}
                disabled={disabled}
              />
            ))}
          </ul>
        )}
      </div>
    </>
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

      setName("");
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex-1">
        <label className="text-xs font-medium text-white/60">Prénom</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Léa"
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-accent"
        />
      </div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
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
      {error && <p className="w-full text-xs text-red-300">{error}</p>}
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
    } catch {
      setRemoving(false);
    }
  }

  return (
    <li className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="aspect-square w-full bg-white/5">
        {person.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.cover_url}
            alt={person.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-white/30">
            {person.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="px-3 py-2 text-sm font-medium text-white/85">{person.name}</div>
      <button
        onClick={remove}
        disabled={removing || disabled}
        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white/85 opacity-0 transition group-hover:opacity-100 hover:bg-red-600/80 disabled:opacity-50"
      >
        {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </li>
  );
}

// ----------------------------------------------------------------------------
// Lock tab
// ----------------------------------------------------------------------------

function LockTab({
  adminToken,
  locked,
  disabled,
}: {
  adminToken: string;
  locked: boolean;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await fetch(`/api/yearbook?admin=${encodeURIComponent(adminToken)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locked: !locked }),
      });
      // Realtime push will update YearbookView's `locked` state.
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="font-display text-3xl font-bold tracking-tight text-white/90">
        Verrouillage
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Quand le yearbook est verrouillé, plus personne (à part toi) ne peut
        ajouter, modifier, déplacer ou supprimer d'images.
      </p>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full",
            locked ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/15 text-emerald-200",
          )}
        >
          {locked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white/90">
            {locked ? "Modifications désactivées" : "Modifications ouvertes"}
          </p>
          <p className="text-xs text-white/50">
            {locked
              ? "Les contributeurs voient un bandeau et leurs boutons sont masqués."
              : "Tout le monde peut ajouter, éditer, déplacer et supprimer."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy || disabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition disabled:opacity-50",
            locked
              ? "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
              : "bg-amber-500/20 text-amber-100 hover:bg-amber-500/30",
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {locked ? "Déverrouiller" : "Verrouiller"}
        </button>
      </div>
    </>
  );
}

// ----------------------------------------------------------------------------
// Logs tab
// ----------------------------------------------------------------------------

const ACTION_LABEL: Record<string, string> = {
  upload: "a ajouté une photo",
  delete_photo: "a supprimé une photo",
  edit_caption: "a modifié une légende",
  edit_date: "a modifié une date",
  move: "a déplacé une photo",
  hide_photo: "a masqué une photo",
  unhide_photo: "a affiché une photo",
  create_event: "a créé un évènement",
  delete_event: "a supprimé un évènement",
  create_person: "a ajouté un membre",
  delete_person: "a supprimé un membre",
  lock: "a verrouillé les modifications",
  unlock: "a déverrouillé les modifications",
};

function LogsTab({
  adminToken,
  disabled,
}: {
  adminToken: string;
  disabled: boolean;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (disabled) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/logs?admin=${encodeURIComponent(adminToken)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const { logs } = (await res.json()) as { logs: AuditLog[] };
        setLogs(logs);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Realtime: a new audit row → prepend.
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("audit_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        (payload) => {
          const row = payload.new as AuditLog;
          setLogs((prev) => [row, ...prev].slice(0, 200));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [],
  );

  return (
    <>
      <h2 className="font-display text-3xl font-bold tracking-tight text-white/90">
        Logs
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Toutes les modifications, en temps réel.
      </p>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-white/50">Chargement…</p>
        ) : logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">
            Aucune action pour le moment.
          </p>
        ) : (
          <ul className="space-y-1">
            {logs.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-white/90">
                    {l.user_name || "anonyme"}
                  </span>{" "}
                  <span className="text-white/65">
                    {ACTION_LABEL[l.action] ?? l.action}
                  </span>
                </span>
                <span className="text-xs text-white/40">
                  {fmt.format(new Date(l.created_at))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
