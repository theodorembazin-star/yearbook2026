-- 0009: events.sort_at — un event a sa propre position dans la frise,
-- indépendante de ses photos. Permet de le déplacer avec les flèches
-- comme une photo.

alter table events add column if not exists sort_at timestamptz;

-- Backfill : pour les events existants ayant des photos, on prend la
-- date de la photo la plus ancienne ; sinon now().
update events e set sort_at = (
  select min(p.sort_at) from photos p where p.event_id = e.id
)
where sort_at is null
  and exists (select 1 from photos p where p.event_id = e.id);

update events set sort_at = now() where sort_at is null;

alter table events alter column sort_at set default now();
alter table events alter column sort_at set not null;

create index if not exists events_yb_sort_idx on events(yearbook_id, sort_at);
