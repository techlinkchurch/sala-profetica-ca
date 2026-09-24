import type { ButtonHTMLAttributes } from "react";
import "./Button.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "primary", type = "button", className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`ds-button ds-button-${variant}${className ? ` ${className}` : ""}`}
    />
  );
}
