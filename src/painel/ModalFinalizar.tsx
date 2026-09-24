import { useEffect, useState } from "react";
import { Button, Modal, StatusBadge } from "../design-system";
import type { PessoaFila } from "./contrato";
import { ROTULO_STATUS, TOM_STATUS } from "./pessoas";

type Escolha = "concluido" | "nao_compareceu";

type Props = {
  open: boolean;
  /** Pessoas em chamado / em_atendimento / falha_envio. */
  pendentes: PessoaFila[];
  busy: boolean;
  onClose: () => void;
  onFinalizar: (concluidos: string[], naoCompareceram: string[]) => void;
};

export function ModalFinalizar({ open, pendentes, busy, onClose, onFinalizar }: Props) {
  const [escolhas, setEscolhas] = useState<Record<string, Escolha>>({});

  useEffect(() => {
    if (open) setEscolhas({});
  }, [open]);

  function salvar() {
    const concluidos: string[] = [];
    const nao: string[] = [];
    for (const p of pendentes) {
      if (escolhas[p.id] === "concluido") concluidos.push(p.id);
      else if (escolhas[p.id] === "nao_compareceu") nao.push(p.id);
    }
    onFinalizar(concluidos, nao);
  }

  const temPendentes = pendentes.length > 0;
  const marcados = pendentes.filter((p) => escolhas[p.id]).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="md"
      title="Finalizar a sala de hoje?"
      description={
        temPendentes
          ? `${
              pendentes.length === 1
                ? "Ainda há 1 pessoa chamada ou em atendimento"
                : `Ainda há ${pendentes.length} pessoas chamadas ou em atendimento`
            }. Marque o que aconteceu com cada uma.`
          : "Ninguém está chamado ou em atendimento agora. Depois de finalizar, ninguém mais é chamado."
      }
      footer={
        temPendentes ? (
          <>
            <Button size="sm" disabled={busy} onClick={salvar}>
              {busy ? "Finalizando…" : "Salvar e finalizar"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onFinalizar([], [])}>
              Ignorar e finalizar
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => onFinalizar([], [])}>
              {busy ? "Finalizando…" : "Finalizar sala"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>
              Cancelar
            </Button>
          </>
        )
      }
    >
      <p className="painel-modal-nota">
        Quem não foi atendido hoje pode se inscrever de novo amanhã, normalmente.
      </p>
      {temPendentes && (
        <>
          <div className="painel-finalizar-topo">
            <span className="painel-finalizar-contagem">
              {marcados} de {pendentes.length} marcadas · sem marcação, fica como está
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setEscolhas(Object.fromEntries(pendentes.map((p) => [p.id, "nao_compareceu" as const])))}
            >
              Marcar todos como não compareceu
            </Button>
          </div>
          <ul className="painel-finalizar-lista">
            {pendentes.map((p) => (
              <li key={p.id}>
                <fieldset className="painel-finalizar-item" disabled={busy}>
                  <legend className="painel-finalizar-nome">{p.nome}</legend>
                  <div className="painel-finalizar-info">
                    <span className="painel-finalizar-email">{p.email ?? "sem e-mail"}</span>
                    <StatusBadge tone={TOM_STATUS[p.status]}>{ROTULO_STATUS[p.status]}</StatusBadge>
                  </div>
                  <div className="painel-escolha">
                    {(["concluido", "nao_compareceu"] as const).map((opcao) => (
                      <label key={opcao} className={`painel-escolha-opcao painel-escolha-${opcao}`}>
                        <input
                          type="radio"
                          name={`finalizar-${p.id}`}
                          value={opcao}
                          checked={escolhas[p.id] === opcao}
                          onChange={() => setEscolhas((a) => ({ ...a, [p.id]: opcao }))}
                        />
                        <span>{opcao === "concluido" ? "Concluído" : "Não compareceu"}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
