import { supabase } from "./supabase";

export type ErroDeCampo = "nome_invalido" | "telefone_invalido" | "email_invalido";

export type Recusa =
  | { ok: false; motivo: ErroDeCampo }
  | { ok: false; motivo: "ja_inscrito" }
  | { ok: false; motivo: "ja_participou"; dia_inscrito: string }
  | { ok: false; motivo: "ainda_nao_abriu"; abre_as: string }
  | {
      ok: false;
      motivo: "vagas_esgotadas" | "fora_do_periodo";
      proximo_dia: string | null;
      proximo_abre_as: string | null;
    };

export type MotivoRecusa = Recusa["motivo"];

export type Resultado = { ok: true; posicao: number; dia_evento: string } | Recusa;

export type DadosInscricao = {
  nome: string;
  telefone: string;
  email: string;
  aceitaComunicacao: boolean;
};

// Wi-Fi do local é instável: sem timeout, o botão ficaria preso em "Enviando" indefinidamente.
const TIMEOUT_MS = 15_000;

export async function inscreverNaFila(dados: DadosInscricao): Promise<Resultado | null> {
  const { data, error } = await supabase
    .rpc("inscrever_na_fila", {
      p_nome: dados.nome.trim(),
      p_telefone: dados.telefone,
      p_email: dados.email.trim(),
      p_aceita_comunicacao: dados.aceitaComunicacao,
    })
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS));

  if (error || !data) return null;
  return data as Resultado;
}
