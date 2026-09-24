import type { ButtonHTMLAttributes } from "react";
import "./Button.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary/ghost: sobre fundo creme. danger: ação destrutiva. light: contorno claro sobre fundo petróleo. */
  variant?: "primary" | "ghost" | "danger" | "light";
  /** md (padrão) ocupa a largura toda; sm é compacto, para ações dentro de cards. */
  size?: "md" | "sm";
};

export function Button({ variant = "primary", size = "md", type = "button", className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`ds-button ds-button-${variant}${size === "sm" ? " ds-button-sm" : ""}${className ? ` ${className}` : ""}`}
    />
  );
}
