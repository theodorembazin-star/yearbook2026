"use client";

// Animated aurora background — large blurred color blobs slowly drifting.
// Colors adapt to the photos currently on screen, AND each color change
// also nudges the blobs to a new offset so the whole composition shifts,
// not just the hue.
// Inspired by Apple Music's "Now Playing" backdrop.

import { useEffect, useRef, useState } from "react";
import { DEFAULT_PALETTE } from "@/lib/colors";

type Props = {
  /** 4 hex colors. Falls back to a warm default palette. */
  colors?: string[];
};

type Offset = { x: number; y: number };

const SHIFT_X_VW = 24; // ±12vw
const SHIFT_Y_VH = 18; // ±9vh

function randomOffset(): Offset {
  return {
    x: (Math.random() - 0.5) * SHIFT_X_VW,
    y: (Math.random() - 0.5) * SHIFT_Y_VH,
  };
}

export default function Aurora({ colors }: Props) {
  const c = (colors && colors.length === 4 ? colors : DEFAULT_PALETTE) as [
    string,
    string,
    string,
    string,
  ];

  // Start centered so the first paint is symmetric. We'll randomize on the
  // first palette change after mount.
  const [shifts, setShifts] = useState<Offset[]>(() => [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);

  const lastKey = useRef<string>(c.join("|"));

  useEffect(() => {
    const key = c.join("|");
    if (key === lastKey.current) return;
    lastKey.current = key;
    setShifts([randomOffset(), randomOffset(), randomOffset(), randomOffset()]);
  }, [c]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {([0, 1, 2, 3] as const).map((i) => (
        <div
          key={i}
          className="aurora-shift"
          style={{
            transform: `translate(${shifts[i].x}vw, ${shifts[i].y}vh)`,
          }}
        >
          <div
            className={`aurora-blob aurora-blob-${i + 1}`}
            style={{ background: c[i] }}
          />
        </div>
      ))}
    </div>
  );
}
