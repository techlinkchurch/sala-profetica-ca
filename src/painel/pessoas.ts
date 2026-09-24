import { mascararTelefone } from "../lib/telefone";
import type { BadgeTone } from "../design-system";
import type { EstadoPainel, PessoaFila, StatusFila } from "./contrato";

export const ROTULO_STATUS: Record<StatusFila, string> = {
  aguardando: "Aguardando",
  chamado: "Chamado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  nao_compareceu: "Não compareceu",
  falha_envio: "Falha de envio",
};

export const TOM_STATUS: Record<StatusFila, BadgeTone> = {
  aguardando: "info",
  chamado: "wait",
  em_atendimento: "neutral",
  concluido: "go",
  nao_compareceu: "muted",
  falha_envio: "stop",
};

export type SituacaoSala = "nao_iniciada" | "em_andamento" | "finalizada";

export function situacaoSala(estado: EstadoPainel): SituacaoSala {
  if (!estado.sessao?.iniciada_em) return "nao_iniciada";
  return estado.sessao.finalizada_em ? "finalizada" : "em_andamento";
}

export function formatarTelefone(telefone: string): string {
  return mascararTelefone(telefone) || telefone;
}

export function formatarHora(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Belem" });
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Busca por e-mail (principal: a pessoa mostra o ingresso com o e-mail), nome ou telefone. */
export function combinaBusca(pessoa: PessoaFila, busca: string): boolean {
  const termo = normalizar(busca);
  if (!termo) return true;
  if (normalizar(pessoa.email ?? "").includes(termo)) return true;
  if (normalizar(pessoa.nome).includes(termo)) return true;
  const digitos = termo.replace(/\D/g, "");
  if (digitos.length >= 3 && /^[\d\s()+-]+$/.test(termo)) {
    return pessoa.telefone.replace(/\D/g, "").includes(digitos);
  }
  return false;
}

const tempo = (iso: string | null) => (iso ? Date.parse(iso) : 0);

export type Grupos = Record<StatusFila, PessoaFila[]>;

export function agrupar(fila: PessoaFila[]): Grupos {
  const g: Grupos = {
    aguardando: [],
    chamado: [],
    em_atendimento: [],
    concluido: [],
    nao_compareceu: [],
    falha_envio: [],
  };
  for (const p of fila) g[p.status]?.push(p);
  g.aguardando.sort((a, b) => (a.posicao ?? Infinity) - (b.posicao ?? Infinity) || tempo(a.criado_em) - tempo(b.criado_em));
  // Quem foi chamado há mais tempo aparece primeiro: é quem está mais perto do prazo.
  g.chamado.sort((a, b) => tempo(a.chamado_em) - tempo(b.chamado_em));
  g.falha_envio.sort((a, b) => tempo(a.chamado_em) - tempo(b.chamado_em));
  g.em_atendimento.sort((a, b) => tempo(a.entrou_em) - tempo(b.entrou_em));
  g.concluido.sort((a, b) => tempo(b.saiu_em) - tempo(a.saiu_em));
  g.nao_compareceu.sort((a, b) => tempo(b.chamado_em) - tempo(a.chamado_em));
  return g;
}

export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}
