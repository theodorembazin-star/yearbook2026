// Discreet floating bubble bouquet — small, soft circles slowly drifting
// upward across the viewport. Adds quiet life to the dark canvas without
// competing with the aurora or the photos.

const COUNT = 22;

// Deterministic-ish positions so SSR and CSR match (no hydration warnings).
const BUBBLES = Array.from({ length: COUNT }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 9301 + n * 49297) + 1) / 2);
  return {
    id: i,
    size: 4 + Math.floor(r(1) * 14), // 4 - 18 px
    left: r(2) * 100, // 0 - 100%
    delay: -r(3) * 26, // negative so they don't all start together
    duration: 16 + Math.floor(r(4) * 18), // 16 - 34 s
    drift: (r(5) - 0.5) * 24, // ±12vw lateral wander
    peak: 0.06 + r(6) * 0.14, // 0.06 - 0.20
  };
});

export default function Bubbles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden"
    >
      {BUBBLES.map((b) => (
        <span
          key={b.id}
          className="bubble absolute rounded-full bg-white"
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            left: `${b.left}%`,
            bottom: "-40px",
            // CSS custom properties consumed by the @keyframes in globals.css
            ["--peak" as string]: b.peak.toFixed(3),
            ["--drift" as string]: `${b.drift.toFixed(1)}vw`,
            animation: `bubble-rise ${b.duration}s linear ${b.delay}s infinite`,
            filter: "blur(1px)",
          }}
        />
      ))}
    </div>
  );
}
