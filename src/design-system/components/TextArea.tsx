import { useId, type Ref, type TextareaHTMLAttributes } from "react";
import "./TextField.css";
import "./TextArea.css";

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  /** Mostra "N/limite" quando informado (usa maxLength do próprio campo). */
  counter?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

export function TextArea({ label, hint, error, optional, counter, ref, ...textarea }: TextAreaProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const tamanho = typeof textarea.value === "string" ? textarea.value.length : 0;

  return (
    <div className={`ds-field${error ? " ds-field-error" : ""}`}>
      <label className="ds-field-label" htmlFor={id}>
        {label}
        {optional && <span className="ds-field-optional">opcional</span>}
      </label>
      <textarea
        rows={5}
        {...textarea}
        ref={ref}
        id={id}
        className="ds-field-input ds-textarea"
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
      />
      <div className="ds-textarea-rodape">
        {message ? (
          <p id={messageId} className={error ? "ds-field-error-text" : "ds-field-hint"}>
            {message}
          </p>
        ) : (
          <span />
        )}
        {counter && textarea.maxLength && (
          <span className="ds-textarea-contador" aria-hidden="true">
            {tamanho}/{textarea.maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
