import type { ReactNode } from "react";
import "./Alert.css";

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p className="ds-alert" role="alert">
      {children}
    </p>
  );
}
