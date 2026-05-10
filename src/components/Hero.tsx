"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  title: string;
  tagline: string;
  /** 0 while the hero is in view, 1 once the visitor has scrolled past it. */
  onProgress?: (progress: number) => void;
};

export default function Hero({ title, tagline, onProgress }: Props) {
  const ref = useRef<HTMLElement>(null);

  // Simple IntersectionObserver: when more than half of the hero is in view
  // we're "on the hero", otherwise we've moved on.
  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onProgress?.(entry.intersectionRatio >= 0.5 ? 0 : 1);
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onProgress]);

  function scrollDown() {
    if (typeof window === "undefined") return;
    const el = document.getElementById("yearbook-content");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  }

  return (
    <section
      ref={ref}
      className="relative flex h-screen w-full flex-col items-center justify-center px-6 text-center"
    >
      <div>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-white/70 md:text-7xl lg:text-8xl">
          {title}
        </h1>
        <p className="mt-8 max-w-xl text-left text-base text-white/75 md:text-lg">
          {tagline}
        </p>
      </div>

      <button
        onClick={scrollDown}
        aria-label="Découvrir le yearbook"
        className="group absolute bottom-10 left-1/2 -translate-x-1/2 inline-flex flex-col items-center gap-2 text-white/65 transition hover:text-white/70"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroller</span>
        <ChevronDown className="h-6 w-6 animate-bounce" />
      </button>
    </section>
  );
}
