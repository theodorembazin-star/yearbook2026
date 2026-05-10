-- 0004: store the uploader's display name directly on the photo row.
--
-- Originally we only stored uploader_id (FK to contributors) and resolved
-- the display name via a PostgREST embed (contributors(display_name)).
-- That join sometimes returned null even when the contributor existed,
-- so the UI fell back to "Anonyme". Denormalizing fixes it definitively.
--
-- Idempotent: safe to re-run.

alter table photos add column if not exists uploader_name text;

-- Backfill for any existing photo that already has a contributor link.
update photos
set uploader_name = c.display_name
from contributors c
where photos.uploader_id = c.id
  and photos.uploader_name is null;
