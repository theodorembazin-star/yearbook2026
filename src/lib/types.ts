export type Yearbook = {
  id: string;
  slug: string;
  title: string;
  cover_emoji: string;
  created_at: string;
  locked?: boolean;
};

export type Contributor = {
  id: string;
  yearbook_id: string;
  display_name: string;
  emoji: string;
};

export type Person = {
  id: string;
  yearbook_id: string;
  name: string;
  cover_photo_id?: string;
  cover_url?: string;
};

export type Photo = {
  id: string;
  yearbook_id: string;
  url: string; // public URL or signed
  thumb_url: string;
  width: number;
  height: number;
  taken_at: string; // displayed date (EXIF / user input)
  sort_at?: string; // position in the timeline; defaults to taken_at, overridden by DnD
  uploaded_at: string;
  uploader_id: string;
  uploader_name: string;
  caption?: string;
  people_ids: string[]; // assigned person clusters
  status: "pending" | "published" | "hidden";
  kind: "image" | "video";
  event_id?: string;
};

export type Event = {
  id: string;
  yearbook_id: string;
  title: string;
  cover_photo_id?: string;
  created_at: string;
};

export type AuditAction =
  | "upload"
  | "delete_photo"
  | "edit_caption"
  | "edit_date"
  | "move"
  | "hide_photo"
  | "unhide_photo"
  | "create_event"
  | "delete_event"
  | "create_person"
  | "delete_person"
  | "lock"
  | "unlock";

export type AuditLog = {
  id: string;
  yearbook_id: string;
  user_name?: string;
  action: AuditAction;
  target_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
};

export type LayoutBlock = {
  id: string;
  section_id: string;
  type: "photo" | "text" | "title" | "polaroid";
  photo_id?: string;
  body?: string;
  // 12-col grid coordinates
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number; // for polaroid effect
};

export type Section = {
  id: string;
  yearbook_id: string;
  title: string;
  start_date: string;
  end_date: string;
  position: number;
};
