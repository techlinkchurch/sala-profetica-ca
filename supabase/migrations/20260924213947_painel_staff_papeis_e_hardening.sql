-- Papéis da equipe (SPC-6) e hardening de grants nas tabelas públicas.

alter table public.staff_members
  add column if not exists papel text not null default 'coordenador'
    check (papel in ('coordenador', 'admin')),
  add column if not exists nome text;

-- cada membro da equipe só enxerga a própria linha; escrita só pelo Dashboard/SQL
create policy staff_members_select_self on public.staff_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- hardening: nenhum papel da API precisa de TRUNCATE/TRIGGER/REFERENCES
revoke truncate, trigger, references
  on public.contatos, public.fila_sala_profetica, public.config_sala,
     public.dias_sala_profetica, public.staff_members
  from anon, authenticated;

-- staff_members é gerida só pelo Dashboard/SQL
revoke insert, update, delete on public.staff_members from anon, authenticated;
