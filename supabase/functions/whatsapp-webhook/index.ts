import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Segredos configurados via `supabase secrets set` (não têm valor padrão de propósito).
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";

// Injetados automaticamente pelo runtime das Edge Functions.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  if (!APP_SECRET) return false;

  const signatureHeader = req.headers.get("x-hub-signature-256");
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expectedHex = signatureHeader.slice("sha256=".length);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

// Trata eventos de STATUS de mensagens enviadas pela igreja (sent/delivered/read/failed).
// Só a falha importa para a fila:
// - chamada que falhou (linha em "chamado"): vira falha_envio, para o painel destacar e a vaga não travar;
// - confirmação que falhou (linha ainda "aguardando"): a pessoa continua na fila, só o erro é registrado.
// deno-lint-ignore no-explicit-any
async function handleStatus(status: any) {
  const wamid: string | undefined = status?.id;
  const statusValue: string | undefined = status?.status;
  if (!wamid || !statusValue) return;

  if (statusValue !== "failed") {
    // sent / delivered / read: apenas informativo por enquanto, nada a atualizar na fila.
    return;
  }

  const erro = status?.errors?.[0];
  console.error("falha no envio de template", { wamid, erro });
  const detalhe = erro
    ? `${erro.title ?? erro.message ?? "falha na entrega"}${erro.code ? ` (${erro.code})` : ""}`
    : "falha na entrega";

  const { error: erroChamada } = await supabase
    .from("fila_sala_profetica")
    .update({ status: "falha_envio", ultimo_erro: `Chamada: ${detalhe}`.slice(0, 500) })
    .eq("ultimo_wamid", wamid)
    .eq("status", "chamado");
  if (erroChamada) console.error("erro ao marcar falha_envio na fila", erroChamada);

  const { error: erroConfirmacao } = await supabase
    .from("fila_sala_profetica")
    .update({ ultimo_erro: `Confirmação: ${detalhe}`.slice(0, 500) })
    .eq("ultimo_wamid", wamid)
    .eq("status", "aguardando");
  if (erroConfirmacao) console.error("erro ao registrar falha da confirmação", erroConfirmacao);
}

// deno-lint-ignore no-explicit-any
async function handleWebhookPayload(payload: any) {
  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      const statuses = change?.value?.statuses ?? [];
      for (const status of statuses) {
        await handleStatus(status);
      }
      // mensagens recebidas do usuário (change.value.messages) são ignoradas de propósito:
      // fora de escopo da v1 conforme o PRD ("caixa de entrada" é backlog futuro).
    }
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Verificação do webhook: a Meta chama isso uma vez ao configurar a URL no painel.
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // Confirma que a requisição realmente veio da Meta (assinatura HMAC do payload),
  // evitando que qualquer pessoa na internet chame esse endpoint e altere status na fila.
  const validSignature = await verifySignature(req, rawBody);
  if (!validSignature) {
    console.error("assinatura inválida no webhook do whatsapp");
    return new Response("Forbidden", { status: 403 });
  }

  // deno-lint-ignore no-explicit-any
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    await handleWebhookPayload(payload);
  } catch (err) {
    // Nunca deixa um erro interno travar a resposta — a Meta espera 200 rápido.
    console.error("erro ao processar webhook do whatsapp", err);
  }

  return new Response("OK", { status: 200 });
});
