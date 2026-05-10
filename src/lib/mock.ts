import type { Photo, Yearbook, Person } from "./types";

// Demo dataset so the UI runs without any backend wired up yet.
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

const u = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`;

export const demoPhotos: Photo[] = [
  {
    id: "ph1",
    yearbook_id: "yb_demo",
    url: u("1529156069898-49953e39b3ac"),
    thumb_url: u("1529156069898-49953e39b3ac", 600, 400),
    width: 1200, height: 800,
    taken_at: "2025-09-12T18:30:00Z",
    uploaded_at: "2025-09-13T09:00:00Z",
    uploader_id: "c1", uploader_name: "Léa",
    caption: "Premier jour, on se reconnaît à peine.",
    people_ids: ["p1", "p2"],
    status: "published",
  },
  {
    id: "ph2",
    yearbook_id: "yb_demo",
    url: u("1511795409834-ef04bbd61622"),
    thumb_url: u("1511795409834-ef04bbd61622", 600, 400),
    width: 1200, height: 800,
    taken_at: "2025-10-04T22:10:00Z",
    uploaded_at: "2025-10-05T08:00:00Z",
    uploader_id: "c2", uploader_name: "Yanis",
    caption: "Soirée d'intégration.",
    people_ids: ["p2", "p3", "p4"],
    status: "published",
  },
  {
    id: "ph3",
    yearbook_id: "yb_demo",
    url: u("1543269865-cbf427effbad"),
    thumb_url: u("1543269865-cbf427effbad", 600, 400),
    width: 1200, height: 800,
    taken_at: "2025-11-21T14:00:00Z",
    uploaded_at: "2025-11-21T20:00:00Z",
    uploader_id: "c3", uploader_name: "Camille",
    caption: "Projet de groupe à la BU.",
    people_ids: ["p1", "p3"],
    status: "published",
  },
  {
    id: "ph4",
    yearbook_id: "yb_demo",
    url: u("1517457373958-b7bdd4587205"),
    thumb_url: u("1517457373958-b7bdd4587205", 600, 400),
    width: 1200, height: 800,
    taken_at: "2025-12-19T20:00:00Z",
    uploaded_at: "2025-12-20T10:00:00Z",
    uploader_id: "c4", uploader_name: "Mehdi",
    caption: "Repas de fin d'année.",
    people_ids: ["p1", "p2", "p3", "p4"],
    status: "published",
  },
  {
    id: "ph5",
    yearbook_id: "yb_demo",
    url: u("1523580494863-6f3031224c94"),
    thumb_url: u("1523580494863-6f3031224c94", 600, 400),
    width: 1200, height: 800,
    taken_at: "2026-02-08T11:00:00Z",
    uploaded_at: "2026-02-08T18:00:00Z",
    uploader_id: "c1", uploader_name: "Léa",
    caption: "Sortie ski.",
    people_ids: ["p1", "p4"],
    status: "published",
  },
  {
    id: "ph6",
    yearbook_id: "yb_demo",
    url: u("1523240795612-9a054b0db644"),
    thumb_url: u("1523240795612-9a054b0db644", 600, 400),
    width: 1200, height: 800,
    taken_at: "2026-04-15T16:30:00Z",
    uploaded_at: "2026-04-15T19:00:00Z",
    uploader_id: "c2", uploader_name: "Yanis",
    caption: "Dernière soirée avant les exams.",
    people_ids: ["p2", "p3"],
    status: "published",
  },
];
