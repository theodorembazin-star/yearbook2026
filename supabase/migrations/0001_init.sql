-- Yearbook 2026 — initial schema (paste-ready in the Supabase SQL editor)
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";
-- pgvector is optional; the column below is commented out by default.
-- Enable it via Database → Extensions if you want face embeddings:
-- create extension if not exists "vector";

-- =============================================================
-- Tables
-- =============================================================

create table if not exists yearbooks (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  cover_emoji   text default '📒',
  invite_token  text not null,
  admin_token   text not null,
  theme         jsonb default '{}'::jsonb,
  created_at    timestamptz default now()
);

create table if not exists contributors (
  id            uuid primary key default gen_random_uuid(),
  yearbook_id   uuid not null references yearbooks(id) on delete cascade,
  display_name  text not null,
  emoji         text default '🙂',
  fingerprint   text,
  created_at    timestamptz default now(),
  unique (yearbook_id, display_name)
);
create index if not exists contributors_yb_idx on contributors(yearbook_id);

create table if not exists people (
  id              uuid primary key default gen_random_uuid(),
  yearbook_id     uuid not null references yearbooks(id) on delete cascade,
  name            text not null,
  cover_photo_id  uuid,
  -- embedding   vector(128),  -- uncomment after enabling pgvector
  created_at      timestamptz default now()
);
create index if not exists people_yb_idx on people(yearbook_id);

create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  yearbook_id   uuid not null references yearbooks(id) on delete cascade,
  uploader_id   uuid references contributors(id) on delete set null,
  r2_key        text not null,
  thumb_key     text,
  width         int, height int,
  taken_at      timestamptz not null,
  uploaded_at   timestamptz default now(),
  exif          jsonb default '{}'::jsonb,
  phash         text,
  nsfw_score    real default 0,
  caption       text,
  status        text not null default 'published'
                check (status in ('published','pending','hidden'))
);
create index if not exists photos_yb_taken_idx on photos(yearbook_id, taken_at);
create index if not exists photos_yb_status_idx on photos(yearbook_id, status);

create table if not exists photo_people (
  photo_id   uuid not null references photos(id) on delete cascade,
  person_id  uuid not null references people(id) on delete cascade,
  bbox       jsonb,
  confidence real,
  primary key (photo_id, person_id)
);

create table if not exists sections (
  id            uuid primary key default gen_random_uuid(),
  yearbook_id   uuid not null references yearbooks(id) on delete cascade,
  title         text not null,
  start_date    timestamptz not null,
  end_date      timestamptz not null,
  position      int not null default 0,
  created_at    timestamptz default now()
);
create index if not exists sections_yb_pos_idx on sections(yearbook_id, position);

create table if not exists layout_blocks (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references sections(id) on delete cascade,
  type        text not null check (type in ('photo','text','title','polaroid')),
  photo_id    uuid references photos(id) on delete cascade,
  body        text,
  x int not null, y int not null, w int not null, h int not null,
  rotate      real default 0,
  props       jsonb default '{}'::jsonb,
  updated_at  timestamptz default now()
);
create index if not exists layout_blocks_section_idx on layout_blocks(section_id);

create table if not exists comments (
  id              uuid primary key default gen_random_uuid(),
  photo_id        uuid not null references photos(id) on delete cascade,
  contributor_id  uuid references contributors(id) on delete set null,
  body            text not null,
  created_at      timestamptz default now()
);
create index if not exists comments_photo_idx on comments(photo_id, created_at);

-- =============================================================
-- Realtime: publish changes for the photos table so the UI can
-- subscribe to "yearbook:{id}" channels.
-- =============================================================
alter publication supabase_realtime add table photos;

-- =============================================================
-- RLS
-- =============================================================
-- Token-based access is enforced in the API routes (which use the
-- service_role key). For the MVP we keep RLS disabled on the data
-- tables; turn it on once you wire JWT claims via an Edge Function.
-- This is safe because the anon key is only used for read-only
-- queries gated by the invite_token in the URL.

-- alter table yearbooks    enable row level security;
-- alter table contributors enable row level security;
-- alter table people       enable row level security;
-- alter table photos       enable row level security;
-- alter table photo_people enable row level security;
-- alter table sections     enable row level security;
-- alter table layout_blocks enable row level security;
-- alter table comments     enable row level security;
