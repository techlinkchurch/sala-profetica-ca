import type { ReactNode } from "react";
import "./Eyebrow.css";

type EyebrowProps = {
  children: ReactNode;
  align?: "left" | "right";
};

export function Eyebrow({ children, align = "left" }: EyebrowProps) {
  return <p className={`ds-eyebrow ds-eyebrow-${align}`}>{children}</p>;
}
