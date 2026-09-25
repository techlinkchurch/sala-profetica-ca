import type { ReactNode } from "react";
import "./RosterList.css";

export type RosterItem = {
  key: string;
  leading?: ReactNode; // ex.: posição "1º"
  title: string;
  subtitle?: ReactNode; // ex.: e-mail · telefone
  trailing?: ReactNode; // ex.: horário
  highlight?: boolean; // ex.: próximos a serem chamados
};

type RosterListProps = {
  items: RosterItem[];
  empty?: string;
  footer?: ReactNode;
  label?: string;
};

/** Lista densa dentro de um cartão: uma linha por pessoa, para filas longas. */
export function RosterList({ items, empty, footer, label }: RosterListProps) {
  return (
    <div className="ds-roster">
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
              {item.trailing && <span className="ds-roster-trailing">{item.trailing}</span>}
            </li>
          ))}
        </ol>
      )}
      {footer && <div className="ds-roster-footer">{footer}</div>}
    </div>
  );
}
