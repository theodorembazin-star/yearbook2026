import Link from "next/link";
import { ArrowRight, Camera, Users, Clock } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex items-center justify-between">
        <div className="font-display text-2xl font-bold tracking-tight">Yearbook 2026</div>
        <nav className="flex gap-3 text-sm">
          <Link href="/create" className="rounded-full bg-ink px-4 py-2 text-cream hover:opacity-90">
            Créer un yearbook
          </Link>
        </nav>
      </header>

      <section className="mt-20 max-w-3xl">
        <p className="font-hand text-2xl text-accent">— Souvenirs collectifs —</p>
        <h1 className="font-display mt-2 text-6xl font-bold leading-[1.05] tracking-tight">
          Un livre d'or vivant, écrit à plusieurs mains.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink/80">
          Chacun ajoute ses photos depuis son téléphone — sans compte. On les trie par date
          et par personne, et vous co-éditez la mise en page comme un vrai yearbook.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/create"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-cream shadow-lg shadow-accent/20 transition hover:scale-[1.02]"
          >
            Démarrer un yearbook
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/y/promo-2026"
            className="text-sm underline underline-offset-4 hover:text-accent"
          >
            Voir un exemple →
          </Link>
        </div>
      </section>

      <section className="mt-24 grid gap-6 sm:grid-cols-3">
        <Feature
          icon={<Camera className="h-5 w-5" />}
          title="Upload sans compte"
          body="Un lien d'invitation, on choisit son prénom, on dépose ses photos. Compression côté client, pas de friction."
        />
        <Feature
          icon={<Clock className="h-5 w-5" />}
          title="Tri chronologique"
          body="Lecture EXIF automatique. Frise verticale collante, sections par mois, scroll long format."
        />
        <Feature
          icon={<Users className="h-5 w-5" />}
          title="Personnes reconnues"
          body="Les visages sont regroupés. Tu nommes une personne une fois, le reste se propage."
        />
      </section>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/60 p-6 backdrop-blur">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-cream">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-ink/70">{body}</p>
    </div>
  );
}
