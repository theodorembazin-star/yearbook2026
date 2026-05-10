-- Yearbook 2026 — Storage bucket setup
-- Run AFTER 0001_init.sql, also in the Supabase SQL editor.

-- Public bucket for photos. Files are read via public URLs.
-- Writes go through signed upload URLs generated server-side, so we keep
-- the bucket public for reads but restrict writes to the service role.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = excluded.public;

-- Allow anyone to read (the URL is the only secret).
drop policy if exists "photos read" on storage.objects;
create policy "photos read"
  on storage.objects for select
  to public
  using (bucket_id = 'photos');

-- Disallow direct anon writes; the API routes use the service role key.
-- (No INSERT/UPDATE/DELETE policy = anon clients cannot mutate.)
