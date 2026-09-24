import type { ReactNode } from "react";
import "./NumberedList.css";

export function NumberedList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="ds-numbered-list">
      {items.map((item, i) => (
        <li key={i}>
          <span className="ds-numbered-list-number">{String(i + 1).padStart(2, "0")}.</span> {item}
        </li>
      ))}
    </ol>
  );
}
