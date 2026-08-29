-- AgentShelf's first server-side persistence table.
-- Run this in Supabase SQL Editor before using the deployed backend.
create table if not exists public.agentshelf_workspaces (
  id text primary key,
  name text not null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists agentshelf_workspaces_updated_at_idx
  on public.agentshelf_workspaces (updated_at desc);

alter table public.agentshelf_workspaces enable row level security;

-- The current MVP accesses this table only from server routes with the
-- service-role key. No client-side table access is enabled.
