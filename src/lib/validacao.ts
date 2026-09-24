import { digitosTelefone } from "./telefone";

export type Campo = "nome" | "telefone" | "email";
export type Erros = Partial<Record<Campo, string>>;

export const CAMPOS: Campo[] = ["nome", "telefone", "email"];

export const MENSAGENS: Record<Campo, string> = {
  nome: "Digite seu nome e sobrenome.",
  telefone: "Confira o número com DDD. Ex.: (91) 99999‑9999.",
  email: "Esse e-mail parece incompleto. Confira ou deixe em branco.",
};

// Pelo menos duas palavras com 2+ letras: "Maria Silva" passa, "Maria" e "Maria S" não.
function nomeValido(nome: string): boolean {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.replace(/[^\p{L}]/gu, "").length >= 2);
  return palavras.length >= 2 && nome.trim().length <= 200;
}

function telefoneValido(telefone: string): boolean {
  const d = digitosTelefone(telefone);
  return (d.length === 10 || d.length === 11) && d[0] !== "0";
}

function emailValido(email: string): boolean {
  const e = email.trim();
  return e === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

export function validarCampo(campo: Campo, valor: string): string | undefined {
  const ok =
    campo === "nome" ? nomeValido(valor) : campo === "telefone" ? telefoneValido(valor) : emailValido(valor);
  return ok ? undefined : MENSAGENS[campo];
}
