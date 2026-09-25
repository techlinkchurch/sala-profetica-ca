import { useId } from "react";
import "./ChoiceGroup.css";

export type Choice<T extends string> = { value: T; label: string };

type ChoiceGroupProps<T extends string> = {
  legend: string;
  hint?: string;
  options: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
};

/** Pergunta de escolha única: rádios nativos (acessíveis) com aparência de pílula. */
export function ChoiceGroup<T extends string>({ legend, hint, options, value, onChange, error }: ChoiceGroupProps<T>) {
  const id = useId();
  const mensagemId = `${id}-mensagem`;
  const mensagem = error ?? hint;

  return (
    <fieldset
      className={`ds-choice${error ? " ds-choice-error" : ""}`}
      aria-describedby={mensagem ? mensagemId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="ds-choice-legend">{legend}</legend>
      <div className="ds-choice-options">
        {options.map((op) => (
          <label key={op.value} className="ds-choice-option">
            <input
              type="radio"
              name={id}
              value={op.value}
              checked={value === op.value}
              onChange={() => onChange(op.value)}
            />
            <span>{op.label}</span>
          </label>
        ))}
      </div>
      {mensagem && (
        <p id={mensagemId} className={error ? "ds-choice-error-text" : "ds-choice-hint"}>
          {mensagem}
        </p>
      )}
    </fieldset>
  );
}
