import { useRef, useState, type FormEvent } from "react";
import { Alert, Button, TextField } from "../design-system";
import { supabasePainel } from "./supabasePainel";

type Campo = "email" | "senha";
type Erros = Partial<Record<Campo, string>>;
const CAMPOS: Campo[] = ["email", "senha"];

const MENSAGENS: Record<Campo, string> = {
  email: "Digite um e-mail válido. Ex.: nome@linkchurch.com.br.",
  senha: "Digite sua senha.",
};

function validar(campo: Campo, valor: string): string | undefined {
  const ok = campo === "email" ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor.trim()) : valor.length > 0;
  return ok ? undefined : MENSAGENS[campo];
}

// Mesma regra do formulário público: o erro some na hora em que o campo fica válido,
// mas só aparece depois de uma pausa na digitação (ou ao sair do campo).
const ATRASO_ERRO_MS = 600;

export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const refs = { email: useRef<HTMLInputElement>(null), senha: useRef<HTMLInputElement>(null) };
  const timers = useRef<Partial<Record<Campo, number>>>({});

  function aoDigitar(campo: Campo, valor: string) {
    window.clearTimeout(timers.current[campo]);
    setFalha(null);
    const erro = validar(campo, valor);
    if (!erro) {
      setErros((a) => ({ ...a, [campo]: undefined }));
      return;
    }
    timers.current[campo] = window.setTimeout(() => setErros((a) => ({ ...a, [campo]: erro })), ATRASO_ERRO_MS);
  }

  function aoSair(campo: Campo, valor: string) {
    if (valor === "") return;
    window.clearTimeout(timers.current[campo]);
    setErros((a) => ({ ...a, [campo]: validar(campo, valor) }));
  }

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (entrando) return;
    CAMPOS.forEach((c) => window.clearTimeout(timers.current[c]));
    const valores: Record<Campo, string> = { email, senha };
    const locais: Erros = {};
    CAMPOS.forEach((c) => (locais[c] = validar(c, valores[c])));
    setErros(locais);
    setFalha(null);
    const primeiro = CAMPOS.find((c) => locais[c]);
    if (primeiro) {
      refs[primeiro].current?.focus();
      return;
    }

    setEntrando(true);
    try {
      const { error } = await supabasePainel.auth.signInWithPassword({ email: email.trim(), password: senha });
      if (error) {
        const status = error.status ?? 0;
        // Mensagem genérica de propósito: não revela se o e-mail existe.
        if (status === 429) setFalha("Muitas tentativas seguidas. Aguarde um minuto e tente de novo.");
        else if (status >= 400 && status < 500) setFalha("E-mail ou senha incorretos.");
        else setFalha("Não conseguimos conectar agora. Verifique a internet e tente de novo.");
        setSenha("");
        refs.senha.current?.focus();
      }
      // Sucesso: o onAuthStateChange do Painel troca a tela.
    } catch {
      setFalha("Não conseguimos conectar agora. Verifique a internet e tente de novo.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <form className="painel-stack painel-stack-lg" onSubmit={entrar} noValidate>
      <TextField
        ref={refs.email}
        label="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="off"
        spellCheck={false}
        value={email}
        error={erros.email}
        onChange={(e) => {
          setEmail(e.target.value);
          aoDigitar("email", e.target.value);
        }}
        onBlur={(e) => aoSair("email", e.target.value)}
      />
      <TextField
        ref={refs.senha}
        label="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        value={senha}
        error={erros.senha}
        onChange={(e) => {
          setSenha(e.target.value);
          aoDigitar("senha", e.target.value);
        }}
        onBlur={(e) => aoSair("senha", e.target.value)}
      />
      {falha && <Alert>{falha}</Alert>}
      <Button type="submit" disabled={entrando}>
        {entrando ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
