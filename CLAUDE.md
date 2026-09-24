# Sala Profética — Formulário de cadastro (Link Church)

## O que é o projeto

Sistema de fila digital da **Sala Profética** nas conferências da Link Church. Substitui a ficha de papel:

1. Um QR Code exibido no culto abre **este formulário**.
2. A pessoa preenche nome, telefone (WhatsApp), e-mail e o opt-in de LGPD.
3. Ela entra na fila do dia e recebe automaticamente uma **mensagem de confirmação no WhatsApp**.
4. Depois, a equipe chama pelo painel (outro módulo, fora deste escopo) e ela recebe a mensagem "Sua vez chegou".

A conferência tem 2 dias. A fila é **por dia**: quem se inscreveu no dia 1 pode se inscrever de novo no dia 2.

Issue no Jira: **SPC-5** — "Frontend: interface de cadastro via QR Code" (bermaxculture-team.atlassian.net, projeto SPC).

## Escopo deste repositório agora

**Prioridade atual: o formulário público de cadastro (SPC-5).** O painel do coordenador (SPC-4) vem depois e **não deve ser iniciado** sem pedido explícito.

Este projeto cuida do **frontend e do backend**. O Claude Code pode e deve alterar o Supabase (migrations, funções SQL, policies, Edge Functions) quando a task pedir, seguindo as regras da seção "Como mexer no backend".

Stack: React + Vite. Cliente: `@supabase/supabase-js` v2. Backend: Supabase (projeto `dduftknfraloivxxpdbd`, região sa-east-1), acessado pelo MCP `supabase-link-church` com acesso completo ao projeto (não somente leitura).

## Estado atual do backend (já funcionando e testado ponta a ponta)

**Tabelas (`public`), todas com RLS ativo:**
- `contatos`: id, nome, telefone (único, formato `+55...`), email, aceita_comunicacao (default false), criado_em.
- `fila_sala_profetica`: id, contato_id → contatos (on delete cascade), dia_evento (date), status, chamado_em, entrou_em, saiu_em, criado_em, `ultimo_wamid` (id da última mensagem de WhatsApp enviada, usado para casar com os eventos de status do webhook), `ultimo_erro` (existe mas ainda não é preenchido; é para mostrar o motivo da falha no painel). `unique(contato_id, dia_evento)`.
  - status: `aguardando | chamado | em_atendimento | concluido | nao_compareceu | falha_envio` (check constraint). **Não existe** status `confirmado`: a confirmação é sempre enviada pelo sistema, nunca depende de a pessoa responder.
- `config_sala`: uma linha só (id = 1) com grupos_ativos, vagas_dia, tempo_limite_min (default 10).
- `staff_members`: user_id → auth.users. Base dos papéis da equipe; ainda sem policies (vai ser usada na SPC-4).

**Policies:** o público (`anon`) só lê `config_sala`. Os usuários autenticados (equipe) leem e alteram contatos, fila e config. **Não existe INSERT público direto** nas tabelas: foi removido de propósito, e o cadastro passa só pela RPC.

**Funções SQL:**
- `inscrever_na_fila(...)`: security definer, executável por `anon`. É a única entrada do formulário (contrato abaixo). O aviso do Supabase Advisor sobre ela ser pública é esperado.
- `is_staff()`: security definer, usada nas policies da equipe.
- `rls_auto_enable()`: origem desconhecida e executável pelo público. **Não mexer** sem confirmar com o Diogo.

**Disparo de WhatsApp (não quebrar):**
- Database Webhook `disparo_templates_fila` (Dashboard → Integrations → Database Webhooks) em INSERT e UPDATE de `fila_sala_profetica` chama a Edge Function `enviar-template-fila`, com o header `x-internal-secret`.
- `enviar-template-fila` (verify_jwt=false): no INSERT com `aguardando`, envia a confirmação; no UPDATE para `chamado` (vindo de outro status), envia a chamada. Sucesso grava `ultimo_wamid`; erro marca `falha_envio`. Os templates ficam no mapa `TEMPLATES` do código. Hoje os dois apontam para `sua_vez_chegou_sala_profetica` (pt_BR, parâmetro nomeado `nome`) até a Meta aprovar `boas_vindas_sala_profetica`.
- `whatsapp-webhook` (verify_jwt=false): recebe os eventos de status da Meta (sent, delivered, read, failed) e marca `falha_envio` pelo `ultimo_wamid`. Ignora mensagens recebidas (fora do escopo da v1).
- Secrets das Edge Functions (só os **nomes**, os valores nunca aparecem aqui): `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `INTERNAL_TRIGGER_SECRET`.
- O front **nunca** chama a API do WhatsApp nem as Edge Functions. O disparo acontece sozinho a partir do banco.

## Como mexer no backend

- **Mudança de schema** (tabela, coluna, policy, função, grant): sempre por migration com nome descritivo (`apply_migration`), nunca por `execute_sql` solto. Antes, leia o schema atual; não confie só neste arquivo.
- **Destrutivo** (drop de tabela, coluna ou policy, delete em massa, mudar o status check, trocar a assinatura de uma RPC que o front usa): explique o que vai fazer e **espere o ok do Diogo**.
- **Edge Functions:** antes de fazer deploy, leia o código atual com `get_edge_function` e preserve a checagem do `x-internal-secret` e da assinatura HMAC. Mantenha `verify_jwt=false` nas duas funções atuais (a Meta e o Database Webhook não mandam JWT).
- **Depois de mudar policy ou função:** teste como `anon` (e como `authenticated`, quando for o caso) dentro de `begin; set local role anon; ...; rollback;` e rode `get_advisors` (security).
- **Testar sem mandar WhatsApp:** um INSERT ou UPDATE dentro de uma transação que termina em `rollback` não dispara o webhook, porque o envio só sai depois do commit. Use isso para validar regras. Teste só com commit quando quiser a mensagem de verdade, e só com números da equipe.
- **Logs:** `query_logs` com as fontes `function_edge_logs` (HTTP) e `function_logs` (console das funções). Às vezes o backend de logs do Supabase fica fora do ar; nesse caso, peça ao Diogo para olhar no Dashboard.
- **Segredos:** nunca gere, mostre ou peça valores de token, secret, PIN ou chave no chat. Se precisar de um secret novo, diga o **nome** e peça para o Diogo gerar localmente (PowerShell `[guid]::NewGuid().ToString()`) e cadastrar em Edge Functions → Secrets.
- **WhatsApp / Meta:** o guia das armadilhas já resolvidas está com o Diogo. Resumo: WABA `1059312313752049` assinada no app via `subscribed_apps`; token permanente do system user com a WABA atribuída como ativo (sem isso aparece o erro 132001 "template does not exist", mesmo com o template aprovado); templates pertencem à WABA, não ao número.

## Regras do formulário

- O formulário usa **só** a RPC `inscrever_na_fila`. Não faça `insert`/`select` direto em `contatos` ou `fila_sala_profetica` pelo front: o RLS bloqueia, e isso é de propósito. Se precisar de outro dado público, crie uma RPC específica que devolva só o necessário.

## Variáveis de ambiente

`.env.local` (fora do git):

```
VITE_SUPABASE_URL=https://dduftknfraloivxxpdbd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=   # Supabase Dashboard → Project Settings → API Keys → publishable (ou "anon")
```

- A chave **publishable/anon** é feita para ficar no navegador. Ela é segura porque o RLS só deixa o público chamar a RPC.
- **Nunca** colocar no front: `service_role`/secret key, token do WhatsApp, App Secret da Meta ou qualquer outro segredo. Qualquer variável `VITE_*` vai parar no bundle público.
- Nunca imprimir nem pedir segredos no chat. Quem gera e cola os valores é o Diogo.

## Contrato da RPC `inscrever_na_fila`

```ts
const { data, error } = await supabase.rpc("inscrever_na_fila", {
  p_nome: string,                 // obrigatório, 2–200 caracteres
  p_telefone: string,             // obrigatório; aceita com ou sem máscara, com ou sem +55
  p_email?: string | null,        // opcional
  p_aceita_comunicacao?: boolean, // opt-in LGPD; default false
});
```

Retorno (`data`, sempre JSON):

```ts
type Resultado =
  | { ok: true; posicao: number; dia_evento: string }   // dia_evento = "YYYY-MM-DD"
  | { ok: false; motivo:
        | "nome_invalido"
        | "telefone_invalido"
        | "email_invalido"
        | "vagas_esgotadas"
        | "ja_inscrito" };
```

- `error` só vem preenchido em falha de rede ou do servidor. Regra de negócio **nunca** vira `error`, sempre vem como `{ ok: false, motivo }`.
- `posicao` é a posição da pessoa entre quem está aguardando no dia, no momento do cadastro.

O que a função já faz sozinha (não duplicar no front):
- Normaliza o telefone: tira a máscara e coloca 55 quando vier só DDD + número. Valida DDD e tamanho.
- Cria ou atualiza o contato pelo telefone. Se a pessoa já existia de outro dia, atualiza o nome e o e-mail. O opt-in só é **ligado**, nunca desligado, por esta tela.
- Confere `vagas_dia` com uma trava, para dois cadastros simultâneos não estourarem o limite.
- Bloqueia duplicidade no mesmo dia.
- Usa a data do fuso de Belém para definir o `dia_evento`.

## Telas e mensagens

Mobile-first: praticamente todo mundo vai abrir pelo celular, lendo o QR Code no culto. O Wi-Fi do local pode ser instável.

1. **Formulário**
   - Nome (obrigatório)
   - Telefone/WhatsApp com máscara `(99) 99999-9999` (obrigatório). A validação no front é só de conveniência; quem decide é a RPC.
   - E-mail (obrigatório)
   - Checkbox de LGPD **desmarcado por padrão**, com um texto como: "Aceito receber comunicações da Link Church sobre eventos futuros pelo WhatsApp ou e-mail." Sem marcar, o número e o e-mail só são usados para a Sala Profética daquele dia.
   - Link para a Política de Privacidade: `<URL da política hospedada na Vercel — preencher>`
   - Botão desabilitado enquanto envia, para evitar clique duplo.
2. **Sucesso** (`ok: true`): "Você está na fila! Posição: N." Avisar que a confirmação chega no WhatsApp e que outra mensagem avisa quando for a vez.
3. **Já inscrito** (`ja_inscrito`): "Você já está na fila de hoje com esse número." Não é erro, é um aviso amigável.
4. **Vagas encerradas** (`vagas_esgotadas`): "As inscrições para a Sala Profética de hoje foram encerradas."
5. **Erros de validação** (`nome_invalido`, `telefone_invalido`, `email_invalido`): mensagem inline no campo correspondente, mantendo o que a pessoa já digitou.
6. **Falha de rede** (`error`): "Não conseguimos enviar agora. Verifique sua conexão e tente de novo", com o botão ativo outra vez e os dados preservados.

## Testando localmente

- Hoje `config_sala.vagas_dia = 0`, então **toda chamada retorna `vagas_esgotadas`**, de propósito, até o pastor ou a intercessão definirem o limite. Para testar o sucesso, suba `vagas_dia` temporariamente e **volte para o valor anterior** depois, avisando o Diogo.
- **Cada cadastro com sucesso (com commit) envia um WhatsApp de verdade** para o número informado. Teste só com números da equipe, confirmados pelo Diogo. Nunca invente números. Para testar regras sem enviar, use a transação com `rollback` descrita em "Como mexer no backend".
- Para testar de novo com o mesmo número no mesmo dia, apague a linha de teste da fila (só as linhas criadas no teste, identificadas pelo id).

## Limitações conhecidas

- O mesmo celular digitado com e sem o 9º dígito (`91 98113-4890` e `91 8113-4890`) gera dois contatos diferentes. A mensagem chega nos dois casos. Fica para uma versão futura.
- Os templates de confirmação e de chamada estão temporariamente com o mesmo texto ("SUA VEZ CHEGOU!") até a Meta aprovar o template de confirmação. Isso é backend e não afeta o front.