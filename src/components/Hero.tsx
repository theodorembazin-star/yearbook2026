"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  tagline: string;
};

// Total scroll budget for the hero, in viewport heights. The first 100vh is
// the hero itself; the remainder (60vh here) is the "resistance" zone where
// you scroll but the hero stays sticky in front, fading out gradually.
const HERO_HEIGHT_VH = 160;

// Once the user releases (180ms without a scroll event), we snap to either
// the top (hero) or the start of the content — never leaving the viewport
// stranded in between.
const SCROLL_END_DEBOUNCE_MS = 180;
const COMMIT_THRESHOLD = 0.5;

export default function Hero({ title, tagline }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

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

    function onScrollEnd() {
      // Don't fight our own programmatic scroll
      if (snapping) return;
      const r = readProgress();
      if (!r) return;
      // Already at one of the two stable states — leave it alone.
      if (r.p <= 0.02 || r.p >= 0.98) return;
      const target =
        r.p < COMMIT_THRESHOLD ? 0 : r.topY + r.total + window.innerHeight;
      // The hero parent is `HERO_HEIGHT_VH` tall. Forward target is the byte
      // right after it, which puts the content at the top of the viewport.
      snapping = true;
      window.scrollTo({ top: target, behavior: "smooth" });
      // Release the lock once the smooth scroll has had time to settle.
      setTimeout(() => {
        snapping = false;
      }, 700);
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
    const el = document.getElementById("yearbook-content");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({
        top: window.innerHeight * (HERO_HEIGHT_VH / 100),
        behavior: "smooth",
      });
    }
  }

  // Ease the fade so the hero hangs on a bit longer before releasing.
  const eased = Math.pow(progress, 1.4);
  const heroOpacity = 1 - eased;
  const heroTranslate = eased * -40;
  const heroScale = 1 - eased * 0.04;

  return (
    <section
      ref={ref}
      className="relative w-full"
      style={{ height: `${HERO_HEIGHT_VH}vh` }}
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center px-6 text-center">
        <div
          style={{
            opacity: heroOpacity,
            transform: `translateY(${heroTranslate}px) scale(${heroScale})`,
            willChange: "opacity, transform",
          }}
        >
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
            {title}
          </h1>
          {/* Same vertical slot as before (mt-8 max-w-xl) but left-aligned
              within its block instead of centered. */}
          <p className="mt-8 max-w-xl text-left text-base text-ink/70 md:text-lg">
            {tagline}
          </p>
        </div>

        <button
          onClick={scrollDown}
          aria-label="Découvrir le yearbook"
          className="group absolute bottom-10 left-1/2 -translate-x-1/2 inline-flex flex-col items-center gap-2 text-ink/50 transition hover:text-ink"
          style={{ opacity: 1 - progress, willChange: "opacity" }}
        >
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroller</span>
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </button>
      </div>
    </section>
  );
}
