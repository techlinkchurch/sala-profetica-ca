import { useId } from "react";
import "./Stepper.css";

type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export function Stepper({ label, value, onChange, min = 0, max = Infinity, disabled = false }: StepperProps) {
  const id = useId();
  return (
    <div className="ds-stepper" role="group" aria-labelledby={`${id}-rotulo`}>
      <span id={`${id}-rotulo`} className="ds-stepper-label">
        {label}
      </span>
      <div className="ds-stepper-controls">
        <button
          type="button"
          className="ds-stepper-button"
          aria-label={`Diminuir ${label.toLowerCase()}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 12h12" />
          </svg>
        </button>
        <output className="ds-stepper-value" aria-live="polite" aria-atomic="true">
          {value}
        </output>
        <button
          type="button"
          className="ds-stepper-button"
          aria-label={`Aumentar ${label.toLowerCase()}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 12h12M12 6v12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
