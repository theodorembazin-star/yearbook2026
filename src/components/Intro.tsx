"use client";

// Minimal intro: a glow halo blooms, the logo appears inside it, the glow
// fades, the black overlay fades, the hero is revealed underneath. Total
// runtime ~1.4s. Scroll is locked while it plays.

import { useEffect, useState } from "react";

const TOTAL_MS = 1400;

type Props = {
  title: string;
  subtitle?: string;
};

export default function Intro({ title, subtitle }: Props) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const t = setTimeout(() => {
      setDone(true);
      html.style.overflow = prev;
    }, TOTAL_MS);
    return () => {
      clearTimeout(t);
      html.style.overflow = prev;
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="intro-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black px-6 text-center"
    >
      <div className="relative">
        <div className="intro-glow" />
        <h1 className="intro-text relative font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
          {title}
          {subtitle && (
            <span className="mt-1 block text-left text-3xl font-semibold leading-tight md:text-5xl lg:text-6xl">
              {subtitle}
            </span>
          )}
        </h1>
      </div>
    </div>
  );
}
