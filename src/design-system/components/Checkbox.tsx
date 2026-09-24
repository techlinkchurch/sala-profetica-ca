import type { InputHTMLAttributes, ReactNode } from "react";
import "./Checkbox.css";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  description?: ReactNode;
};

export function Checkbox({ label, description, ...input }: CheckboxProps) {
  return (
    <label className="ds-checkbox">
      <input {...input} type="checkbox" className="ds-checkbox-input" />
      <span>
        {label}
        {description && <small className="ds-checkbox-description">{description}</small>}
      </span>
    </label>
  );
}
