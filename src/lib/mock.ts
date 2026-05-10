import type { Photo, Yearbook, Person } from "./types";

// Demo dataset so the UI runs without any backend wired up yet.
// Uses SVG data-URIs so the demo works offline without external image hosts.
export const demoYearbook: Yearbook = {
  id: "yb_demo",
  slug: "promo-2026",
  title: "Promo 2026 — souvenirs",
  cover_emoji: "🎓",
  created_at: "2025-09-01T00:00:00Z",
};

export const demoPeople: Person[] = [
  { id: "p1", yearbook_id: "yb_demo", name: "Léa" },
  { id: "p2", yearbook_id: "yb_demo", name: "Yanis" },
  { id: "p3", yearbook_id: "yb_demo", name: "Camille" },
  { id: "p4", yearbook_id: "yb_demo", name: "Mehdi" },
];

function svgPhoto(emoji: string, from: string, to: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${from}"/>
        <stop offset="1" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <text x="600" y="430" font-size="220" text-anchor="middle" font-family="serif">${emoji}</text>
    <text x="600" y="560" font-size="38" text-anchor="middle" font-family="Georgia, serif" fill="rgba(0,0,0,0.55)" font-style="italic">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const photo = (emoji: string, from: string, to: string, label: string) => {
  const url = svgPhoto(emoji, from, to, label);
  return { url, thumb_url: url };
};

export const demoPhotos: Photo[] = [
  // ---------- Septembre 2025 ----------
  {
    id: "ph1",
    yearbook_id: "yb_demo",
    ...photo("🎓", "#fde68a", "#f59e0b", "Rentrée"),
    width: 1200, height: 800,
    taken_at: "2025-09-12T18:30:00Z",
    uploaded_at: "2025-09-13T09:00:00Z",
    uploader_id: "c1", uploader_name: "Léa",
    caption: "Premier jour, on se reconnaît à peine.",
    people_ids: ["p1", "p2"], status: "published",
  },
  {
    id: "ph2",
    yearbook_id: "yb_demo",
    ...photo("📚", "#fef3c7", "#fbbf24", "BU"),
    width: 1200, height: 800,
    taken_at: "2025-09-22T14:00:00Z",
    uploaded_at: "2025-09-22T20:00:00Z",
    uploader_id: "c2", uploader_name: "Yanis",
    caption: "Rush sur la BU.",
    people_ids: ["p2", "p3"], status: "published",
  },
  {
    id: "ph3",
    yearbook_id: "yb_demo",
    ...photo("☕", "#fed7aa", "#f97316", "Pause café"),
    width: 1200, height: 800,
    taken_at: "2025-09-28T10:30:00Z",
    uploaded_at: "2025-09-28T12:00:00Z",
    uploader_id: "c3", uploader_name: "Camille",
    caption: "Pause méritée.",
    people_ids: ["p1", "p3"], status: "published",
  },

  // ---------- Octobre 2025 ----------
  {
    id: "ph4",
    yearbook_id: "yb_demo",
    ...photo("🎉", "#a78bfa", "#7c3aed", "Soirée d'inté"),
    width: 1200, height: 800,
    taken_at: "2025-10-04T22:10:00Z",
    uploaded_at: "2025-10-05T08:00:00Z",
    uploader_id: "c2", uploader_name: "Yanis",
    caption: "Soirée d'intégration.",
    people_ids: ["p2", "p3", "p4"], status: "published",
  },
  {
    id: "ph5",
    yearbook_id: "yb_demo",
    ...photo("🍕", "#fca5a5", "#ef4444", "Pizza"),
    width: 1200, height: 800,
    taken_at: "2025-10-15T20:00:00Z",
    uploaded_at: "2025-10-16T08:00:00Z",
    uploader_id: "c4", uploader_name: "Mehdi",
    caption: "Pizza party en coloc.",
    people_ids: ["p1", "p4"], status: "published",
  },

  // ---------- Novembre 2025 ----------
  {
    id: "ph6",
    yearbook_id: "yb_demo",
    ...photo("💻", "#93c5fd", "#2563eb", "Hackathon"),
    width: 1200, height: 800,
    taken_at: "2025-11-08T11:00:00Z",
    uploaded_at: "2025-11-08T22:00:00Z",
    uploader_id: "c1", uploader_name: "Léa",
    caption: "Hackathon, 36h non-stop.",
    people_ids: ["p1", "p2", "p4"], status: "published",
  },
  {
    id: "ph7",
    yearbook_id: "yb_demo",
    ...photo("📓", "#bbf7d0", "#16a34a", "Notes"),
    width: 1200, height: 800,
    taken_at: "2025-11-21T14:00:00Z",
    uploaded_at: "2025-11-21T20:00:00Z",
    uploader_id: "c3", uploader_name: "Camille",
    caption: "Projet de groupe à la BU.",
    people_ids: ["p1", "p3"], status: "published",
  },

  // ---------- Décembre 2025 ----------
  {
    id: "ph8",
    yearbook_id: "yb_demo",
    ...photo("🎄", "#86efac", "#15803d", "Noël"),
    width: 1200, height: 800,
    taken_at: "2025-12-19T20:00:00Z",
    uploaded_at: "2025-12-20T10:00:00Z",
    uploader_id: "c4", uploader_name: "Mehdi",
    caption: "Repas de fin d'année.",
    people_ids: ["p1", "p2", "p3", "p4"], status: "published",
  },
  {
    id: "ph9",
    yearbook_id: "yb_demo",
    ...photo("🥂", "#fcd34d", "#d97706", "Trinquons"),
    width: 1200, height: 800,
    taken_at: "2025-12-31T23:30:00Z",
    uploaded_at: "2026-01-01T03:00:00Z",
    uploader_id: "c1", uploader_name: "Léa",
    caption: "Bonne année !",
    people_ids: ["p1", "p2", "p3"], status: "published",
  },

  // ---------- Février 2026 ----------
  {
    id: "ph10",
    yearbook_id: "yb_demo",
    ...photo("⛷️", "#bae6fd", "#0284c7", "Ski"),
    width: 1200, height: 800,
    taken_at: "2026-02-08T11:00:00Z",
    uploaded_at: "2026-02-08T18:00:00Z",
    uploader_id: "c1", uploader_name: "Léa",
    caption: "Sortie ski.",
    people_ids: ["p1", "p4"], status: "published",
  },
  {
    id: "ph11",
    yearbook_id: "yb_demo",
    ...photo("🏔️", "#e0f2fe", "#0369a1", "Montagne"),
    width: 1200, height: 800,
    taken_at: "2026-02-09T16:00:00Z",
    uploaded_at: "2026-02-10T10:00:00Z",
    uploader_id: "c4", uploader_name: "Mehdi",
    caption: "Vue depuis le sommet.",
    people_ids: ["p4"], status: "published",
  },

  // ---------- Avril 2026 ----------
  {
    id: "ph12",
    yearbook_id: "yb_demo",
    ...photo("🌸", "#fbcfe8", "#db2777", "Printemps"),
    width: 1200, height: 800,
    taken_at: "2026-04-15T16:30:00Z",
    uploaded_at: "2026-04-15T19:00:00Z",
    uploader_id: "c2", uploader_name: "Yanis",
    caption: "Dernière soirée avant les exams.",
    people_ids: ["p2", "p3"], status: "published",
  },
  {
    id: "ph13",
    yearbook_id: "yb_demo",
    ...photo("🎬", "#ddd6fe", "#6d28d9", "Cinéma"),
    width: 1200, height: 800,
    taken_at: "2026-04-22T21:00:00Z",
    uploaded_at: "2026-04-22T23:30:00Z",
    uploader_id: "c3", uploader_name: "Camille",
    caption: "Soirée ciné en plein air.",
    people_ids: ["p1", "p2", "p3"], status: "published",
  },
];
