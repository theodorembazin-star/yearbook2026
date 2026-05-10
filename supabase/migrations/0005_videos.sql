-- 0005: video support — distinguish images and videos in the photos table.
--
-- Idempotent: safe to re-run.

alter table photos
  add column if not exists media_type text not null default 'image';

-- Constrain to known kinds. Drop+recreate in case the constraint was added
-- previously with a different definition.
alter table photos drop constraint if exists photos_media_type_check;
alter table photos add constraint photos_media_type_check
  check (media_type in ('image', 'video'));
