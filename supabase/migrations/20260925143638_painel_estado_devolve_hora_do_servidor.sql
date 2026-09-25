create or replace function public.painel_estado()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  -- "agora" do servidor: o painel corrige o relógio do aparelho com ele (cronômetros começam na hora).
  return jsonb_build_object(
    'ok', true,
    'dia', v_dia,
    'agora', clock_timestamp(),
    'papel', v_papel,
    'sessao', v_sessao,
    'config', v_config,
    'fila', v_fila);
end;
$function$;

revoke execute on function public.painel_estado() from public, anon;
grant execute on function public.painel_estado() to authenticated;
