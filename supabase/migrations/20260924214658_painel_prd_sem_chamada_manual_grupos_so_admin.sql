-- Ajustes do painel ao PRD (SPC-7):
-- 1) Não existe chamada manual/fora de ordem: só o lote inicial (painel_iniciar_sala) e a reposição
--    automática 1 por 1 (check-out / não compareceu). Remove painel_chamar (nunca foi usada pelo front).
-- 2) painel_definir_grupos é só do admin (PRD: configs são do admin; coordenador só opera).
-- 3) anon não precisa de SELECT em staff_members (o RLS já bloqueava; aqui some também o grant).

drop function if exists public.painel_chamar(uuid);

create or replace function public.painel_definir_grupos(p_grupos int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Belem')::date;
  v_chamados int;
begin
  if not is_staff() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  if not exists (
    select 1 from staff_members where user_id = auth.uid() and papel = 'admin'
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  if p_grupos is null or p_grupos < 1 or p_grupos > 50 then
    return jsonb_build_object('ok', false, 'motivo', 'valor_invalido');
  end if;

  perform 1 from config_sala where id = 1 for update;

  update config_sala
     set grupos_ativos = p_grupos, atualizado_em = now()
   where id = 1;

  v_chamados := _preencher_vagas(v_dia);
  return jsonb_build_object('ok', true, 'chamados', v_chamados);
end;
$$;

revoke execute on function public.painel_definir_grupos(int) from public, anon;
grant execute on function public.painel_definir_grupos(int) to authenticated;

revoke select on public.staff_members from anon;
