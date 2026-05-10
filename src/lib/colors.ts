// Dominant-color extraction from an image URL.
// Lightweight: downsamples to 80x80, buckets pixels by quantized RGB,
// and ranks buckets by vibrance × frequency. No external dependency.

export const DEFAULT_PALETTE = ["#fbbf24", "#ec4899", "#c4451c", "#8b5cf6"];

type Bucket = {
  count: number;
  sumR: number;
  sumG: number;
  sumB: number;
  sumSat: number;
};

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

const cache = new Map<string, Promise<string[]>>();

export function extractPalette(url: string, count = 4): Promise<string[]> {
  if (typeof window === "undefined" || !url) return Promise.resolve(DEFAULT_PALETTE);
  const hit = cache.get(url);
  if (hit) return hit;

  const promise = new Promise<string[]>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    const fallback = () => resolve(DEFAULT_PALETTE);
    img.onerror = fallback;
    img.onload = () => {
      try {
        const size = 80;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return fallback();
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<string, Bucket>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 200) continue;
          const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
          if (lightness < 28 || lightness > 230) continue;
          const sat = saturation(r, g, b);
          if (sat < 0.15) continue;
          // 4 levels per channel = 64 buckets
          const key = `${r >> 6}-${g >> 6}-${b >> 6}`;
          const bucket = buckets.get(key) ?? {
            count: 0,
            sumR: 0,
            sumG: 0,
            sumB: 0,
            sumSat: 0,
          };
          bucket.count++;
          bucket.sumR += r;
          bucket.sumG += g;
          bucket.sumB += b;
          bucket.sumSat += sat;
          buckets.set(key, bucket);
        }

        const ranked = [...buckets.values()]
          .map((b) => ({
            color: rgbToHex(b.sumR / b.count, b.sumG / b.count, b.sumB / b.count),
            score: b.count * (b.sumSat / b.count),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, count)
          .map((x) => x.color);

        resolve(ranked.length > 0 ? padTo(ranked, count) : DEFAULT_PALETTE);
      } catch {
        // Cross-origin tainting will land here.
        fallback();
      }
    };
    img.src = url;
  });

  cache.set(url, promise);
  return promise;
}

function padTo(palette: string[], count: number): string[] {
  if (palette.length >= count) return palette.slice(0, count);
  const out = palette.slice();
  while (out.length < count) out.push(palette[out.length % palette.length]);
  return out;
}
