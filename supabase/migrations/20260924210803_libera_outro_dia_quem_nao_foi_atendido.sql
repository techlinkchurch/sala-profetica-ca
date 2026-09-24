comment on table public.dias_sala_profetica is
  'Dias da conferência atual em que a Sala Profética aceita inscrições. abre_as é no horário de Belém. Quem foi atendido (concluido ou em_atendimento) em outro dia real desta tabela não pode se inscrever de novo; quem não foi atendido pode.';

create or replace function public.inscrever_na_fila(
  p_nome text,
  p_telefone text,
  p_email text default null,
  p_aceita_comunicacao boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_nome text := regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_digitos text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_telefone text;
  v_agora timestamp := now() at time zone 'America/Belem';
  v_dia date := (now() at time zone 'America/Belem')::date;
  v_abre_as time;
  v_eh_teste boolean;
  v_prox_dia date;
  v_prox_abre_as time;
  v_vagas int;
  v_inscritos int;
  v_contato_id uuid;
  v_dia_anterior date;
  v_fila_id uuid;
  v_posicao int;
begin
  -- nome e sobrenome: pelo menos duas palavras com 2+ letras
  if char_length(v_nome) > 200 or (
    select count(*) from regexp_split_to_table(v_nome, ' ') as w
    where char_length(regexp_replace(w, '[^[:alpha:]]', '', 'g')) >= 2
  ) < 2 then
    return jsonb_build_object('ok', false, 'motivo', 'nome_invalido');
  end if;

  -- aceita DDD+número (10 ou 11 dígitos) ou já com 55 na frente (12 ou 13)
  if char_length(v_digitos) in (10, 11) then
    v_digitos := '55' || v_digitos;
  end if;
  if v_digitos !~ '^55[1-9][0-9]{9,10}$' then
    return jsonb_build_object('ok', false, 'motivo', 'telefone_invalido');
  end if;
  v_telefone := '+' || v_digitos;

  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'motivo', 'email_invalido');
  end if;

  -- trava a linha de config para serializar cadastros e não estourar vagas_dia
  select vagas_dia into v_vagas from config_sala where id = 1 for update;

  select dia, abre_as into v_prox_dia, v_prox_abre_as
  from dias_sala_profetica where dia > v_dia order by dia limit 1;

  select abre_as, eh_teste into v_abre_as, v_eh_teste from dias_sala_profetica where dia = v_dia;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'fora_do_periodo',
      'proximo_dia', v_prox_dia, 'proximo_abre_as', to_char(v_prox_abre_as, 'HH24:MI'));
  end if;

  if v_agora::time < v_abre_as then
    return jsonb_build_object('ok', false, 'motivo', 'ainda_nao_abriu',
      'abre_as', to_char(v_abre_as, 'HH24:MI'));
  end if;

  select id into v_contato_id from contatos where telefone = v_telefone;
  if v_contato_id is not null then
    if exists (select 1 from fila_sala_profetica where contato_id = v_contato_id and dia_evento = v_dia) then
      return jsonb_build_object('ok', false, 'motivo', 'ja_inscrito');
    end if;

    -- uma participação por conferência: só quem foi atendido em outro dia real fica bloqueado.
    -- em_atendimento conta como atendido (check-out esquecido). Dias de teste não contam.
    if not v_eh_teste then
      select f.dia_evento into v_dia_anterior
      from fila_sala_profetica f
      join dias_sala_profetica d on d.dia = f.dia_evento and not d.eh_teste
      where f.contato_id = v_contato_id and f.dia_evento <> v_dia
        and f.status in ('concluido', 'em_atendimento')
      order by f.dia_evento limit 1;
      if v_dia_anterior is not null then
        return jsonb_build_object('ok', false, 'motivo', 'ja_participou', 'dia_inscrito', v_dia_anterior);
      end if;
    end if;
  end if;

  select count(*) into v_inscritos from fila_sala_profetica where dia_evento = v_dia;
  if v_vagas is null or v_inscritos >= v_vagas then
    return jsonb_build_object('ok', false, 'motivo', 'vagas_esgotadas',
      'proximo_dia', v_prox_dia, 'proximo_abre_as', to_char(v_prox_abre_as, 'HH24:MI'));
  end if;

  -- contato: cria ou atualiza pelo telefone; opt-in só pode ser ligado aqui, nunca desligado
  insert into contatos (nome, telefone, email, aceita_comunicacao)
  values (v_nome, v_telefone, v_email, coalesce(p_aceita_comunicacao, false))
  on conflict (telefone) do update
    set nome = excluded.nome,
        email = excluded.email,
        aceita_comunicacao = contatos.aceita_comunicacao or excluded.aceita_comunicacao
  returning id into v_contato_id;

  -- o INSERT dispara o Database Webhook -> template de confirmação
  insert into fila_sala_profetica (contato_id, dia_evento, status)
  values (v_contato_id, v_dia, 'aguardando')
  returning id into v_fila_id;

  select count(*) into v_posicao
  from fila_sala_profetica
  where dia_evento = v_dia and status = 'aguardando'
    and criado_em <= (select criado_em from fila_sala_profetica where id = v_fila_id);

  return jsonb_build_object('ok', true, 'posicao', v_posicao, 'dia_evento', v_dia);
end;
$function$;
