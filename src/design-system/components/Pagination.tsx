import "./Pagination.css";

type PaginationProps = {
  page: number; // 1-based
  pageCount: number;
  onChange: (page: number) => void;
  label?: string;
  onDark?: boolean;
};

// Até 7 botões: primeira, última, a atual e vizinhas, com "…" nos saltos.
function paginasVisiveis(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const meio = [page - 1, page, page + 1].filter((p) => p > 1 && p < total);
  const lista: (number | "…")[] = [1];
  if (meio[0] > 2) lista.push("…");
  lista.push(...meio);
  if (meio[meio.length - 1] < total - 1) lista.push("…");
  lista.push(total);
  return lista;
}

export function Pagination({ page, pageCount, onChange, label = "Paginação", onDark }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav className={`ds-pagination${onDark ? " ds-pagination-dark" : ""}`} aria-label={label}>
      <button
        type="button"
        className="ds-pagination-nav"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Página anterior"
      >
        ‹
      </button>
      {paginasVisiveis(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="ds-pagination-ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className="ds-pagination-page"
            aria-current={p === page ? "page" : undefined}
            aria-label={`Página ${p}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="ds-pagination-nav"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        aria-label="Próxima página"
      >
        ›
      </button>
    </nav>
  );
}
