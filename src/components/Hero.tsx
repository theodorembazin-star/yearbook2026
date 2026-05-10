"use client";

import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  tagline: string;
};

export default function Hero({ title, tagline }: Props) {
  function scrollDown() {
    if (typeof window === "undefined") return;
    const el = document.getElementById("yearbook-content");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
    }
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
        {title}
      </h1>
      <p className="mt-8 max-w-xl text-base text-ink/70 md:text-lg">{tagline}</p>

      <button
        onClick={scrollDown}
        aria-label="Découvrir le yearbook"
        className="group absolute bottom-10 left-1/2 -translate-x-1/2 inline-flex flex-col items-center gap-2 text-ink/50 transition hover:text-ink"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroller</span>
        <ChevronDown className="h-6 w-6 animate-bounce" />
      </button>
    </section>
  );
}
