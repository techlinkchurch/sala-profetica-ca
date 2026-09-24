import { useId, type InputHTMLAttributes, type Ref } from "react";
import "./TextField.css";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  ref?: Ref<HTMLInputElement>;
};

export function TextField({ label, hint, error, optional, ref, ...input }: TextFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={`ds-field${error ? " ds-field-error" : ""}`}>
      <label className="ds-field-label" htmlFor={id}>
        {label}
        {optional && <span className="ds-field-optional">opcional</span>}
      </label>
      <input
        {...input}
        ref={ref}
        id={id}
        className="ds-field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
      />
      {message && (
        <p id={messageId} className={error ? "ds-field-error-text" : "ds-field-hint"}>
          {message}
        </p>
      )}
    </div>
  );
}
