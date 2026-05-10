// Paper-grain texture over the whole page. Procedural SVG noise (no asset
// download), tiled, at low opacity and overlay blend so it adds a subtle
// printed-paper feel without obscuring colors. Sits above content via
// pointer-events: none + a high z-index — dialogs and the main canvas
// inherit the texture.

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.65 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;

const DATA_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_SVG)}")`;

export default function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.18] mix-blend-overlay"
      style={{
        backgroundImage: DATA_URL,
        backgroundRepeat: "repeat",
        backgroundSize: "240px 240px",
      }}
    />
  );
}
