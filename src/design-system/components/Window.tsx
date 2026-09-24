import type { HTMLAttributes } from "react";
import "./Window.css";

export function Window({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={`ds-window${className ? ` ${className}` : ""}`} {...rest}>
      <div className="ds-window-bar" aria-hidden="true">
        <span className="ds-window-dot ds-window-dot-sky" />
        <span className="ds-window-dot ds-window-dot-teal" />
        <span className="ds-window-dot ds-window-dot-petrol" />
      </div>
      <div className="ds-window-body">{children}</div>
    </section>
  );
}
