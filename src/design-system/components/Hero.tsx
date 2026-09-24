import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";
import "./Hero.css";

type HeroProps = {
  eyebrow: string;
  titleLight: ReactNode;
  titleStrong: string;
  size?: "lg" | "md";
  children?: ReactNode;
};

export function Hero({ eyebrow, titleLight, titleStrong, size = "lg", children }: HeroProps) {
  return (
    <header className={`ds-hero ds-hero-${size}`}>
      <Eyebrow align="right">{eyebrow}</Eyebrow>
      <h1 className="ds-hero-title">
        <span className="ds-hero-title-light">{titleLight}</span>
        <span className="ds-hero-title-strong">{titleStrong}</span>
      </h1>
      {children && <div className="ds-hero-lede">{children}</div>}
    </header>
  );
}
