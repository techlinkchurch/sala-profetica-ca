import "./ElapsedTimer.css";

type ElapsedTimerProps = {
  /** Início da contagem (ISO ou epoch ms). */
  since: string | number;
  /** "Agora" em epoch ms — vem de um relógio de 1s do pai, para todos os cards andarem juntos. */
  now: number;
  /** Semáforo: verde até warnAfterMin, amarelo até stopAfterMin, vermelho depois. Sem os dois, fica neutro. */
  warnAfterMin?: number;
  stopAfterMin?: number;
  /** Prefixo lido por leitores de tela, ex.: "Chamado há". */
  label?: string;
};

export type TimerTone = "neutral" | "go" | "wait" | "stop";

export function timerTone(elapsedMs: number, warnAfterMin?: number, stopAfterMin?: number): TimerTone {
  if (warnAfterMin === undefined || stopAfterMin === undefined) return "neutral";
  const min = elapsedMs / 60_000;
  if (min >= stopAfterMin) return "stop";
  if (min >= warnAfterMin) return "wait";
  return "go";
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

const DESCRICAO: Record<TimerTone, string> = {
  neutral: "",
  go: "dentro do prazo",
  wait: "atenção",
  stop: "prazo esgotado",
};

export function ElapsedTimer({ since, now, warnAfterMin, stopAfterMin, label = "Há" }: ElapsedTimerProps) {
  const inicio = typeof since === "number" ? since : Date.parse(since);
  const decorrido = Number.isFinite(inicio) ? now - inicio : 0;
  const tone = timerTone(decorrido, warnAfterMin, stopAfterMin);
  const minutos = Math.floor(Math.max(0, decorrido) / 60_000);
  const falado = `${label} ${minutos} min${DESCRICAO[tone] ? `, ${DESCRICAO[tone]}` : ""}`;

  return (
    <span className={`ds-timer ds-timer-${tone}`} role="timer" aria-label={falado} title={falado}>
      <span className="ds-timer-light" aria-hidden="true" />
      <span className="ds-timer-value" aria-hidden="true">
        {formatElapsed(decorrido)}
      </span>
    </span>
  );
}
