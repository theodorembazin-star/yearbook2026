"use client";

// Intro animation à la 'The Thing': the title emerges from black through
// a cyan glow halo, settles, then the overlay fades to reveal the actual
// hero underneath. While it plays the page is scroll-locked.

import { useEffect, useState } from "react";

const PLAY_MS = 1000; // glow buildup + settle
const FADE_MS = 400; // overlay fade-out

type Phase = "playing" | "fading" | "done";

type Props = {
  title: string;
  subtitle?: string;
};

export default function Intro({ title, subtitle }: Props) {
  const [phase, setPhase] = useState<Phase>("playing");

  useEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    const t1 = setTimeout(() => setPhase("fading"), PLAY_MS);
    const t2 = setTimeout(() => setPhase("done"), PLAY_MS + FADE_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      html.style.overflow = prevOverflow;
    };
  }, []);

  // Re-allow scroll the moment we hide the overlay
  useEffect(() => {
    if (phase === "done") {
      document.documentElement.style.overflow = "";
    }
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 text-center transition-opacity duration-[900ms] ease-out ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="intro-stage relative">
        {/* Soft flame glow rising behind the letters. Cheap: a blurred
            radial-gradient on a single positioned div, not a multi-stack
            drop-shadow on transparent text. */}
        <div className="intro-flame" />
        <h1 className="intro-title relative font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
          {title}
          {subtitle && (
            <span className="intro-sub mt-1 block text-left text-3xl font-semibold leading-tight md:text-5xl lg:text-6xl">
              {subtitle}
            </span>
          )}
        </h1>
      </div>
    </div>
  );
}
