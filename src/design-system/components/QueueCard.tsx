import type { ReactNode } from "react";
import "./QueueCard.css";

type QueueCardProps = {
  /** Nome da pessoa (texto puro). */
  title: string;
  /** Linha de destaque logo abaixo do nome, ex.: e-mail (é por ele que a equipe confere o ingresso). */
  subtitle?: ReactNode;
  /** Linhas secundárias, ex.: telefone. */
  meta?: ReactNode;
  /** Número/posição à esquerda. */
  leading?: ReactNode;
  /** Canto superior direito: badge ou timer. */
  aside?: ReactNode;
  /** Bloco de aviso dentro do card, ex.: erro de envio. */
  note?: ReactNode;
  actions?: ReactNode;
  /** Realce da borda: wait = amarelo, stop = vermelho. */
  tone?: "default" | "go" | "wait" | "stop" | "muted";
  compact?: boolean;
};

export function QueueCard({
  title,
  subtitle,
  meta,
  leading,
  aside,
  note,
  actions,
  tone = "default",
  compact = false,
}: QueueCardProps) {
  return (
    <article className={`ds-qcard ds-qcard-${tone}${compact ? " ds-qcard-compact" : ""}`}>
      <div className="ds-qcard-top">
        {leading !== undefined && <div className="ds-qcard-leading">{leading}</div>}
        <div className="ds-qcard-main">
          <h3 className="ds-qcard-title">{title}</h3>
          {subtitle && <p className="ds-qcard-subtitle">{subtitle}</p>}
          {meta && <p className="ds-qcard-meta">{meta}</p>}
        </div>
        {aside && <div className="ds-qcard-aside">{aside}</div>}
      </div>
      {note && <div className="ds-qcard-note">{note}</div>}
      {actions && <div className="ds-qcard-actions">{actions}</div>}
    </article>
  );
}
