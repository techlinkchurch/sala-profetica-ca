import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Button,
  Collapsible,
  CounterGrid,
  CounterTile,
  ElapsedTimer,
  Modal,
  PageShell,
  QueueCard,
  SearchField,
  StatusBadge,
  Stepper,
  timerTone,
} from "../design-system";
import { formatarDia } from "../lib/datas";
import { api, MENSAGEM_REDE, mensagemMotivo, type ResultadoAcao } from "./api";
import type { EstadoPainel, PessoaFila } from "./contrato";
import { ModalFinalizar } from "./ModalFinalizar";
import {
  agrupar,
  combinaBusca,
  formatarHora,
  formatarTelefone,
  plural,
  situacaoSala,
  type SituacaoSala,
} from "./pessoas";
import { useAgora, type Conexao } from "./useEstadoPainel";

type Props = {
  estado: EstadoPainel;
  conexao: Conexao;
  atualizadoEm: number | null;
  atualizar: () => Promise<void>;
  email: string;
  onSair: () => Promise<void>;
};

type Aviso = { tom: "success" | "danger"; texto: string; id: number };
type Confirmacao = { tipo: "iniciar" } | { tipo: "nao_compareceu"; pessoa: PessoaFila } | null;

const SITUACAO: Record<SituacaoSala, { rotulo: string; tom: "muted" | "go" | "neutral" }> = {
  nao_iniciada: { rotulo: "Sala não iniciada", tom: "muted" },
  em_andamento: { rotulo: "Sala em andamento", tom: "go" },
  finalizada: { rotulo: "Sala finalizada", tom: "neutral" },
};

const SALA = "sala"; // chave de "pendente" das ações da sala inteira

export function TelaPainel({ estado, conexao, atualizadoEm, atualizar, email, onSair }: Props) {
  const agora = useAgora();
  const [busca, setBusca] = useState("");
  const [pendentes, setPendentes] = useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [gruposRascunho, setGruposRascunho] = useState<number | null>(null);
  const [saindo, setSaindo] = useState(false);

  const { config, papel } = estado;
  const situacao = situacaoSala(estado);
  const grupos = useMemo(() => agrupar(estado.fila), [estado.fila]);
  const filtrados = useMemo(
    () => agrupar(busca.trim() ? estado.fila.filter((p) => combinaBusca(p, busca)) : estado.fila),
    [estado.fila, busca],
  );
  const buscando = busca.trim().length > 0;
  const totalEncontrado = buscando ? estado.fila.filter((p) => combinaBusca(p, busca)).length : 0;
  const amareloMin = Math.min(5, config.tempo_limite_min);

  // Avisos de sucesso somem sozinhos; erros ficam até a pessoa fechar ou fazer outra ação.
  useEffect(() => {
    if (aviso?.tom !== "success") return;
    const t = window.setTimeout(() => setAviso(null), 5000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  // Se outro admin mudou os grupos e eu não estava editando, o rascunho não pode ficar velho.
  useEffect(() => {
    if (gruposRascunho === config.grupos_ativos) setGruposRascunho(null);
  }, [config.grupos_ativos, gruposRascunho]);

  function avisar(tom: Aviso["tom"], texto: string) {
    setAviso({ tom, texto, id: Date.now() });
  }

  async function executar(
    chave: string,
    acao: () => Promise<ResultadoAcao | null>,
    sucesso: (r: { chamados?: number }) => string,
  ): Promise<boolean> {
    if (pendentes.has(chave)) return false;
    setPendentes((a) => new Set(a).add(chave));
    setAviso(null);
    const r = await acao();
    setPendentes((a) => {
      const n = new Set(a);
      n.delete(chave);
      return n;
    });
    if (!r) avisar("danger", MENSAGEM_REDE);
    else if (!r.ok) avisar("danger", mensagemMotivo(r.motivo));
    else avisar("success", sucesso(r));
    await atualizar();
    return !!r?.ok;
  }

  const chamadosTexto = (n?: number) =>
    n ? ` ${n === 1 ? "1 pessoa foi chamada" : `${n} pessoas foram chamadas`} pelo WhatsApp.` : "";

  const primeiroNome = (p: PessoaFila) => p.nome.trim().split(/\s+/)[0] ?? p.nome;

  function checkIn(p: PessoaFila) {
    void executar(p.id, () => api.checkIn(p.id), () => `Check-in de ${primeiroNome(p)} feito.`);
  }

  function checkOut(p: PessoaFila) {
    void executar(
      p.id,
      () => api.checkOut(p.id),
      (r) => `Check-out de ${primeiroNome(p)} feito.${chamadosTexto(r.chamados)}`,
    );
  }

  async function confirmar() {
    if (!confirmacao) return;
    if (confirmacao.tipo === "iniciar") {
      await executar(SALA, api.iniciar, (r) =>
        r.chamados ? `Sala iniciada.${chamadosTexto(r.chamados)}` : "Sala iniciada. Ninguém na fila para chamar ainda.",
      );
      setConfirmacao(null);
      return;
    }
    const p = confirmacao.pessoa;
    await executar(
      p.id,
      () => api.naoCompareceu(p.id),
      (r) => `${primeiroNome(p)} marcado(a) como não compareceu.${chamadosTexto(r.chamados)}`,
    );
    setConfirmacao(null);
  }

  async function finalizar(concluidos: string[], naoCompareceram: string[]) {
    const ok = await executar(
      SALA,
      () => api.finalizar(concluidos, naoCompareceram),
      () => "Sala finalizada. Ninguém mais será chamado hoje.",
    );
    if (ok) setFinalizando(false);
  }

  async function salvarGrupos() {
    if (gruposRascunho === null) return;
    const ok = await executar(
      "grupos",
      () => api.definirGrupos(gruposRascunho),
      (r) => `Grupos ativos: ${gruposRascunho}.${chamadosTexto(r.chamados)}`,
    );
    if (ok) setGruposRascunho(null);
  }

  const salaOcupada = pendentes.has(SALA);
  const pendentesFinalizar = [...grupos.chamado, ...grupos.falha_envio, ...grupos.em_atendimento];
  const gruposExibidos = gruposRascunho ?? config.grupos_ativos;
  const gruposMudou = gruposRascunho !== null && gruposRascunho !== config.grupos_ativos;
  const vagasLivres = Math.max(0, config.grupos_ativos - grupos.chamado.length - grupos.em_atendimento.length);

  function contato(p: PessoaFila, extra?: string) {
    return (
      <>
        {formatarTelefone(p.telefone)}
        {extra ? ` · ${extra}` : ""}
      </>
    );
  }

  const acoesChamado = (p: PessoaFila) => {
    const ocupado = pendentes.has(p.id);
    return (
      <>
        <Button size="sm" disabled={ocupado} onClick={() => checkIn(p)}>
          {ocupado ? "Aguarde…" : "Check-in"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={ocupado}
          onClick={() => setConfirmacao({ tipo: "nao_compareceu", pessoa: p })}
        >
          Não compareceu
        </Button>
      </>
    );
  };

  return (
    <PageShell width="wide">
      <header className="painel-topo">
        <div className="painel-marca">
          <p className="painel-marca-evento">Céus Abertos 26’ · Link Church</p>
          <h1 className="painel-marca-titulo">
            <span>Sala</span> <strong>Profética</strong>
          </h1>
          <p className="painel-marca-dia">{formatarDia(estado.dia)}</p>
        </div>
        <div className="painel-sessao">
          <IndicadorConexao conexao={conexao} atualizadoEm={atualizadoEm} agora={agora} />
          <span className="painel-sessao-email" title={email}>
            {email}
            {papel === "admin" ? " · admin" : ""}
          </span>
          <Button
            size="sm"
            variant="light"
            disabled={saindo}
            onClick={async () => {
              setSaindo(true);
              await onSair();
            }}
          >
            {saindo ? "Saindo…" : "Sair"}
          </Button>
        </div>
      </header>

      <section className="painel-controle" aria-label="Controle da sala">
        <div className="painel-controle-linha">
          <div className="painel-controle-status">
            <StatusBadge tone={SITUACAO[situacao].tom}>{SITUACAO[situacao].rotulo}</StatusBadge>
            <span className="painel-controle-detalhe">
              {situacao === "em_andamento" && `Desde ${formatarHora(estado.sessao?.iniciada_em ?? null)}`}
              {situacao === "finalizada" && `Às ${formatarHora(estado.sessao?.finalizada_em ?? null)}`}
              {situacao === "nao_iniciada" &&
                `Ao iniciar, até ${plural(config.grupos_ativos, "pessoa é chamada", "pessoas são chamadas")}.`}
            </span>
          </div>
          <div className="painel-controle-acoes">
            {situacao === "nao_iniciada" && (
              <Button size="sm" disabled={salaOcupada} onClick={() => setConfirmacao({ tipo: "iniciar" })}>
                Iniciar sala
              </Button>
            )}
            {situacao === "em_andamento" && (
              <Button size="sm" variant="danger" disabled={salaOcupada} onClick={() => setFinalizando(true)}>
                Finalizar sala
              </Button>
            )}
          </div>
        </div>

        <div className="painel-controle-config">
          {papel === "admin" ? (
            <div className="painel-grupos">
              <Stepper
                label="Grupos ativos"
                value={gruposExibidos}
                min={1}
                max={50}
                disabled={pendentes.has("grupos")}
                onChange={setGruposRascunho}
              />
              {gruposMudou && (
                <div className="painel-grupos-salvar">
                  <p>
                    {gruposRascunho! > config.grupos_ativos && situacao === "em_andamento"
                      ? "Ao salvar, mais pessoas são chamadas pelo WhatsApp na hora."
                      : "Vale para as próximas chamadas."}
                  </p>
                  <div className="painel-grupos-botoes">
                    <Button size="sm" disabled={pendentes.has("grupos")} onClick={() => void salvarGrupos()}>
                      {pendentes.has("grupos") ? "Salvando…" : "Salvar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pendentes.has("grupos")}
                      onClick={() => setGruposRascunho(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="painel-grupos-leitura">
              <span>Grupos ativos</span>
              <strong>{config.grupos_ativos}</strong>
            </p>
          )}
          <p className="painel-grupos-leitura">
            <span>Vagas livres agora</span>
            <strong>{situacao === "em_andamento" ? vagasLivres : "—"}</strong>
          </p>
          <p className="painel-grupos-leitura">
            <span>Prazo para chegar</span>
            <strong>{config.tempo_limite_min} min</strong>
          </p>
        </div>

        <CounterGrid label="Resumo da fila de hoje">
          <CounterTile label="Aguardando" value={grupos.aguardando.length} tone="info" />
          <CounterTile label="Chamados" value={grupos.chamado.length} tone="wait" />
          <CounterTile label="Em atendimento" value={grupos.em_atendimento.length} tone="teal" />
          <CounterTile label="Concluídos" value={grupos.concluido.length} tone="go" />
          <CounterTile label="Não compareceram" value={grupos.nao_compareceu.length} tone="muted" />
          <CounterTile
            label="Falha de envio"
            value={grupos.falha_envio.length}
            tone="stop"
            emphasis={grupos.falha_envio.length > 0}
          />
          <CounterTile label="Inscritos" value={estado.fila.length} detail={`de ${config.vagas_dia} vagas`} />
        </CounterGrid>
      </section>

      <div className="painel-busca">
        <SearchField
          label="Buscar por e-mail, nome ou telefone"
          placeholder="E-mail do ingresso, nome ou telefone"
          value={busca}
          onChange={setBusca}
          onDark
          status={
            buscando
              ? totalEncontrado === 0
                ? "Ninguém encontrado na fila de hoje."
                : plural(totalEncontrado, "pessoa encontrada", "pessoas encontradas")
              : undefined
          }
        />
      </div>

      <div className="painel-grade">
        <div className="painel-coluna painel-coluna-fila">
          {(!buscando || filtrados.aguardando.length > 0) && (
            <Secao
              titulo="Aguardando"
              quantidade={filtrados.aguardando.length}
              tom="info"
              descricao="São chamados em ordem, automaticamente, quando uma vaga abre."
              vazio="Ninguém aguardando na fila."
              lista
            >
              {filtrados.aguardando.map((p) => (
                <QueueCard
                  key={p.id}
                  compact
                  leading={p.posicao !== null ? `${p.posicao}º` : "–"}
                  title={p.nome}
                  subtitle={p.email ?? "sem e-mail"}
                  meta={contato(p, `inscrito às ${formatarHora(p.criado_em)}`)}
                />
              ))}
            </Secao>
          )}
        </div>

        <div className="painel-coluna">
          {(filtrados.falha_envio.length > 0 || (!buscando && grupos.falha_envio.length > 0)) && (
            <Secao
              titulo="Falha de envio"
              quantidade={filtrados.falha_envio.length}
              tom="stop"
              descricao="O WhatsApp de chamada não chegou. Procure a pessoa pelo nome ou e-mail."
            >
              {filtrados.falha_envio.map((p) => (
                <QueueCard
                  key={p.id}
                  tone="stop"
                  title={p.nome}
                  subtitle={p.email ?? "sem e-mail"}
                  meta={contato(p, p.chamado_em ? `chamado às ${formatarHora(p.chamado_em)}` : undefined)}
                  aside={<StatusBadge tone="stop">Não enviado</StatusBadge>}
                  note={<>Erro: {p.ultimo_erro?.trim() || "o WhatsApp recusou o envio, sem detalhe."}</>}
                  actions={acoesChamado(p)}
                />
              ))}
            </Secao>
          )}

          {(!buscando || filtrados.chamado.length > 0) && (
            <Secao
              titulo="Chamados"
              quantidade={filtrados.chamado.length}
              tom="wait"
              descricao={`Prazo de ${config.tempo_limite_min} min para chegar. Verde até ${amareloMin} min, amarelo até ${config.tempo_limite_min}, vermelho depois.`}
              vazio={
                situacao === "nao_iniciada"
                  ? "Ninguém foi chamado ainda. Inicie a sala para chamar as primeiras pessoas."
                  : "Ninguém esperando check-in agora."
              }
            >
              {filtrados.chamado.map((p) => {
                const decorrido = p.chamado_em ? agora - Date.parse(p.chamado_em) : 0;
                const tom = timerTone(decorrido, amareloMin, config.tempo_limite_min);
                return (
                  <QueueCard
                    key={p.id}
                    tone={tom === "neutral" ? "default" : tom}
                    title={p.nome}
                    subtitle={p.email ?? "sem e-mail"}
                    meta={contato(p, p.chamado_em ? `chamado às ${formatarHora(p.chamado_em)}` : undefined)}
                    aside={
                      p.chamado_em ? (
                        <ElapsedTimer
                          since={p.chamado_em}
                          now={agora}
                          warnAfterMin={amareloMin}
                          stopAfterMin={config.tempo_limite_min}
                          label="Chamado há"
                        />
                      ) : undefined
                    }
                    actions={acoesChamado(p)}
                  />
                );
              })}
            </Secao>
          )}

          {(!buscando || filtrados.em_atendimento.length > 0) && (
            <Secao
              titulo="Em atendimento"
              quantidade={filtrados.em_atendimento.length}
              tom="teal"
              vazio="Ninguém em atendimento agora."
            >
              {filtrados.em_atendimento.map((p) => {
                const ocupado = pendentes.has(p.id);
                return (
                  <QueueCard
                    key={p.id}
                    title={p.nome}
                    subtitle={p.email ?? "sem e-mail"}
                    meta={contato(p, p.entrou_em ? `entrou às ${formatarHora(p.entrou_em)}` : undefined)}
                    aside={
                      p.entrou_em ? (
                        <ElapsedTimer since={p.entrou_em} now={agora} label="Em atendimento há" />
                      ) : undefined
                    }
                    actions={
                      <Button size="sm" disabled={ocupado} onClick={() => checkOut(p)}>
                        {ocupado ? "Aguarde…" : "Check-out"}
                      </Button>
                    }
                  />
                );
              })}
            </Secao>
          )}

          {(!buscando || filtrados.concluido.length > 0) && (
            <Collapsible
              title="Concluídos"
              count={filtrados.concluido.length}
              forceOpen={buscando && filtrados.concluido.length > 0}
              onDark
            >
              <ListaSimples
                vazio="Ninguém concluiu ainda."
                pessoas={filtrados.concluido}
                detalhe={(p) =>
                  p.entrou_em && p.saiu_em
                    ? `${formatarHora(p.entrou_em)}–${formatarHora(p.saiu_em)}`
                    : formatarHora(p.saiu_em)
                }
                tom="go"
              />
            </Collapsible>
          )}

          {(!buscando || filtrados.nao_compareceu.length > 0) && (
            <Collapsible
              title="Não compareceram"
              count={filtrados.nao_compareceu.length}
              forceOpen={buscando && filtrados.nao_compareceu.length > 0}
              onDark
            >
              <ListaSimples
                vazio="Ninguém marcado como não compareceu."
                pessoas={filtrados.nao_compareceu}
                detalhe={(p) => (p.chamado_em ? `chamado às ${formatarHora(p.chamado_em)}` : "")}
                tom="muted"
              />
            </Collapsible>
          )}
        </div>
      </div>

      <div className="painel-aviso" aria-live="polite">
        {aviso && (
          <div key={aviso.id} className="painel-aviso-caixa">
            <Alert tone={aviso.tom}>{aviso.texto}</Alert>
            <button type="button" className="painel-aviso-fechar" onClick={() => setAviso(null)} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        )}
      </div>

      <Modal
        open={confirmacao?.tipo === "iniciar"}
        onClose={() => setConfirmacao(null)}
        busy={salaOcupada}
        title="Iniciar a sala?"
        description={
          grupos.aguardando.length === 0
            ? "Ainda não há ninguém aguardando. Quem se inscrever depois é chamado automaticamente quando houver vaga."
            : `${plural(Math.min(vagasLivres, grupos.aguardando.length), "pessoa recebe", "pessoas recebem")} agora a mensagem "Sua vez chegou" no WhatsApp, pela ordem da fila.`
        }
        footer={
          <>
            <Button size="sm" disabled={salaOcupada} onClick={() => void confirmar()}>
              {salaOcupada ? "Iniciando…" : "Iniciar e chamar"}
            </Button>
            <Button size="sm" variant="ghost" disabled={salaOcupada} onClick={() => setConfirmacao(null)}>
              Cancelar
            </Button>
          </>
        }
      >
        <p>Depois disso, cada check-out ou não compareceu chama o próximo da fila automaticamente.</p>
      </Modal>

      <Modal
        open={confirmacao?.tipo === "nao_compareceu"}
        onClose={() => setConfirmacao(null)}
        busy={confirmacao?.tipo === "nao_compareceu" && pendentes.has(confirmacao.pessoa.id)}
        title="Marcar como não compareceu?"
        description={
          confirmacao?.tipo === "nao_compareceu"
            ? `${confirmacao.pessoa.nome}${confirmacao.pessoa.email ? ` (${confirmacao.pessoa.email})` : ""}`
            : undefined
        }
        footer={
          confirmacao?.tipo === "nao_compareceu" && (
            <>
              <Button
                size="sm"
                variant="danger"
                disabled={pendentes.has(confirmacao.pessoa.id)}
                onClick={() => void confirmar()}
              >
                {pendentes.has(confirmacao.pessoa.id) ? "Salvando…" : "Não compareceu"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pendentes.has(confirmacao.pessoa.id)}
                onClick={() => setConfirmacao(null)}
              >
                Cancelar
              </Button>
            </>
          )
        }
      >
        <p>
          A vaga é liberada e {situacao === "em_andamento" ? "a próxima pessoa da fila é chamada pelo WhatsApp." : "fica livre para a próxima pessoa."}
        </p>
      </Modal>

      <ModalFinalizar
        open={finalizando}
        pendentes={pendentesFinalizar}
        busy={salaOcupada}
        onClose={() => setFinalizando(false)}
        onFinalizar={(c, n) => void finalizar(c, n)}
      />
    </PageShell>
  );
}

function Secao({
  titulo,
  quantidade,
  tom,
  descricao,
  vazio,
  lista = false,
  children,
}: {
  titulo: string;
  quantidade: number;
  tom: "wait" | "stop" | "teal" | "info";
  descricao?: string;
  vazio?: string;
  lista?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`painel-secao painel-secao-${tom}`}>
      <header className="painel-secao-topo">
        <h2 className="painel-secao-titulo">
          <span className="painel-secao-marcador" aria-hidden="true" />
          {titulo}
          <span className="painel-secao-quantidade">{quantidade}</span>
        </h2>
        {descricao && <p className="painel-secao-descricao">{descricao}</p>}
      </header>
      {quantidade === 0 ? (
        vazio && <p className="painel-secao-vazio">{vazio}</p>
      ) : (
        <div className={lista ? "painel-lista" : "painel-cards"}>{children}</div>
      )}
    </section>
  );
}

function ListaSimples({
  pessoas,
  vazio,
  detalhe,
  tom,
}: {
  pessoas: PessoaFila[];
  vazio: string;
  detalhe: (p: PessoaFila) => string;
  tom: "go" | "muted";
}) {
  if (pessoas.length === 0) return <p className="painel-secao-vazio">{vazio}</p>;
  return (
    <div className="painel-lista">
      {pessoas.map((p) => (
        <QueueCard
          key={p.id}
          compact
          tone={tom}
          title={p.nome}
          subtitle={p.email ?? "sem e-mail"}
          meta={
            <>
              {formatarTelefone(p.telefone)}
              {detalhe(p) ? ` · ${detalhe(p)}` : ""}
            </>
          }
        />
      ))}
    </div>
  );
}

function IndicadorConexao({
  conexao,
  atualizadoEm,
  agora,
}: {
  conexao: Conexao;
  atualizadoEm: number | null;
  agora: number;
}) {
  const segundos = atualizadoEm ? Math.max(0, Math.round((agora - atualizadoEm) / 1000)) : null;
  const titulo =
    segundos === null ? undefined : `Atualizado há ${segundos < 60 ? `${segundos}s` : `${Math.floor(segundos / 60)} min`}`;
  return (
    <span className={`painel-conexao painel-conexao-${conexao}`} role="status" title={titulo}>
      <span className="painel-conexao-ponto" aria-hidden="true" />
      {conexao === "ao_vivo" ? "Ao vivo" : conexao === "carregando" ? "Conectando…" : "Reconectando…"}
    </span>
  );
}
