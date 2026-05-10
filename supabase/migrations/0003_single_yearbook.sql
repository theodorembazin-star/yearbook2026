-- 0003: single-yearbook setup + members portrait support
--
-- Run this in the Supabase SQL editor AFTER 0001_init.sql and 0002_storage.sql.
-- Idempotent: safe to re-run.

-- 1. People get a portrait URL (uploaded by the admin).
alter table people add column if not exists cover_url text;

-- 2. Ensure exactly one yearbook exists with a known constant id.
--    The app code references this same UUID via lib/config.ts.
insert into yearbooks (id, slug, title, cover_emoji, invite_token, admin_token)
values (
  '00000000-0000-0000-0000-000000000001',
  'main',
  'Yearbook 2026',
  '🎓',
  'unused',  -- public link is just '/', no token needed
  'unused'   -- admin gating is done via the ADMIN_TOKEN env var, not the DB
)
on conflict (id) do nothing;

-- 3. Members storage policy: portrait files live under members/* in the
--    same 'photos' bucket. Reads stay public, writes go through service role.
