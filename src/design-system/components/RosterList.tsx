import type { CSSProperties, ReactNode } from "react";
import "./RosterList.css";

export type RosterItem = {
  key: string;
  leading?: ReactNode; // ex.: posição "1º"
  title: string;
  subtitle?: ReactNode; // informação principal abaixo do título (ex.: e-mail)
  meta?: ReactNode; // detalhe secundário à direita, some em telas estreitas (ex.: telefone)
  trailing?: ReactNode; // ex.: horário
  highlight?: boolean; // ex.: próximos a serem chamados
};

type RosterListProps = {
  items: RosterItem[];
  empty?: string;
  footer?: ReactNode;
  label?: string;
  /** Reserva a altura de N linhas, para o rodapé não pular quando a última página tem menos itens. */
  minRows?: number;
};

/** Lista densa dentro de um cartão: uma linha por pessoa, para filas longas. */
export function RosterList({ items, empty, footer, label, minRows }: RosterListProps) {
  const estilo = minRows ? ({ "--ds-roster-rows": minRows } as CSSProperties) : undefined;
  return (
    <div className={`ds-roster${minRows ? " ds-roster-fixed" : ""}`} style={estilo}>
      {items.length === 0 ? (
        <p className="ds-roster-empty">{empty}</p>
      ) : (
        <ol className="ds-roster-list" aria-label={label}>
          {items.map((item) => (
            <li key={item.key} className={`ds-roster-row${item.highlight ? " ds-roster-row-highlight" : ""}`}>
              {item.leading !== undefined && <span className="ds-roster-leading">{item.leading}</span>}
              <span className="ds-roster-main">
                <span className="ds-roster-title">{item.title}</span>
                {item.subtitle && <span className="ds-roster-subtitle">{item.subtitle}</span>}
              </span>
              {(item.meta || item.trailing) && (
                <span className="ds-roster-side">
                  {item.meta && <span className="ds-roster-meta">{item.meta}</span>}
                  {item.trailing && <span className="ds-roster-trailing">{item.trailing}</span>}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      {footer && <div className="ds-roster-footer">{footer}</div>}
    </div>
  );
}
