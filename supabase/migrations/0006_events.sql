-- 0006: events — groupes de photos partageant un titre.
-- Une photo peut appartenir à au plus un événement (event_id sur photos).
-- La suppression d'un event détache ses photos (set null) sans les effacer.
--
-- Idempotent: safe to re-run.

create table if not exists events (
  id              uuid primary key default gen_random_uuid(),
  yearbook_id     uuid not null references yearbooks(id) on delete cascade,
  title           text not null,
  cover_photo_id  uuid references photos(id) on delete set null,
  created_at      timestamptz default now()
);
create index if not exists events_yb_idx on events(yearbook_id);

alter table photos add column if not exists event_id uuid
  references events(id) on delete set null;
create index if not exists photos_event_idx on photos(event_id);

-- Realtime — UI peut écouter la création / suppression d'événements.
alter publication supabase_realtime add table events;
