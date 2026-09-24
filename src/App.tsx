import { useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Eyebrow,
  NumberedList,
  PageShell,
  Stat,
  TextField,
  Window,
} from "./design-system";
import { inscreverNaFila, type MotivoRecusa } from "./lib/inscricao";
import { digitosTelefone, mascararTelefone } from "./lib/telefone";
import "./App.css";

type Campo = "nome" | "telefone" | "email";
type Erros = Partial<Record<Campo, string>>;
type Fase =
  | { tipo: "formulario" }
  | { tipo: "sucesso"; posicao: number }
  | { tipo: "ja_inscrito" }
  | { tipo: "vagas_esgotadas" };

const CAMPOS: Campo[] = ["nome", "telefone", "email"];

const MENSAGENS_CAMPO: Record<Campo, string> = {
  nome: "Digite seu nome completo.",
  telefone: "Confira o número com DDD. Ex.: (91) 99999‑9999.",
  email: "Esse e-mail parece incompleto. Confira ou deixe em branco.",
};

const CAMPO_DO_MOTIVO: Partial<Record<MotivoRecusa, Campo>> = {
  nome_invalido: "nome",
  telefone_invalido: "telefone",
  email_invalido: "email",
};

const PRIVACY_URL = import.meta.env.VITE_PRIVACY_POLICY_URL as string | undefined;

function validarLocal(nome: string, telefone: string, email: string): Erros {
  const erros: Erros = {};
  if (nome.trim().length < 2) erros.nome = MENSAGENS_CAMPO.nome;
  if (digitosTelefone(telefone).length < 10) erros.telefone = MENSAGENS_CAMPO.telefone;
  if (email.trim() !== "" && !/^\S+@\S+\.\S+$/.test(email.trim())) erros.email = MENSAGENS_CAMPO.email;
  return erros;
}

export default function App() {
  const [fase, setFase] = useState<Fase>({ tipo: "formulario" });
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [aceita, setAceita] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [falhaRede, setFalhaRede] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const refs = {
    nome: useRef<HTMLInputElement>(null),
    telefone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
  };

  function limparErro(campo: Campo) {
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;

    const locais = validarLocal(nome, telefone, email);
    setErros(locais);
    setFalhaRede(false);
    const primeiroInvalido = CAMPOS.find((c) => locais[c]);
    if (primeiroInvalido) {
      refs[primeiroInvalido].current?.focus();
      return;
    }

    setEnviando(true);
    const resultado = await inscreverNaFila({ nome, telefone, email, aceitaComunicacao: aceita });
    setEnviando(false);

    if (!resultado) {
      setFalhaRede(true);
      return;
    }
    if (resultado.ok) {
      setFase({ tipo: "sucesso", posicao: resultado.posicao });
      return;
    }
    const campo = CAMPO_DO_MOTIVO[resultado.motivo];
    if (campo) {
      setErros({ [campo]: MENSAGENS_CAMPO[campo] });
      refs[campo].current?.focus();
      return;
    }
    setFase({ tipo: resultado.motivo as "ja_inscrito" | "vagas_esgotadas" });
  }

  return (
    <PageShell>
      <header className="hero">
        <Eyebrow align="right">Céus Abertos 26’ · Link Church</Eyebrow>
        <h1 className="hero-title">
          <span className="hero-title-sala">
            <strong>sa</strong>la
          </span>
          <span className="hero-title-profetica">Profética</span>
        </h1>
        <p className="hero-lede">
          Entre na fila <em>online</em>. Quando for a sua vez, a gente te chama pelo WhatsApp.
        </p>
      </header>

      <Window aria-live="polite">
        {fase.tipo === "formulario" && (
          <form className="stack stack-lg" onSubmit={enviar} noValidate>
            <TextField
              ref={refs.nome}
              label="Nome"
              name="nome"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              maxLength={200}
              value={nome}
              error={erros.nome}
              onChange={(e) => {
                setNome(e.target.value);
                limparErro("nome");
              }}
            />

            <TextField
              ref={refs.telefone}
              label="WhatsApp"
              hint="Com DDD. É por aqui que a gente te chama."
              name="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(91) 99999-9999"
              value={telefone}
              error={erros.telefone}
              onChange={(e) => {
                setTelefone(mascararTelefone(e.target.value));
                limparErro("telefone");
              }}
            />

            <TextField
              ref={refs.email}
              label="E-mail"
              optional
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              spellCheck={false}
              value={email}
              error={erros.email}
              onChange={(e) => {
                setEmail(e.target.value);
                limparErro("email");
              }}
            />

            <Checkbox
              name="aceita_comunicacao"
              checked={aceita}
              onChange={(e) => setAceita(e.target.checked)}
              label="Aceito receber comunicações da Link Church sobre eventos futuros pelo WhatsApp."
              description={
                <>
                  Sem marcar, seu número só é usado para a Sala Profética de hoje.
                  {PRIVACY_URL && (
                    <>
                      {" "}
                      <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                        Política de Privacidade
                      </a>
                    </>
                  )}
                </>
              }
            />

            {falhaRede && <Alert>Não conseguimos enviar agora. Verifique sua conexão e tente de novo.</Alert>}

            <Button type="submit" disabled={enviando}>
              {enviando ? "Enviando…" : "Entrar na fila"}
            </Button>
          </form>
        )}

        {fase.tipo === "sucesso" && (
          <div className="stack">
            <Eyebrow>Você está na fila!</Eyebrow>
            <Stat label="Posição" value={fase.posicao} />
            <p>A confirmação chega no seu WhatsApp em instantes.</p>
            <p>
              Quando chegar a mensagem avisando que é <strong>a sua vez</strong>, você terá{" "}
              <strong>10 minutos</strong> para chegar à Sala Profética.
            </p>
          </div>
        )}

        {fase.tipo === "ja_inscrito" && (
          <div className="stack">
            <Eyebrow>Tudo certo</Eyebrow>
            <h2 className="result-title">Você já está na fila de hoje com esse número.</h2>
            <p>Fique de olho no WhatsApp: a gente te chama quando for a sua vez.</p>
            <Button variant="ghost" onClick={() => setFase({ tipo: "formulario" })}>
              Usar outro número
            </Button>
          </div>
        )}

        {fase.tipo === "vagas_esgotadas" && (
          <div className="stack">
            <Eyebrow>Inscrições encerradas</Eyebrow>
            <h2 className="result-title">As inscrições para a Sala Profética de hoje foram encerradas.</h2>
            <p>Obrigado pelo interesse. Aproveite a conferência!</p>
          </div>
        )}
      </Window>

      <footer className="how-it-works">
        <NumberedList
          items={[
            "Cadastre-se aqui e entre na fila online.",
            "A equipe chama pelo WhatsApp, conforme as vagas.",
            "Recebeu “é a sua vez”? Você tem 10 minutos para chegar.",
          ]}
        />
      </footer>
    </PageShell>
  );
}
