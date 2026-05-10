"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const EMOJIS = ["🎓", "✈️", "💍", "🏖️", "🎬", "🎉", "📸", "🌿"];

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🎓");
  const [submitting, setSubmitting] = useState(false);

  function slugify(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    // TODO: POST /api/yearbooks → returns { slug, invite_token, admin_token }
    // For now, route to the demo to showcase the timeline UI.
    const slug = slugify(title) || "promo-2026";
    setTimeout(() => router.push(`/y/${slug || "promo-2026"}`), 300);
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

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="w-full rounded-full bg-accent px-6 py-3 text-cream shadow-lg shadow-accent/20 transition hover:scale-[1.01] disabled:opacity-50"
        >
          {submitting ? "Création…" : "Créer et obtenir le lien d'invitation"}
        </button>

        <p className="text-xs text-ink/50">
          Tu recevras deux liens : un <strong>lien d'invitation</strong> à partager, et un{" "}
          <strong>lien admin</strong> que tu gardes pour toi (modération, suppression).
        </p>
      </form>
    </main>
  );
}
