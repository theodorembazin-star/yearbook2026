// Maps a Supabase row to the UI Photo type. Files live in the public 'photos'
// bucket of Supabase Storage; URLs follow the standard public path:
//   {SUPABASE_URL}/storage/v1/object/public/photos/{key}
import type { Event, Photo, Person } from "./types";
import type { Database } from "./supabase/types";

type DBPhoto = Database["public"]["Tables"]["photos"]["Row"] & {
  uploader_name?: string | null;
  media_type?: "image" | "video" | null;
  event_id?: string | null;
  sort_at?: string | null;
  contributors: { display_name: string } | null;
  photo_people: { person_id: string }[] | null;
};

function publicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/photos/${key}`;
}

export function photoFromRow(row: DBPhoto): Photo {
  return {
    id: row.id,
    yearbook_id: row.yearbook_id,
    url: publicUrl(row.r2_key),
    thumb_url: publicUrl(row.thumb_key ?? row.r2_key),
    width: row.width ?? 1200,
    height: row.height ?? 800,
    taken_at: row.taken_at,
    uploaded_at: row.uploaded_at,
    uploader_id: row.uploader_id ?? "",
    // Prefer the denormalized name; fall back to the contributor join,
    // then to a generic 'Anonyme' as a last resort.
    uploader_name:
      row.uploader_name ?? row.contributors?.display_name ?? "Anonyme",
    caption: row.caption ?? undefined,
    people_ids: (row.photo_people ?? []).map((p) => p.person_id),
    status: row.status,
    kind: row.media_type === "video" ? "video" : "image",
    event_id: row.event_id ?? undefined,
    sort_at: row.sort_at ?? row.taken_at,
  };
}

export function eventFromRow(row: {
  id: string;
  yearbook_id: string;
  title: string;
  cover_photo_id?: string | null;
  created_at: string;
  sort_at?: string | null;
}): Event {
  return {
    id: row.id,
    yearbook_id: row.yearbook_id,
    title: row.title,
    cover_photo_id: row.cover_photo_id ?? undefined,
    created_at: row.created_at,
    sort_at: row.sort_at ?? undefined,
  };
}

export type DBPerson = Database["public"]["Tables"]["people"]["Row"] & {
  cover_url?: string | null;
};
export const personFromRow = (row: DBPerson): Person => ({
  id: row.id,
  yearbook_id: row.yearbook_id,
  name: row.name,
  cover_photo_id: row.cover_photo_id ?? undefined,
  cover_url: row.cover_url ?? undefined,
});
