-- Sessão diária da sala (iniciar/finalizar pelo painel). Escrita só pelas RPCs painel_*.

create table if not exists public.sessoes_sala (
  dia date primary key,
  iniciada_em timestamptz,
  iniciada_por uuid references auth.users (id),
  finalizada_em timestamptz,
  finalizada_por uuid references auth.users (id)
);

alter table public.sessoes_sala enable row level security;

create policy sessoes_sala_select_staff on public.sessoes_sala
  for select to authenticated
  using ((select public.is_staff()));

revoke all on public.sessoes_sala from anon;
revoke insert, update, delete, truncate, trigger, references on public.sessoes_sala from authenticated;
grant select on public.sessoes_sala to authenticated;

alter publication supabase_realtime add table public.sessoes_sala;
