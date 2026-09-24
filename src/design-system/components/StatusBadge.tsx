import type { ReactNode } from "react";
import "./StatusBadge.css";

export type BadgeTone = "neutral" | "info" | "go" | "wait" | "stop" | "muted";

type StatusBadgeProps = {
  children: ReactNode;
  /** go = verde, wait = amarelo, stop = vermelho (mesma escala do semáforo). */
  tone?: BadgeTone;
  /** Variante sobre fundo petróleo (cabeçalho do painel). */
  onDark?: boolean;
};

export function StatusBadge({ children, tone = "neutral", onDark = false }: StatusBadgeProps) {
  return (
    <span className={`ds-badge ds-badge-${tone}${onDark ? " ds-badge-on-dark" : ""}`}>
      <span className="ds-badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
