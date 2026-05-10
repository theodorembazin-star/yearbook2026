// Hand-written types matching supabase/migrations/0001_init.sql.
// Replace with `supabase gen types typescript --project-id <ref>` once linked.

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

type PhotoStatus = "pending" | "published" | "hidden";
type BlockType = "photo" | "text" | "title" | "polaroid";

interface YearbookRow {
  id: string;
  slug: string;
  title: string;
  cover_emoji: string;
  invite_token: string;
  admin_token: string;
  theme: Json;
  created_at: string;
}
interface YearbookInsert {
  id?: string;
  slug: string;
  title: string;
  cover_emoji?: string;
  invite_token: string;
  admin_token: string;
  theme?: Json;
  created_at?: string;
}

interface ContributorRow {
  id: string;
  yearbook_id: string;
  display_name: string;
  emoji: string;
  fingerprint: string | null;
  created_at: string;
}
interface ContributorInsert {
  id?: string;
  yearbook_id: string;
  display_name: string;
  emoji?: string;
  fingerprint?: string | null;
  created_at?: string;
}

interface PersonRow {
  id: string;
  yearbook_id: string;
  name: string;
  cover_photo_id: string | null;
  embedding: number[] | null;
  created_at: string;
}
interface PersonInsert {
  id?: string;
  yearbook_id: string;
  name: string;
  cover_photo_id?: string | null;
  embedding?: number[] | null;
  created_at?: string;
}

interface PhotoRow {
  id: string;
  yearbook_id: string;
  uploader_id: string | null;
  r2_key: string;
  thumb_key: string | null;
  width: number | null;
  height: number | null;
  taken_at: string;
  uploaded_at: string;
  exif: Json;
  phash: string | null;
  nsfw_score: number;
  caption: string | null;
  status: PhotoStatus;
}
interface PhotoInsert {
  id?: string;
  yearbook_id: string;
  uploader_id?: string | null;
  r2_key: string;
  thumb_key?: string | null;
  width?: number | null;
  height?: number | null;
  taken_at: string;
  uploaded_at?: string;
  exif?: Json;
  phash?: string | null;
  nsfw_score?: number;
  caption?: string | null;
  status?: PhotoStatus;
}

interface PhotoPersonRow {
  photo_id: string;
  person_id: string;
  bbox: Json | null;
  confidence: number | null;
}

interface SectionRow {
  id: string;
  yearbook_id: string;
  title: string;
  start_date: string;
  end_date: string;
  position: number;
  created_at: string;
}
interface SectionInsert {
  id?: string;
  yearbook_id: string;
  title: string;
  start_date: string;
  end_date: string;
  position?: number;
  created_at?: string;
}

interface LayoutBlockRow {
  id: string;
  section_id: string;
  type: BlockType;
  photo_id: string | null;
  body: string | null;
  x: number; y: number; w: number; h: number;
  rotate: number;
  props: Json;
  updated_at: string;
}
interface LayoutBlockInsert {
  id?: string;
  section_id: string;
  type: BlockType;
  photo_id?: string | null;
  body?: string | null;
  x: number; y: number; w: number; h: number;
  rotate?: number;
  props?: Json;
  updated_at?: string;
}

interface CommentRow {
  id: string;
  photo_id: string;
  contributor_id: string | null;
  body: string;
  created_at: string;
}
interface CommentInsert {
  id?: string;
  photo_id: string;
  contributor_id?: string | null;
  body: string;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      yearbooks: { Row: YearbookRow; Insert: YearbookInsert; Update: Partial<YearbookInsert>; Relationships: [] };
      contributors: { Row: ContributorRow; Insert: ContributorInsert; Update: Partial<ContributorInsert>; Relationships: [] };
      people: { Row: PersonRow; Insert: PersonInsert; Update: Partial<PersonInsert>; Relationships: [] };
      photos: { Row: PhotoRow; Insert: PhotoInsert; Update: Partial<PhotoInsert>; Relationships: [] };
      photo_people: { Row: PhotoPersonRow; Insert: PhotoPersonRow; Update: Partial<PhotoPersonRow>; Relationships: [] };
      sections: { Row: SectionRow; Insert: SectionInsert; Update: Partial<SectionInsert>; Relationships: [] };
      layout_blocks: { Row: LayoutBlockRow; Insert: LayoutBlockInsert; Update: Partial<LayoutBlockInsert>; Relationships: [] };
      comments: { Row: CommentRow; Insert: CommentInsert; Update: Partial<CommentInsert>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
