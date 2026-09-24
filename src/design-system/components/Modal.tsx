import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Botões do rodapé (ficam fixos embaixo em telas pequenas). */
  footer?: ReactNode;
  /** Descrição curta logo abaixo do título (vira aria-describedby). */
  description?: ReactNode;
  /** Elemento que recebe o foco ao abrir; padrão: primeiro elemento focável. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Enquanto true, Esc e o clique fora não fecham (ex.: requisição em andamento). */
  busy?: boolean;
  size?: "sm" | "md";
};

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  description,
  initialFocus,
  busy = false,
  size = "sm",
}: ModalProps) {
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef(onClose);
  const ocupado = useRef(busy);
  fechar.current = onClose;
  ocupado.current = busy;

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const alvo = initialFocus?.current ?? caixa.current?.querySelector<HTMLElement>(FOCAVEIS) ?? caixa.current;
    alvo?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!ocupado.current) fechar.current();
        return;
      }
      if (e.key !== "Tab" || !caixa.current) return;
      const itens = Array.from(caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (itens.length === 0) {
        e.preventDefault();
        caixa.current.focus();
        return;
      }
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      const ativo = document.activeElement;
      if (e.shiftKey && (ativo === primeiro || !caixa.current.contains(ativo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (ativo === ultimo || !caixa.current.contains(ativo))) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
    // initialFocus é lido só na abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="ds-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={caixa}
        className={`ds-modal ds-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={description ? `${id}-descricao` : undefined}
        tabIndex={-1}
      >
        <header className="ds-modal-header">
          <h2 id={`${id}-titulo`} className="ds-modal-title">
            {title}
          </h2>
          {description && (
            <p id={`${id}-descricao`} className="ds-modal-description">
              {description}
            </p>
          )}
        </header>
        <div className="ds-modal-body">{children}</div>
        {footer && <footer className="ds-modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
