import type { ReactNode } from "react";
import "./Alert.css";

type AlertProps = {
  children: ReactNode;
  tone?: "danger" | "info";
  title?: string;
};

export function Alert({ children, tone = "danger", title }: AlertProps) {
  return (
    <div className={`ds-alert ds-alert-${tone}`} role={tone === "danger" ? "alert" : "note"}>
      {title && <p className="ds-alert-title">{title}</p>}
      <p className="ds-alert-body">{children}</p>
    </div>
  );
}
