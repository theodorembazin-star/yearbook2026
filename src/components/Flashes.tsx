"use client";

// Discreet random flashes in the background — soft blurred circles that
// briefly pulse a color sampled from the current aurora palette, then go
// invisible for most of their cycle. Combined they read as quiet sparkles
// in the canvas, in tune with whatever hue the aurora is showing.

import { useMemo } from "react";

type Props = {
  /** Palette to sample flash colors from. */
  colors: string[];
};

const COUNT = 10;

// Deterministic pseudo-random so SSR matches CSR.
function r(seed: number, salt: number): number {
  return (Math.sin(seed * 9301 + salt * 49297) + 1) / 2;
}

export default function Flashes({ colors }: Props) {
  const items = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        size: 60 + Math.floor(r(i, 1) * 180), // 60 - 240 px
        left: r(i, 2) * 100,
        top: r(i, 3) * 100,
        // Each flash has a long cycle (10-22s) and is invisible for ~88% of
        // it — so they only pop briefly and never all together.
        duration: 10 + Math.floor(r(i, 4) * 12),
        delay: -r(i, 5) * 22,
        peak: 0.18 + r(i, 6) * 0.22, // 0.18 - 0.40
        color: colors[i % colors.length] ?? "#ffffff",
      })),
    // Re-shuffle whenever the palette changes — flashes pick the new
    // colors as soon as the aurora retunes.
    [colors],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden"
    >
      {items.map((f) => (
        <span
          key={f.id}
          className="absolute rounded-full"
          style={{
            width: `${f.size}px`,
            height: `${f.size}px`,
            left: `${f.left}%`,
            top: `${f.top}%`,
            background: f.color,
            filter: "blur(40px)",
            ["--peak" as string]: f.peak.toFixed(3),
            animation: `flash-pulse ${f.duration}s ease-in-out ${f.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
