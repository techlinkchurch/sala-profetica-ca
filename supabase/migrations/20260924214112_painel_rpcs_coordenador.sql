-- RPCs do painel do coordenador (SPC-6). Contrato em src/painel/contrato.ts.
-- Toda mudança para 'chamado' dispara o WhatsApp de chamada (Database Webhook -> enviar-template-fila).
-- Ordem de travas em todas as funções que escrevem: config_sala (id = 1) primeiro, depois as linhas da fila
-- (a mesma trava que inscrever_na_fila usa), para evitar deadlock e corrida no cálculo de vagas.

-- Helper interno: chama os próximos 'aguardando' até ocupar grupos_ativos.
create or replace function public._preencher_vagas(p_dia date)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_grupos int;
  v_ocupadas int;
  v_livres int;
  v_chamados int := 0;
begin
  select grupos_ativos into v_grupos from config_sala where id = 1 for update;

  if not exists (
    select 1 from sessoes_sala
    where dia = p_dia and iniciada_em is not null and finalizada_em is null
  ) then
    return 0;
  end if;

  select count(*) into v_ocupadas
  from fila_sala_profetica
  where dia_evento = p_dia and status in ('chamado', 'em_atendimento');

  v_livres := greatest(coalesce(v_grupos, 0) - v_ocupadas, 0);
  if v_livres = 0 then
    return 0;
  end if;

  with alvo as (
    select id from fila_sala_profetica
    where dia_evento = p_dia and status = 'aguardando'
    order by criado_em, id
    limit v_livres
    for update skip locked
  )
  update fila_sala_profetica f
     set status = 'chamado', chamado_em = now()
    from alvo
   where f.id = alvo.id;

  get diagnostics v_chamados = row_count;
  return v_chamados;
end;
$$;

revoke execute on function public._preencher_vagas(date) from public, anon, authenticated;


-- Estado completo do painel para o dia de hoje (Belém).
create or replace function public.painel_estado()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Belem')::date;
  v_papel text;
  v_sessao jsonb;
  v_config jsonb;
  v_fila jsonb;
begin
  if not is_staff() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  select papel into v_papel from staff_members where user_id = auth.uid();

  select jsonb_build_object('iniciada_em', s.iniciada_em, 'finalizada_em', s.finalizada_em)
    into v_sessao
    from sessoes_sala s where s.dia = v_dia;

  select jsonb_build_object(
           'grupos_ativos', c.grupos_ativos,
           'vagas_dia', c.vagas_dia,
           'tempo_limite_min', c.tempo_limite_min)
    into v_config
    from config_sala c where c.id = 1;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id,
           'nome', x.nome,
           'email', x.email,
           'telefone', x.telefone,
           'status', x.status,
           'posicao', x.posicao,
           'criado_em', x.criado_em,
           'chamado_em', x.chamado_em,
           'entrou_em', x.entrou_em,
           'saiu_em', x.saiu_em,
           'ultimo_erro', x.ultimo_erro
         ) order by x.criado_em, x.id), '[]'::jsonb)
    into v_fila
    from (
      select f.id, c.nome, c.email, c.telefone, f.status, f.criado_em,
             f.chamado_em, f.entrou_em, f.saiu_em, f.ultimo_erro,
             case when f.status = 'aguardando' then
               row_number() over (partition by (f.status = 'aguardando') order by f.criado_em, f.id)
             end as posicao
        from fila_sala_profetica f
        join contatos c on c.id = f.contato_id
       where f.dia_evento = v_dia
    ) x;

  return jsonb_build_object(
    'ok', true,
    'dia', v_dia,
    'papel', v_papel,
    'sessao', v_sessao,
    'config', v_config,
    'fila', v_fila);
end;
$$;


-- Cria a sessão do dia e chama o primeiro lote (= vagas livres).
create or replace function public.painel_iniciar_sala()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Belem')::date;
  v_sessao sessoes_sala%rowtype;
  v_chamados int;
begin
  if not is_staff() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  perform 1 from config_sala where id = 1 for update;

  select * into v_sessao from sessoes_sala where dia = v_dia;
  if found then
    if v_sessao.finalizada_em is not null then
      return jsonb_build_object('ok', false, 'motivo', 'sala_finalizada');
    end if;
    return jsonb_build_object('ok', false, 'motivo', 'sala_ja_iniciada');
  end if;

  insert into sessoes_sala (dia, iniciada_em, iniciada_por)
  values (v_dia, now(), auth.uid());

  v_chamados := _preencher_vagas(v_dia);
  return jsonb_build_object('ok', true, 'chamados', v_chamados);
end;
$$;


-- Chamada manual / reenvio: aguardando|falha_envio -> chamado (ignora o limite de vagas).
create or replace function public.painel_chamar(p_fila_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Belem')::date;
  v_sessao sessoes_sala%rowtype;
  v_status text;
begin
  if not is_staff() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  perform 1 from config_sala where id = 1 for update;

  select * into v_sessao from sessoes_sala where dia = v_dia;
  if not found or v_sessao.iniciada_em is null then
    return jsonb_build_object('ok', false, 'motivo', 'sala_nao_iniciada');
  end if;
  if v_sessao.finalizada_em is not null then
    return jsonb_build_object('ok', false, 'motivo', 'sala_finalizada');
  end if;

  select status into v_status from fila_sala_profetica
   where id = p_fila_id and dia_evento = v_dia for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrado');
  end if;
  if v_status not in ('aguardando', 'falha_envio') then
    return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida');
  end if;

  update fila_sala_profetica
     set status = 'chamado', chamado_em = now()
   where id = p_fila_id;

  return jsonb_build_object('ok', true);
end;
$$;


-- Check-in: chamado|falha_envio -> em_atendimento.
create or replace function public.painel_check_in(p_fila_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Belem')::date;
  v_status text;
begin
  if not is_staff() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  perform 1 from config_sala where id = 1 for update;

  select status into v_status from fila_sala_profetica
   where id = p_fila_id and dia_evento = v_dia for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrado');
  end if;
  if v_status not in ('chamado', 'falha_envio') then
    return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida');
  end if;

  update fila_sala_profetica
     set status = 'em_atendimento', entrou_em = now()
   where id = p_fila_id;

  return jsonb_build_object('ok', true);
end;
$$;


-- Check-out: em_atendimento -> concluido; depois repõe as vagas.
create or replace function public.painel_check_out(p_fila_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Belem')::date;
  v_status text;
  v_chamados int;
begin
  if not is_staff() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  perform 1 from config_sala where id = 1 for update;

  select status into v_status from fila_sala_profetica
   where id = p_fila_id and dia_evento = v_dia for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrado');
  end if;
  if v_status <> 'em_atendimento' then
    return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida');
  end if;

  update fila_sala_profetica
     set status = 'concluido', saiu_em = now()
   where id = p_fila_id;

  v_chamados := _preencher_vagas(v_dia);
  return jsonb_build_object('ok', true, 'chamados', v_chamados);
end;
$$;


-- Não compareceu: chamado|falha_envio -> nao_compareceu; depois repõe as vagas.
create or replace function public.painel_nao_compareceu(p_fila_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Belem')::date;
  v_status text;
  v_chamados int;
begin
  if not is_staff() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  perform 1 from config_sala where id = 1 for update;

  select status into v_status from fila_sala_profetica
   where id = p_fila_id and dia_evento = v_dia for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrado');
  end if;
  if v_status not in ('chamado', 'falha_envio') then
    return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida');
  end if;

  update fila_sala_profetica
     set status = 'nao_compareceu'
   where id = p_fila_id;

  v_chamados := _preencher_vagas(v_dia);
  return jsonb_build_object('ok', true, 'chamados', v_chamados);
end;
$$;


-- Define grupos_ativos (1..50); com a sala em andamento, chama mais gente se sobrar vaga.
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


-- Finaliza a sessão do dia marcando os pendentes informados. Não repõe vagas.
create or replace function public.painel_finalizar_sala(p_concluidos uuid[], p_nao_compareceram uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Belem')::date;
  v_sessao sessoes_sala%rowtype;
begin
  if not is_staff() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  perform 1 from config_sala where id = 1 for update;

  select * into v_sessao from sessoes_sala where dia = v_dia for update;
  if not found or v_sessao.iniciada_em is null then
    return jsonb_build_object('ok', false, 'motivo', 'sala_nao_iniciada');
  end if;
  if v_sessao.finalizada_em is not null then
    return jsonb_build_object('ok', false, 'motivo', 'sala_finalizada');
  end if;

  update fila_sala_profetica
     set status = 'concluido', saiu_em = coalesce(saiu_em, now())
   where id = any(coalesce(p_concluidos, '{}'::uuid[]))
     and dia_evento = v_dia
     and status in ('chamado', 'em_atendimento', 'falha_envio');

  update fila_sala_profetica
     set status = 'nao_compareceu'
   where id = any(coalesce(p_nao_compareceram, '{}'::uuid[]))
     and dia_evento = v_dia
     and status in ('chamado', 'em_atendimento', 'falha_envio');

  update sessoes_sala
     set finalizada_em = now(), finalizada_por = auth.uid()
   where dia = v_dia;

  return jsonb_build_object('ok', true);
end;
$$;


revoke execute on function
  public.painel_estado(),
  public.painel_iniciar_sala(),
  public.painel_chamar(uuid),
  public.painel_check_in(uuid),
  public.painel_check_out(uuid),
  public.painel_nao_compareceu(uuid),
  public.painel_definir_grupos(int),
  public.painel_finalizar_sala(uuid[], uuid[])
from public, anon;

grant execute on function
  public.painel_estado(),
  public.painel_iniciar_sala(),
  public.painel_chamar(uuid),
  public.painel_check_in(uuid),
  public.painel_check_out(uuid),
  public.painel_nao_compareceu(uuid),
  public.painel_definir_grupos(int),
  public.painel_finalizar_sala(uuid[], uuid[])
to authenticated;
