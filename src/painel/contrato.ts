// Contrato entre o painel (front) e as RPCs do Supabase (backend). Toda regra fica no banco:
// o front só chama estas RPCs e nunca faz INSERT/UPDATE/DELETE direto nas tabelas.

export type StatusFila =
  | "aguardando"
  | "chamado"
  | "em_atendimento"
  | "concluido"
  | "nao_compareceu"
  | "falha_envio";

export type Papel = "coordenador" | "admin";

export type PessoaFila = {
  id: string; // fila_sala_profetica.id
  nome: string;
  email: string | null;
  telefone: string; // "+55..."
  status: StatusFila;
  posicao: number | null; // só para "aguardando": 1 = próximo a ser chamado
  criado_em: string; // ISO
  chamado_em: string | null;
  entrou_em: string | null;
  saiu_em: string | null;
  ultimo_erro: string | null;
};

export type SessaoSala = {
  iniciada_em: string | null;
  finalizada_em: string | null;
};

export type ConfigSala = {
  grupos_ativos: number;
  vagas_dia: number;
  tempo_limite_min: number;
};

export type EstadoPainel = {
  ok: true;
  dia: string; // "YYYY-MM-DD", hoje no fuso de Belém
  papel: Papel;
  sessao: SessaoSala | null; // null = sala ainda não iniciada hoje
  config: ConfigSala;
  fila: PessoaFila[]; // todas as linhas do dia, ordenadas por criado_em
};

export type MotivoPainel =
  | "nao_autorizado" // não logado ou não está em staff_members
  | "transicao_invalida" // status atual não permite a ação (ex.: check-in de quem está aguardando)
  | "nao_encontrado" // fila_id não existe ou não é de hoje
  | "sala_nao_iniciada"
  | "sala_ja_iniciada"
  | "sala_finalizada"
  | "valor_invalido"; // ex.: grupos_ativos < 1

export type Recusa = { ok: false; motivo: MotivoPainel };
export type Ok = { ok: true };

/**
 * RPCs (todas: security definer, só `authenticated` executa, e a primeira coisa que fazem é checar is_staff()).
 *
 * painel_estado()                                   -> EstadoPainel | Recusa
 * painel_iniciar_sala()                             -> (Ok & { chamados: number }) | Recusa
 *     cria a sessão do dia e chama em lote: vagas livres = grupos_ativos - count(chamado + em_atendimento)
 * (Pelo PRD não existe chamada manual/fora de ordem: só o lote inicial e a reposição automática por vaga.)
 * painel_check_in(p_fila_id uuid)                   -> Ok | Recusa
 *     chamado|falha_envio -> em_atendimento (entrou_em = now())
 * painel_check_out(p_fila_id uuid)                  -> (Ok & { chamados: number }) | Recusa
 *     em_atendimento -> concluido (saiu_em = now()); depois repõe as vagas se a sala estiver em andamento
 * painel_nao_compareceu(p_fila_id uuid)             -> (Ok & { chamados: number }) | Recusa
 *     chamado|falha_envio -> nao_compareceu; depois repõe as vagas se a sala estiver em andamento
 * painel_definir_grupos(p_grupos int)               -> (Ok & { chamados: number }) | Recusa
 *     SÓ ADMIN (PRD: configs são do admin; coordenador recebe nao_autorizado).
 *     1..50; se aumentar com a sala em andamento, chama mais gente
 * painel_finalizar_sala(p_concluidos uuid[], p_nao_compareceram uuid[]) -> Ok | Recusa
 *     marca os ids informados (só de chamado|em_atendimento|falha_envio de hoje) e encerra a sessão.
 *     "Ignorar" = arrays vazios. Depois de finalizada, nenhuma reposição automática acontece.
 *
 * Mudar para "chamado" dispara sozinho o WhatsApp de chamada (Database Webhook -> enviar-template-fila).
 */
export const RPC = {
  estado: "painel_estado",
  iniciar: "painel_iniciar_sala",
  checkIn: "painel_check_in",
  checkOut: "painel_check_out",
  naoCompareceu: "painel_nao_compareceu",
  definirGrupos: "painel_definir_grupos",
  finalizar: "painel_finalizar_sala",
} as const;
