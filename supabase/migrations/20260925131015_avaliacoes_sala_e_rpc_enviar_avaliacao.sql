-- SPC-12: avaliação pública da Sala Profética (tabela + RPC enviar_avaliacao)

create table public.avaliacoes_sala (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  dia_evento date not null,
  palavra text not null check (palavra in ('sim', 'nao', 'quero_contar')),
  gostou_formato text not null check (gostou_formato in ('sim', 'mais_ou_menos', 'nao')),
  testemunho text check (char_length(testemunho) <= 2000),
  autoriza_compartilhar boolean not null default false,
  nome text check (char_length(nome) <= 120),
  contato text
);

comment on table public.avaliacoes_sala is
  'Avaliações anônimas da Sala Profética (SPC-12). Gravação só pela RPC enviar_avaliacao; leitura só pela equipe (is_staff).';
comment on column public.avaliacoes_sala.dia_evento is 'Data de Belém no momento do envio.';
comment on column public.avaliacoes_sala.contato is 'Telefone normalizado (+55...), opcional.';
comment on column public.avaliacoes_sala.autoriza_compartilhar is 'Autoriza compartilhar o testemunho; sempre false quando não há testemunho.';

create index avaliacoes_sala_criado_em_idx on public.avaliacoes_sala (criado_em desc);

alter table public.avaliacoes_sala enable row level security;

create policy "staff le avaliacoes"
  on public.avaliacoes_sala for select
  to authenticated
  using (public.is_staff());

revoke all on public.avaliacoes_sala from anon, authenticated;
grant select on public.avaliacoes_sala to authenticated;

create function public.enviar_avaliacao(
  p_palavra text,
  p_gostou_formato text,
  p_testemunho text default null,
  p_autoriza_compartilhar boolean default false,
  p_nome text default null,
  p_contato text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_palavra text := nullif(btrim(coalesce(p_palavra, '')), '');
  v_formato text := nullif(btrim(coalesce(p_gostou_formato, '')), '');
  v_testemunho text := nullif(btrim(coalesce(p_testemunho, '')), '');
  v_nome text := nullif(btrim(coalesce(p_nome, '')), '');
  v_contato_raw text := nullif(btrim(coalesce(p_contato, '')), '');
  v_digitos text;
  v_contato text;
  v_recentes int;
begin
  if v_palavra is null or v_palavra not in ('sim', 'nao', 'quero_contar')
     or v_formato is null or v_formato not in ('sim', 'mais_ou_menos', 'nao') then
    return jsonb_build_object('ok', false, 'motivo', 'resposta_invalida');
  end if;

  if char_length(v_testemunho) > 2000 or char_length(v_nome) > 120 then
    return jsonb_build_object('ok', false, 'motivo', 'texto_longo');
  end if;

  -- mesma regra de telefone do inscrever_na_fila
  if v_contato_raw is not null then
    v_digitos := regexp_replace(v_contato_raw, '\D', '', 'g');
    if char_length(v_digitos) in (10, 11) then
      v_digitos := '55' || v_digitos;
    end if;
    if v_digitos !~ '^55[1-9][0-9]{9,10}$' then
      return jsonb_build_object('ok', false, 'motivo', 'contato_invalido');
    end if;
    v_contato := '+' || v_digitos;
  end if;

  -- proteção simples contra flood (evento pequeno)
  select count(*) into v_recentes
  from avaliacoes_sala where criado_em > now() - interval '10 minutes';
  if v_recentes > 500 then
    return jsonb_build_object('ok', false, 'motivo', 'resposta_invalida');
  end if;

  insert into avaliacoes_sala
    (dia_evento, palavra, gostou_formato, testemunho, autoriza_compartilhar, nome, contato)
  values (
    (now() at time zone 'America/Belem')::date,
    v_palavra, v_formato, v_testemunho,
    coalesce(p_autoriza_compartilhar, false) and v_testemunho is not null,
    v_nome, v_contato
  );

  return jsonb_build_object('ok', true);
end;
$function$;

comment on function public.enviar_avaliacao(text, text, text, boolean, text, text) is
  'Formulário público de avaliação (SPC-12). Retorna {ok:true} ou {ok:false, motivo}.';

revoke execute on function public.enviar_avaliacao(text, text, text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.enviar_avaliacao(text, text, text, boolean, text, text) to anon, authenticated;
