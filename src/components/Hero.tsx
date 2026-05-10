"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  tagline: string;
  onProgress?: (progress: number) => void;
};

// Resistance zone, in viewport heights. The first 100vh is the hero itself;
// the remainder is where you scroll but the hero stays in front, fading
// out smoothly. Kept short on purpose — the goal is a soft hand-over,
// not a workout.
const HERO_HEIGHT_VH = 135;
// How far through the resistance the user must drag before we consider it
// a commit. Below the threshold we snap back to the welcome screen.
const COMMIT_THRESHOLD = 0.4;
// Time after the last scroll event before we decide to snap.
const SCROLL_END_DEBOUNCE_MS = 140;
// Snap animation duration in ms.
const SNAP_DURATION_MS = 720;

// Custom ease-in-out (quintic) — feels softer than the browser default.
function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function smoothScrollTo(target: number, duration: number): Promise<void> {
  return new Promise((resolve) => {
    const start = window.scrollY;
    const distance = target - start;
    if (Math.abs(distance) < 1) {
      resolve();
      return;
    }
    const startTime = performance.now();
    function step() {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      window.scrollTo(0, start + distance * easeInOutQuint(t));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

export default function Hero({ title, tagline, onProgress }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    let endTimer: ReturnType<typeof setTimeout> | null = null;
    let snapping = false;

    function readProgress(): { p: number; total: number; topY: number } | null {
      const el = ref.current;
      if (!el) return null;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return null;
      const scrolled = Math.max(0, -el.getBoundingClientRect().top);
      return { p: Math.min(1, scrolled / total), total, topY: el.offsetTop };
    }

    function update() {
      raf = 0;
      const r = readProgress();
      if (!r) {
        setProgress(0);
        return;
      }
      setProgress(r.p);
    }

    async function onScrollEnd() {
      if (snapping) return;
      const r = readProgress();
      if (!r) return;
      if (r.p <= 0.02 || r.p >= 0.98) return;
      const target =
        r.p < COMMIT_THRESHOLD ? 0 : r.topY + r.total + window.innerHeight;
      snapping = true;
      try {
        await smoothScrollTo(target, SNAP_DURATION_MS);
      } finally {
        // Brief grace period to ignore the trailing scroll events from the
        // animation itself.
        setTimeout(() => {
          snapping = false;
        }, 80);
      }
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
      if (endTimer) clearTimeout(endTimer);
      endTimer = setTimeout(onScrollEnd, SCROLL_END_DEBOUNCE_MS);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
      if (endTimer) clearTimeout(endTimer);
    };
  }, []);

  function scrollDown() {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const target = el.offsetTop + el.offsetHeight;
    void smoothScrollTo(target, SNAP_DURATION_MS);
  }

  // Linear fade through the resistance zone — feels more like a
  // crossfade than the previous eased fade-then-snap.
  const fadeOpacity = 1 - progress;
  const fadeTranslate = progress * -28;

  return (
    <section
      ref={ref}
      className="relative w-full"
      style={{ height: `${HERO_HEIGHT_VH}vh` }}
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center px-6 text-center">
        <div
          style={{
            opacity: fadeOpacity,
            transform: `translateY(${fadeTranslate}px)`,
            willChange: "opacity, transform",
          }}
        >
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
          style={{ opacity: 1 - progress, willChange: "opacity" }}
        >
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroller</span>
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </button>
      </div>
    </section>
  );
}
