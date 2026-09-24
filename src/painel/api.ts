import { RPC, type EstadoPainel, type MotivoPainel, type Recusa } from "./contrato";
import { supabasePainel } from "./supabasePainel";

// Wi-Fi do local é instável: sem timeout, um botão poderia ficar preso em "aguarde" para sempre.
const TIMEOUT_MS = 15_000;

/** null = falha de rede/servidor (nada foi decidido pelo banco). */
async function chamar<T>(nome: string, params?: Record<string, unknown>): Promise<T | null> {
  try {
    const { data, error } = await supabasePainel.rpc(nome, params).abortSignal(AbortSignal.timeout(TIMEOUT_MS));
    if (error || !data || typeof data !== "object") return null;
    return data as T;
  } catch {
    return null;
  }
}

export type ResultadoAcao = { ok: true; chamados?: number } | Recusa;

export const api = {
  estado: () => chamar<EstadoPainel | Recusa>(RPC.estado),
  iniciar: () => chamar<ResultadoAcao>(RPC.iniciar),
  checkIn: (filaId: string) => chamar<ResultadoAcao>(RPC.checkIn, { p_fila_id: filaId }),
  checkOut: (filaId: string) => chamar<ResultadoAcao>(RPC.checkOut, { p_fila_id: filaId }),
  naoCompareceu: (filaId: string) => chamar<ResultadoAcao>(RPC.naoCompareceu, { p_fila_id: filaId }),
  definirGrupos: (grupos: number) => chamar<ResultadoAcao>(RPC.definirGrupos, { p_grupos: grupos }),
  finalizar: (concluidos: string[], naoCompareceram: string[]) =>
    chamar<ResultadoAcao>(RPC.finalizar, { p_concluidos: concluidos, p_nao_compareceram: naoCompareceram }),
};

export const MENSAGEM_MOTIVO: Record<MotivoPainel, string> = {
  nao_autorizado: "Sua conta não tem permissão para esta ação.",
  transicao_invalida: "Essa pessoa já mudou de situação. A lista foi atualizada.",
  nao_encontrado: "Não encontramos essa inscrição na fila de hoje. A lista foi atualizada.",
  sala_nao_iniciada: "A sala ainda não foi iniciada.",
  sala_ja_iniciada: "A sala já tinha sido iniciada. A lista foi atualizada.",
  sala_finalizada: "A sala de hoje já foi finalizada.",
  valor_invalido: "Valor inválido. Use um número de 1 a 50.",
};

export const MENSAGEM_REDE = "Não conseguimos falar com o servidor. Verifique a conexão e tente de novo.";

export function mensagemMotivo(motivo: string): string {
  return MENSAGEM_MOTIVO[motivo as MotivoPainel] ?? "Não foi possível concluir a ação. A lista foi atualizada.";
}
