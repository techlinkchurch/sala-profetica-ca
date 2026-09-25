import { supabase } from "./supabase";

// Contrato com a RPC enviar_avaliacao (security definer, executável por anon).
export type Palavra = "sim" | "nao" | "quero_contar";
export type Formato = "sim" | "mais_ou_menos" | "nao";

export type DadosAvaliacao = {
  palavra: Palavra;
  formato: Formato;
  testemunho: string;
  autorizaCompartilhar: boolean;
  nome: string;
  contato: string;
};

export type ResultadoAvaliacao =
  | { ok: true }
  | { ok: false; motivo: "resposta_invalida" | "texto_longo" | "contato_invalido" };

export const LIMITE_TESTEMUNHO = 2000;

const TIMEOUT_MS = 15_000;

function vazioParaNull(v: string) {
  const t = v.trim();
  return t === "" ? null : t;
}

export async function enviarAvaliacao(d: DadosAvaliacao): Promise<ResultadoAvaliacao | null> {
  const { data, error } = await supabase
    .rpc("enviar_avaliacao", {
      p_palavra: d.palavra,
      p_gostou_formato: d.formato,
      p_testemunho: vazioParaNull(d.testemunho),
      p_autoriza_compartilhar: d.autorizaCompartilhar,
      p_nome: vazioParaNull(d.nome),
      p_contato: vazioParaNull(d.contato),
    })
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS));

  if (error || !data) return null;
  return data as ResultadoAvaliacao;
}
