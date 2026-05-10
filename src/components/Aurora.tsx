// Animated aurora background — large blurred color blobs slowly drifting.
// Colors can be passed in to adapt to the photos currently on screen.
// Inspired by Apple Music's "Now Playing" backdrop.

import { DEFAULT_PALETTE } from "@/lib/colors";

type Props = {
  /** 4 hex colors. Falls back to a warm default palette. */
  colors?: string[];
};

export default function Aurora({ colors }: Props) {
  const c = (colors && colors.length === 4 ? colors : DEFAULT_PALETTE) as [
    string,
    string,
    string,
    string,
  ];
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="aurora-blob aurora-blob-1" style={{ background: c[0] }} />
      <div className="aurora-blob aurora-blob-2" style={{ background: c[1] }} />
      <div className="aurora-blob aurora-blob-3" style={{ background: c[2] }} />
      <div className="aurora-blob aurora-blob-4" style={{ background: c[3] }} />
    </div>
  );
}
