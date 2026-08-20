-- Run this migration in Supabase SQL Editor.
-- It adds organizer-owned tournaments and scopes teams/state to one tournament.

create extension if not exists pgcrypto;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'custom',
  year integer not null,
  start_date date,
  end_date date,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.tournament_state
  add column if not exists tournament_id uuid references public.tournaments(id) on delete cascade;

alter table public.teams
  add column if not exists tournament_id uuid references public.tournaments(id) on delete cascade;

create unique index if not exists tournament_state_tournament_key_unique
  on public.tournament_state(tournament_id, key);

create unique index if not exists teams_tournament_name_unique
  on public.teams(tournament_id, lower(name));

alter table public.tournaments enable row level security;
alter table public.tournament_state enable row level security;
alter table public.teams enable row level security;

create policy "public can read active tournaments"
  on public.tournaments for select
  using (status = 'active' or owner_id = auth.uid());

create policy "organizers create tournaments"
  on public.tournaments for insert
  with check (owner_id = auth.uid());

create policy "owners update tournaments"
  on public.tournaments for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "public reads active tournament state"
  on public.tournament_state for select
  using (exists (
    select 1 from public.tournaments t
    where t.id = tournament_state.tournament_id
      and (t.status = 'active' or t.owner_id = auth.uid())
  ));

create policy "authenticated organizers write own tournament state"
  on public.tournament_state for all
  using (exists (
    select 1 from public.tournaments t
    where t.id = tournament_state.tournament_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.tournaments t
    where t.id = tournament_state.tournament_id and t.owner_id = auth.uid()
  ));

create policy "public reads active teams"
  on public.teams for select
  using (exists (
    select 1 from public.tournaments t
    where t.id = teams.tournament_id
      and (t.status = 'active' or t.owner_id = auth.uid())
  ));

create policy "authenticated organizers write own teams"
  on public.teams for all
  using (exists (
    select 1 from public.tournaments t
    where t.id = teams.tournament_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.tournaments t
    where t.id = teams.tournament_id and t.owner_id = auth.uid()
  ));

-- Optional legacy migration: after choosing the owner and tournament IDs,
-- assign existing 2026 rows with:
-- update teams set tournament_id = '<2026-TOURNAMENT-UUID>' where tournament_id is null;
-- update tournament_state set tournament_id = '<2026-TOURNAMENT-UUID>' where tournament_id is null;
-- Then make tournament_id mandatory if no legacy NULL rows remain.
