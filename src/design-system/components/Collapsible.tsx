import { useId, useState, type ReactNode } from "react";
import "./Collapsible.css";

type CollapsibleProps = {
  title: string;
  /** Número ao lado do título, ex.: quantidade de itens. */
  count?: number;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Mantém aberto independentemente do clique (ex.: há resultados de busca aqui dentro). */
  forceOpen?: boolean;
  onDark?: boolean;
};

export function Collapsible({
  title,
  count,
  children,
  defaultOpen = false,
  forceOpen = false,
  onDark = false,
}: CollapsibleProps) {
  const id = useId();
  const [aberto, setAberto] = useState(defaultOpen);
  const open = forceOpen || aberto;

  return (
    <section className={`ds-collapsible${onDark ? " ds-collapsible-on-dark" : ""}${open ? " is-open" : ""}`}>
      <h2 className="ds-collapsible-heading">
        <button
          type="button"
          className="ds-collapsible-trigger"
          aria-expanded={open}
          aria-controls={`${id}-conteudo`}
          onClick={() => setAberto(!open)}
        >
          <span className="ds-collapsible-title">{title}</span>
          {count !== undefined && <span className="ds-collapsible-count">{count}</span>}
          <svg className="ds-collapsible-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
      </h2>
      <div id={`${id}-conteudo`} className="ds-collapsible-content" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
