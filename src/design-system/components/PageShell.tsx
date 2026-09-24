import type { ReactNode } from "react";
import "./PageShell.css";

type PageShellProps = {
  children: ReactNode;
  /** narrow (padrão): coluna de formulário. wide: painel/dashboard em tablet e notebook. */
  width?: "narrow" | "wide";
};

export function PageShell({ children, width = "narrow" }: PageShellProps) {
  return (
    <div className={`ds-page${width === "wide" ? " ds-page-wide" : ""}`}>
      <div className="ds-page-decor" aria-hidden="true">
        <span className="ds-page-ring" />
        <svg className="ds-page-chevrons" viewBox="0 0 200 120">
          <path d="M0 0 L80 60 L0 120 L0 88 L38 60 L0 32 Z" />
          <path d="M100 0 L180 60 L100 120 L100 88 L138 60 L100 32 Z" />
        </svg>
      </div>
      <div className="ds-page-content">{children}</div>
    </div>
  );
}
