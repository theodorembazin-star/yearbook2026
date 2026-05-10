import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateFr(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// School-year cutoff: the 20th of August. Anything on/after that date counts
// as the new school year, before that it's still the previous one. So the
// August month is split into two sections: 'pre' (PCSI) and 'post' (PSI).
const RENTREE_DAY = 20;

// Section key for a photo's taken_at date. Returns either:
//   - "YYYY-MM"            for any month other than August
//   - "YYYY-08-pre"        for August dates before the 20th
//   - "YYYY-08-post"       for August dates on or after the 20th
export function sectionKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (m === 8) {
    return `${y}-08-${date.getDate() < RENTREE_DAY ? "pre" : "post"}`;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// Backwards-compatible alias used by older code paths.
export const monthKey = sectionKey;

export function formatMonthFr(key: string) {
  const parts = key.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

// School year for a section key. With the August 20 cutoff:
//   2024-09..2025-07, 2025-08-pre   → school year "2024-25"
//   2025-08-post, 2025-09..         → school year "2025-26"
export function schoolYearOf(key: string): string {
  const parts = key.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const suffix = parts[2]; // "pre" or "post" for August
  let startYear: number;
  if (m === 8 && suffix === "post") startYear = y;
  else if (m >= 9) startYear = y;
  else startYear = y - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

// Hard-coded class labels. Override per-event by editing this map.
const CLASS_LABELS: Record<string, string> = {
  "2024-25": "PCSI",
  "2025-26": "PSI",
};

export function formatSchoolYear(key: string): string {
  if (CLASS_LABELS[key]) return CLASS_LABELS[key];
  const [start, endShort] = key.split("-");
  return `${start} — 20${endShort}`;
}
