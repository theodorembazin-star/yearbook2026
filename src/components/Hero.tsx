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

export default function Hero({ title, tagline }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    function update() {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const scrolled = Math.max(0, -el.getBoundingClientRect().top);
      const p = Math.max(0, Math.min(1, scrolled / total));
      setProgress(p);
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
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
  const heroTranslate = eased * -40; // px
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
          <p className="mt-8 max-w-xl text-base text-ink/70 md:text-lg">
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
