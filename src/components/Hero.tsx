"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  /** 0 while the hero is in view, 1 once the visitor has scrolled past it. */
  onProgress?: (progress: number) => void;
};

export default function Hero({ title, subtitle, onProgress }: Props) {
  const ref = useRef<HTMLElement>(null);
  // Continuous scroll progress so the chevron can fade as you start
  // moving — purely visual, doesn't gate anything.
  const [scrollProgress, setScrollProgress] = useState(0);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    function update() {
      raf = 0;
      // Map scroll 0 → 30% of viewport to 0 → 1 so the chevron fully
      // fades before you've left the hero.
      const p = Math.max(
        0,
        Math.min(1, window.scrollY / (window.innerHeight * 0.3)),
      );
      setScrollProgress(p);
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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
      <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-white/70 md:text-7xl lg:text-8xl">
        {title}
        {subtitle && (
          <span className="mt-1 block text-left text-3xl font-semibold leading-tight md:text-5xl lg:text-6xl">
            {subtitle}
          </span>
        )}
      </h1>

      <button
        onClick={scrollDown}
        aria-label="Découvrir le yearbook"
        className="group absolute bottom-10 left-1/2 -translate-x-1/2 inline-flex flex-col items-center gap-2 text-white/65 transition hover:text-white/70"
        style={{
          opacity: 1 - scrollProgress,
          pointerEvents: scrollProgress > 0.6 ? "none" : "auto",
        }}
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroller</span>
        <ChevronDown className="h-6 w-6 animate-bounce" />
      </button>
    </section>
  );
}
