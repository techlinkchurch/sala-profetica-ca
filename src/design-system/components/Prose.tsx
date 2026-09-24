import type { ReactNode } from "react";
import "./Prose.css";

export function Prose({ children }: { children: ReactNode }) {
  return <div className="ds-prose">{children}</div>;
}
