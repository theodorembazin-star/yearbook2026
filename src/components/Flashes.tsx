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
// Total cycle: at COUNT=10 and DURATION≈20s with evenly spaced delays of 2s,
// roughly one flash fires every 2 seconds.
const BASE_DURATION = 20;

// Deterministic pseudo-random so SSR matches CSR.
function r(seed: number, salt: number): number {
  return (Math.sin(seed * 9301 + salt * 49297) + 1) / 2;
}

export default function Flashes({ colors }: Props) {
  const items = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        size: 420 + Math.floor(r(i, 1) * 1260), // 420 - 1680 px (7x previous)
        left: r(i, 2) * 100,
        top: r(i, 3) * 100,
        // Slight jitter on duration for an organic rhythm, but the BASE
        // determines the spacing.
        duration: BASE_DURATION + Math.floor(r(i, 4) * 4) - 2, // 18-22s
        // Evenly spaced delays so flashes fire ~one every 2 seconds.
        delay: -(i * (BASE_DURATION / COUNT)) - r(i, 5) * 0.4,
        peak: 0.4 + r(i, 6) * 0.3, // 0.40 - 0.70 — brighter than before
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
            // Negative offset roughly centers each flash on its anchor
            // point so the (left, top) feels like the flash center.
            marginLeft: `-${f.size / 2}px`,
            marginTop: `-${f.size / 2}px`,
            background: f.color,
            filter: `blur(${Math.round(f.size * 0.16)}px)`,
            mixBlendMode: "screen",
            ["--peak" as string]: f.peak.toFixed(3),
            animation: `flash-pulse ${f.duration}s ease-in-out ${f.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
