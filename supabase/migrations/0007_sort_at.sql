-- 0007: sort_at — display-order timestamp distinct from taken_at.
--
-- - taken_at  : when the photo was actually taken (EXIF / user input). Displayed.
-- - sort_at   : where the photo sits in the timeline. Initially equal to
--               taken_at; drag-and-drop overrides it. Editing taken_at later
--               does NOT touch sort_at, so manual placement keeps priority.
--               A photo can be reset to "auto" by setting sort_at = taken_at.
--
-- Idempotent.

alter table photos add column if not exists sort_at timestamptz;

-- Backfill existing rows
update photos set sort_at = taken_at where sort_at is null;

alter table photos alter column sort_at set default now();
alter table photos alter column sort_at set not null;

create index if not exists photos_yb_sort_idx on photos(yearbook_id, sort_at);
