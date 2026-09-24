import type { ReactNode } from "react";
import "./NumberedSection.css";

type NumberedSectionProps = {
  number: number;
  title: string;
  children: ReactNode;
};

export function NumberedSection({ number, title, children }: NumberedSectionProps) {
  return (
    <section className="ds-numbered-section">
      <h2 className="ds-numbered-section-title">
        <span className="ds-numbered-section-number">{String(number).padStart(2, "0")}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
