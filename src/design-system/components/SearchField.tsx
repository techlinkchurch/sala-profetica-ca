import { useId, type Ref } from "react";
import "./SearchField.css";

type SearchFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Texto curto abaixo do campo, ex.: "3 resultados". Anunciado por leitores de tela. */
  status?: string;
  /** Mostra o rótulo acima do campo (padrão) ou só para leitores de tela. */
  hideLabel?: boolean;
  onDark?: boolean;
  ref?: Ref<HTMLInputElement>;
};

export function SearchField({
  label,
  value,
  onChange,
  placeholder,
  status,
  hideLabel = false,
  onDark = false,
  ref,
}: SearchFieldProps) {
  const id = useId();
  return (
    <div className={`ds-search${onDark ? " ds-search-on-dark" : ""}`}>
      <label htmlFor={id} className={hideLabel ? "ds-visually-hidden" : "ds-search-label"}>
        {label}
      </label>
      <div className="ds-search-box">
        <svg className="ds-search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
        <input
          ref={ref}
          id={id}
          className="ds-search-input"
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.preventDefault();
              onChange("");
            }
          }}
        />
        {value && (
          <button type="button" className="ds-search-clear" onClick={() => onChange("")} aria-label="Limpar busca">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>
      <p className="ds-search-status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
