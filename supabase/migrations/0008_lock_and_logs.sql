-- 0008: verrouillage global + journal des modifications.
--
-- - yearbooks.locked  : quand true, seuls les admins peuvent muter.
-- - audit_logs        : entrée par action (upload, edit, delete, lock, …)
--                       avec le nom fourni par l'utilisateur.
-- Realtime activée sur les deux tables.

alter table yearbooks add column if not exists locked boolean not null default false;

create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  yearbook_id uuid not null references yearbooks(id) on delete cascade,
  user_name   text,
  action      text not null,
  target_id   uuid,
  details     jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);
create index if not exists audit_logs_yb_created_idx
  on audit_logs(yearbook_id, created_at desc);

do $$
begin
  begin
    alter publication supabase_realtime add table yearbooks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table audit_logs;
  exception when duplicate_object then null;
  end;
end $$;
