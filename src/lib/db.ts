// Maps a Supabase row to the UI Photo type, building public URLs from R2 keys.
import type { Photo, Person } from "./types";
import type { Database } from "./supabase/types";

type DBPhoto = Database["public"]["Tables"]["photos"]["Row"] & {
  contributors: { display_name: string } | null;
  photo_people: { person_id: string }[] | null;
};

const PUBLIC_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE ?? "";

export function photoFromRow(row: DBPhoto): Photo {
  return {
    id: row.id,
    yearbook_id: row.yearbook_id,
    url: `${PUBLIC_BASE}/${row.r2_key}`,
    thumb_url: row.thumb_key ? `${PUBLIC_BASE}/${row.thumb_key}` : `${PUBLIC_BASE}/${row.r2_key}`,
    width: row.width ?? 1200,
    height: row.height ?? 800,
    taken_at: row.taken_at,
    uploaded_at: row.uploaded_at,
    uploader_id: row.uploader_id ?? "",
    uploader_name: row.contributors?.display_name ?? "Anonyme",
    caption: row.caption ?? undefined,
    people_ids: (row.photo_people ?? []).map((p) => p.person_id),
    status: row.status,
  };
}

export type DBPerson = Database["public"]["Tables"]["people"]["Row"];
export const personFromRow = (row: DBPerson): Person => ({
  id: row.id,
  yearbook_id: row.yearbook_id,
  name: row.name,
  cover_photo_id: row.cover_photo_id ?? undefined,
});
