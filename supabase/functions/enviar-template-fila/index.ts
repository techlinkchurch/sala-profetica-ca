import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Segredos configurados via secrets da Edge Function (sem valor padrão de propósito).
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
// Segredo compartilhado configurado no cabeçalho HTTP customizado do Database Webhook —
// evita que qualquer pessoa na internet chame este endpoint e dispare mensagens à vontade.
const INTERNAL_TRIGGER_SECRET = Deno.env.get("INTERNAL_TRIGGER_SECRET") ?? "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const GRAPH_API_VERSION = "v26.0";

// Confirmação de cadastro ligada: a Meta aprovou o template boas_vindas_sala_profetica.
const CONFIRMACAO_ATIVA = true;

const TEMPLATES: Record<string, { name: string; language: string }> = {
  confirmacao: { name: "boas_vindas_sala_profetica", language: "pt_BR" },
  chamada: { name: "sua_vez_chegou_sala_profetica", language: "pt_BR" },
};

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

interface FilaRow {
  id: string;
  status: string;
  contato_id: string;
  contatos: { nome: string; telefone: string } | null;
}

// Formato padrão de payload de um Database Webhook do Supabase.
interface DatabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: { id: string; status: string } | null;
  old_record: { id: string; status: string } | null;
}

// Falha na chamada: vira falha_envio (o painel destaca e a vaga não fica travada).
// Falha na confirmação: a pessoa continua aguardando na fila; só o erro fica registrado.
async function marcarFalhaEnvio(filaId: string, motivo: string, tipo: "confirmacao" | "chamada") {
  console.error("falha ao enviar template", { filaId, tipo, motivo });
  const ultimo_erro = `${tipo === "confirmacao" ? "Confirmação" : "Chamada"}: ${motivo}`.slice(0, 500);
  const query =
    tipo === "chamada"
      ? supabase.from("fila_sala_profetica").update({ status: "falha_envio", ultimo_erro }).eq("id", filaId).eq("status", "chamado")
      : supabase.from("fila_sala_profetica").update({ ultimo_erro }).eq("id", filaId);
  const { error } = await query;
  if (error) console.error("erro ao registrar falha de envio", error);
}

async function enviarTemplate(filaId: string, tipo: "confirmacao" | "chamada") {
  const { data: fila, error: filaError } = await supabase
    .from("fila_sala_profetica")
    .select("id, status, contato_id, contatos ( nome, telefone )")
    .eq("id", filaId)
    .maybeSingle<FilaRow>();

  if (filaError || !fila || !fila.contatos) {
    console.error("linha da fila nao encontrada", filaError);
    return;
  }

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    await marcarFalhaEnvio(filaId, "credenciais do WhatsApp nao configuradas", tipo);
    return;
  }

  const template = TEMPLATES[tipo];
  const telefone = toE164(fila.contatos.telefone);

  const graphPayload = {
    messaging_product: "whatsapp",
    to: telefone,
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", parameter_name: "nome", text: fila.contatos.nome },
          ],
        },
      ],
    },
  };

  const resp = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(graphPayload),
    },
  );

  const respBody = await resp.json();

  if (!resp.ok) {
    const erro = respBody?.error;
    const detalhe = erro
      ? `${erro.message ?? "erro da Meta"}${erro.code ? ` (${erro.code})` : ""}${erro.error_data?.details ? ` — ${erro.error_data.details}` : ""}`
      : JSON.stringify(respBody);
    await marcarFalhaEnvio(filaId, detalhe, tipo);
    return;
  }

  const wamid: string | undefined = respBody?.messages?.[0]?.id;
  const { error: updateError } = await supabase
    .from("fila_sala_profetica")
    .update({ ultimo_wamid: wamid ?? null, ultimo_erro: null })
    .eq("id", filaId);

  if (updateError) {
    console.error("erro ao salvar ultimo_wamid", updateError);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const sharedSecret = req.headers.get("x-internal-secret");
  if (!INTERNAL_TRIGGER_SECRET || sharedSecret !== INTERNAL_TRIGGER_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  let payload: DatabaseWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const record = payload.record;
  if (!record?.id || !record?.status) {
    return new Response("Bad Request: payload sem record valido", { status: 400 });
  }

  // INSERT com status inicial 'aguardando' -> confirmacao de cadastro
  if (payload.type === "INSERT" && record.status === "aguardando") {
    if (CONFIRMACAO_ATIVA) {
      await enviarTemplate(record.id, "confirmacao");
    } else {
      console.log("confirmacao desativada, envio ignorado", { filaId: record.id });
    }
  }

  // UPDATE que mudou o status para 'chamado' -> chamada de vez
  if (
    payload.type === "UPDATE" &&
    record.status === "chamado" &&
    payload.old_record?.status !== "chamado"
  ) {
    await enviarTemplate(record.id, "chamada");
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
