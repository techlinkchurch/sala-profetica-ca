import { supabase } from "./supabase";

export type MotivoRecusa =
  | "nome_invalido"
  | "telefone_invalido"
  | "email_invalido"
  | "vagas_esgotadas"
  | "ja_inscrito";

export type Resultado =
  | { ok: true; posicao: number; dia_evento: string }
  | { ok: false; motivo: MotivoRecusa };

export type DadosInscricao = {
  nome: string;
  telefone: string;
  email: string;
  aceitaComunicacao: boolean;
};

// Wi-Fi do local é instável: sem timeout, o botão ficaria preso em "Enviando" indefinidamente.
const TIMEOUT_MS = 15_000;

export async function inscreverNaFila(dados: DadosInscricao): Promise<Resultado | null> {
  const email = dados.email.trim();
  const { data, error } = await supabase
    .rpc("inscrever_na_fila", {
      p_nome: dados.nome.trim(),
      p_telefone: dados.telefone,
      p_email: email === "" ? null : email,
      p_aceita_comunicacao: dados.aceitaComunicacao,
    })
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS));

  if (error || !data) return null;
  return data as Resultado;
}
