"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check } from "lucide-react";

const EMOJIS = ["🎓", "✈️", "💍", "🏖️", "🎬", "🎉", "📸", "🌿"];

type Created = {
  slug: string;
  invite_token: string;
  admin_token: string;
};

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🎓");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/yearbooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), cover_emoji: emoji }),
      });
      if (res.status === 503) {
        // Backend not configured yet — go to demo so user can still see it.
        router.push(`/y/${slugify(title) || "promo-2026"}`);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `error_${res.status}`);
      }
      const data = (await res.json()) as Created;
      setCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return <CreatedView created={created} emoji={emoji} title={title} />;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <h1 className="font-display mt-8 text-4xl font-bold tracking-tight">
        Créer un yearbook
      </h1>
      <p className="mt-2 text-ink/70">
        Tu obtiendras un lien à partager. Personne n'aura besoin de créer un compte.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-8">
        <div>
          <label className="mb-2 block text-sm font-medium">Couverture</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`h-12 w-12 rounded-xl border text-2xl transition ${
                  emoji === e
                    ? "border-accent bg-accent/10 scale-105"
                    : "border-ink/10 bg-white/60 hover:border-ink/30"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-medium">
            Titre
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Promo 2026 — souvenirs"
            className="w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 text-lg outline-none focus:border-accent"
            autoFocus
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="w-full rounded-full bg-accent px-6 py-3 text-cream shadow-lg shadow-accent/20 transition hover:scale-[1.01] disabled:opacity-50"
        >
          {submitting ? "Création…" : "Créer et obtenir le lien d'invitation"}
        </button>
      </form>
    </main>
  );
}

function CreatedView({ created, emoji, title }: { created: Created; emoji: string; title: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = `${origin}/y/${created.slug}?k=${created.invite_token}`;
  const adminUrl = `${origin}/y/${created.slug}?k=${created.admin_token}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-3xl border border-ink/10 bg-white/70 p-8 shadow-sm">
        <div className="text-5xl">{emoji}</div>
        <h1 className="font-display mt-3 text-3xl font-bold tracking-tight">
          {title || "Yearbook créé"}
        </h1>
        <p className="mt-2 text-sm text-ink/70">
          Garde le lien admin pour toi. Partage le lien d'invitation à tes contributeurs.
        </p>

        <div className="mt-8 space-y-4">
          <CopyableLink label="Lien d'invitation (à partager)" url={inviteUrl} />
          <CopyableLink label="Lien admin (privé)" url={adminUrl} muted />
        </div>

        <Link
          href={`/y/${created.slug}?k=${created.admin_token}`}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm text-cream"
        >
          Ouvrir le yearbook →
        </Link>
      </div>
    </main>
  );
}

function CopyableLink({ label, url, muted }: { label: string; url: string; muted?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-ink/60">{label}</div>
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
          muted ? "border-ink/10 bg-ink/5" : "border-accent/30 bg-accent/5"
        }`}
      >
        <code className="flex-1 truncate text-xs">{url}</code>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-full p-2 hover:bg-ink/10"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
