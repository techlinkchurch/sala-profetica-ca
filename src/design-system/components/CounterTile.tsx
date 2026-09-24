import type { ReactNode } from "react";
import "./CounterTile.css";

type CounterTileProps = {
  label: string;
  value: ReactNode;
  /** Cor do marcador; "stop" também realça o bloco inteiro (ex.: falhas > 0). */
  tone?: "neutral" | "info" | "go" | "wait" | "stop" | "muted" | "teal";
  /** Realça o bloco (use quando o número pede atenção). */
  emphasis?: boolean;
  /** Texto pequeno abaixo do número, ex.: "de 60 vagas". */
  detail?: ReactNode;
};

export function CounterTile({ label, value, tone = "neutral", emphasis = false, detail }: CounterTileProps) {
  return (
    <div className={`ds-counter ds-counter-${tone}${emphasis ? " ds-counter-emphasis" : ""}`}>
      <dt className="ds-counter-label">
        <span className="ds-counter-dot" aria-hidden="true" />
        {label}
      </dt>
      <dd className="ds-counter-value">
        {value}
        {detail && <span className="ds-counter-detail">{detail}</span>}
      </dd>
    </div>
  );
}

/** Agrupa CounterTiles numa lista de definição (grade responsiva). */
export function CounterGrid({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <dl className="ds-counter-grid" aria-label={label}>
      {children}
    </dl>
  );
}
