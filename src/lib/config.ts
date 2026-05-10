// Single-yearbook configuration.
// The DB still has a `yearbooks` table (and FKs from photos/people) but we
// only ever use one row, identified by this constant UUID. See migration
// 0003_single_yearbook.sql.

export const YEARBOOK_ID = "00000000-0000-0000-0000-000000000001";

// Public-facing branding. Override via env vars at deploy time if you want
// to reuse this codebase for another event.
export const YEARBOOK_TITLE =
  process.env.NEXT_PUBLIC_YEARBOOK_TITLE ?? "Yearbook de l'Essouriau";
export const YEARBOOK_EMOJI =
  process.env.NEXT_PUBLIC_YEARBOOK_EMOJI ?? "🎓";
export const YEARBOOK_TAGLINE =
  process.env.NEXT_PUBLIC_YEARBOOK_TAGLINE ??
  "Souvenir collectif de la PSI PCSI";
