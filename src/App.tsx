import { useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Eyebrow,
  Hero,
  NumberedList,
  PageShell,
  Stat,
  TextField,
  Window,
} from "./design-system";
import { AvisoLocal } from "./AvisoLocal";
import { BotaoIngresso } from "./BotaoIngresso";
import { inscreverNaFila, type ErroDeCampo, type Recusa } from "./lib/inscricao";
import { mascararTelefone } from "./lib/telefone";
import { CAMPOS, MENSAGENS, validarCampo, type Campo, type Erros } from "./lib/validacao";
import { TelaRecusa, type RecusaEmTela } from "./TelaRecusa";
import "./App.css";

type Fase =
  | { tipo: "formulario" }
  | { tipo: "sucesso"; posicao: number; diaEvento: string; nome: string; email: string }
  | { tipo: "recusa"; recusa: RecusaEmTela };

const CAMPO_DO_ERRO: Record<ErroDeCampo, Campo> = {
  nome_invalido: "nome",
  telefone_invalido: "telefone",
  email_invalido: "email",
};

function ehErroDeCampo(r: Recusa): r is Extract<Recusa, { motivo: ErroDeCampo }> {
  return r.motivo in CAMPO_DO_ERRO;
}

// O erro só aparece depois de uma pausa na digitação, para não piscar a cada tecla.
const ATRASO_ERRO_MS = 600;

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

  const timers = useRef<Partial<Record<Campo, number>>>({});

  function validarAoDigitar(campo: Campo, valor: string) {
    window.clearTimeout(timers.current[campo]);
    const erro = validarCampo(campo, valor);
    if (!erro) {
      setErros((atual) => ({ ...atual, [campo]: undefined }));
      return;
    }
    timers.current[campo] = window.setTimeout(
      () => setErros((atual) => ({ ...atual, [campo]: erro })),
      ATRASO_ERRO_MS,
    );
  }

  function validarAoSair(campo: Campo, valor: string) {
    if (valor.trim() === "") return;
    window.clearTimeout(timers.current[campo]);
    setErros((atual) => ({ ...atual, [campo]: validarCampo(campo, valor) }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;

    CAMPOS.forEach((c) => window.clearTimeout(timers.current[c]));
    const valores: Record<Campo, string> = { nome, telefone, email };
    const locais: Erros = {};
    CAMPOS.forEach((c) => (locais[c] = validarCampo(c, valores[c])));
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
      setFase({
        tipo: "sucesso",
        posicao: resultado.posicao,
        diaEvento: resultado.dia_evento,
        nome: nome.trim().replace(/\s+/g, " "),
        email: email.trim().toLowerCase(),
      });
      return;
    }
    if (ehErroDeCampo(resultado)) {
      const campo = CAMPO_DO_ERRO[resultado.motivo];
      setErros({ [campo]: MENSAGENS[campo] });
      refs[campo].current?.focus();
      return;
    }
    setFase({ tipo: "recusa", recusa: resultado });
  }

  return (
    <PageShell>
      <Hero
        eyebrow="Céus Abertos 26’ · Link Church"
        titleLight={
          <>
            <strong>sa</strong>la
          </>
        }
        titleStrong="Profética"
      >
        <p>
          Entre na fila <em>online</em>. Quando for a sua vez, a gente te chama pelo WhatsApp.
        </p>
      </Hero>

      <Window aria-live="polite">
        {fase.tipo === "formulario" && (
          <form className="stack stack-lg" onSubmit={enviar} noValidate>
            <TextField
              ref={refs.nome}
              label="Nome"
              hint="Nome e sobrenome."
              name="nome"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              maxLength={200}
              value={nome}
              error={erros.nome}
              onChange={(e) => {
                setNome(e.target.value);
                validarAoDigitar("nome", e.target.value);
              }}
              onBlur={(e) => validarAoSair("nome", e.target.value)}
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
                const mascarado = mascararTelefone(e.target.value);
                setTelefone(mascarado);
                validarAoDigitar("telefone", mascarado);
              }}
              onBlur={(e) => validarAoSair("telefone", e.target.value)}
            />

            <TextField
              ref={refs.email}
              label="E-mail"
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
                validarAoDigitar("email", e.target.value);
              }}
              onBlur={(e) => validarAoSair("email", e.target.value)}
            />

            <Checkbox
              name="aceita_comunicacao"
              checked={aceita}
              onChange={(e) => setAceita(e.target.checked)}
              label="Aceito receber comunicações da Link Church sobre eventos futuros pelo WhatsApp ou e-mail."
              description={
                <>
                  Sem marcar, seu número e e-mail só são usados para a Sala Profética de hoje.{" "}
                  <a href="/privacidade/" target="_blank" rel="noopener noreferrer">
                    Política de Privacidade
                  </a>
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
            <Stat label="Posição" value={`#${fase.posicao}`} />
            <p>
              Salve seu ingresso: ele é a confirmação da sua inscrição. Na entrada, a equipe confere pelo seu
              e-mail.
            </p>
            <p>
              Quando chegar a mensagem avisando que é <strong>a sua vez</strong>, você terá{" "}
              <strong>10 minutos</strong> para chegar à Sala Profética.
            </p>
            <AvisoLocal />
            <BotaoIngresso
              nome={fase.nome}
              email={fase.email}
              posicao={fase.posicao}
              diaEvento={fase.diaEvento}
            />
          </div>
        )}

        {fase.tipo === "recusa" && (
          <TelaRecusa recusa={fase.recusa} onUsarOutroNumero={() => setFase({ tipo: "formulario" })} />
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
