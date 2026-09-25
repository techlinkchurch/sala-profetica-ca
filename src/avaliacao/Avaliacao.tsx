import { useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Checkbox,
  ChoiceGroup,
  Eyebrow,
  Hero,
  PageShell,
  TextArea,
  TextField,
  Window,
  type Choice,
} from "../design-system";
import { enviarAvaliacao, LIMITE_TESTEMUNHO, type Formato, type Palavra } from "../lib/avaliacao";
import { mascararTelefone } from "../lib/telefone";
import { validarCampo } from "../lib/validacao";
import "./Avaliacao.css";

const OPCOES_PALAVRA: Choice<Palavra>[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "quero_contar", label: "Quero contar mais" },
];

const OPCOES_FORMATO: Choice<Formato>[] = [
  { value: "sim", label: "Sim" },
  { value: "mais_ou_menos", label: "Mais ou menos" },
  { value: "nao", label: "Não" },
];

const ESCOLHA_OBRIGATORIA = "Escolha uma opção.";
// O erro do WhatsApp só aparece depois de uma pausa na digitação, para não piscar a cada tecla.
const ATRASO_ERRO_MS = 600;

type Erros = { palavra?: string; formato?: string; contato?: string };

export function Avaliacao() {
  const [palavra, setPalavra] = useState<Palavra | null>(null);
  const [formato, setFormato] = useState<Formato | null>(null);
  const [testemunho, setTestemunho] = useState("");
  const [autoriza, setAutoriza] = useState(false);
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const refTestemunho = useRef<HTMLTextAreaElement>(null);
  const refPalavra = useRef<HTMLDivElement>(null);
  const refFormato = useRef<HTMLDivElement>(null);
  const refContato = useRef<HTMLInputElement>(null);
  const timerContato = useRef<number | undefined>(undefined);

  const temTestemunho = testemunho.trim().length > 0;

  function validarContato(valor: string) {
    return valor.trim() === "" ? undefined : validarCampo("telefone", valor);
  }

  function aoDigitarContato(valor: string) {
    const mascarado = mascararTelefone(valor);
    setContato(mascarado);
    window.clearTimeout(timerContato.current);
    const erro = validarContato(mascarado);
    if (!erro) {
      setErros((e) => ({ ...e, contato: undefined }));
      return;
    }
    timerContato.current = window.setTimeout(() => setErros((e) => ({ ...e, contato: erro })), ATRASO_ERRO_MS);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    window.clearTimeout(timerContato.current);

    const novos: Erros = {
      palavra: palavra ? undefined : ESCOLHA_OBRIGATORIA,
      formato: formato ? undefined : ESCOLHA_OBRIGATORIA,
      contato: temTestemunho ? validarContato(contato) : undefined,
    };
    setErros(novos);
    setFalha(null);
    if (novos.palavra) return refPalavra.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (novos.contato) return refContato.current?.focus();
    if (novos.formato || !palavra || !formato)
      return refFormato.current?.scrollIntoView({ behavior: "smooth", block: "center" });

    setEnviando(true);
    const resultado = await enviarAvaliacao({
      palavra,
      formato,
      testemunho,
      autorizaCompartilhar: temTestemunho && autoriza,
      nome: temTestemunho ? nome : "",
      contato: temTestemunho ? contato : "",
    });
    setEnviando(false);

    if (!resultado) return setFalha("Não conseguimos enviar agora. Verifique sua conexão e tente de novo.");
    if (resultado.ok) return setEnviado(true);
    if (resultado.motivo === "contato_invalido") {
      setErros((er) => ({ ...er, contato: validarCampo("telefone", "") }));
      return refContato.current?.focus();
    }
    setFalha(
      resultado.motivo === "texto_longo"
        ? "Seu texto ficou maior do que o permitido. Resuma um pouco e tente de novo."
        : "Confira as respostas e tente de novo.",
    );
  }

  return (
    <PageShell>
      <Hero eyebrow="Céus Abertos 26’ · Link Church" titleLight="conte sua" titleStrong="Experiência" size="md">
        <p>
          Leva menos de <em>1 minuto</em>. Sua resposta ajuda a gente a cuidar melhor de cada pessoa na Sala
          Profética.
        </p>
      </Hero>

      <Window aria-live="polite">
        {enviado ? (
          <div className="avaliacao-obrigado">
            <Eyebrow>Avaliação enviada</Eyebrow>
            <h2 className="avaliacao-obrigado-titulo">Obrigado por compartilhar!</h2>
            <p>
              {temTestemunho && autoriza
                ? "Seu testemunho vai abençoar outras pessoas. Se precisarmos de algum detalhe, a nossa equipe entra em contato."
                : "Sua resposta já chegou para a nossa equipe."}
            </p>
            <p>
              Lembre-se: <strong>Deus continua falando</strong>. Aproveite cada momento da conferência!
            </p>
          </div>
        ) : (
          <form className="avaliacao-form" onSubmit={enviar} noValidate>
            <div ref={refPalavra}>
              <ChoiceGroup
                legend="A palavra que você recebeu fez sentido para você?"
                options={OPCOES_PALAVRA}
                value={palavra}
                error={erros.palavra}
                onChange={(v) => {
                  setPalavra(v);
                  setErros((e) => ({ ...e, palavra: undefined }));
                  if (v === "quero_contar") window.setTimeout(() => refTestemunho.current?.focus(), 50);
                }}
              />
            </div>

            <div className="avaliacao-bloco">
              <TextArea
                ref={refTestemunho}
                label="Quer compartilhar seu testemunho?"
                optional
                hint={
                  palavra === "quero_contar"
                    ? "Conte com as suas palavras o que Deus falou com você."
                    : "Conte como foi a sua experiência na Sala Profética."
                }
                maxLength={LIMITE_TESTEMUNHO}
                counter
                value={testemunho}
                onChange={(e) => setTestemunho(e.target.value)}
              />

              {temTestemunho && (
                <>
                  <Checkbox
                    checked={autoriza}
                    onChange={(e) => setAutoriza(e.target.checked)}
                    label="Autorizo a Link Church a compartilhar meu testemunho."
                    description="Sem marcar, ele fica só com a nossa equipe."
                  />
                  <TextField
                    label="Seu nome"
                    optional
                    name="nome"
                    autoComplete="name"
                    autoCapitalize="words"
                    maxLength={120}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                  <TextField
                    ref={refContato}
                    label="WhatsApp"
                    optional
                    hint="Se quiser que a equipe fale com você sobre o testemunho."
                    name="contato"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(91) 99999-9999"
                    value={contato}
                    error={erros.contato}
                    onChange={(e) => aoDigitarContato(e.target.value)}
                    onBlur={(e) => {
                      window.clearTimeout(timerContato.current);
                      setErros((er) => ({ ...er, contato: validarContato(e.target.value) }));
                    }}
                  />
                </>
              )}
            </div>

            <div ref={refFormato}>
              <ChoiceGroup
                legend="Você gostou de entrar na fila pelo QR Code?"
                options={OPCOES_FORMATO}
                value={formato}
                error={erros.formato}
                onChange={(v) => {
                  setFormato(v);
                  setErros((e) => ({ ...e, formato: undefined }));
                }}
              />
            </div>

            {falha && <Alert>{falha}</Alert>}

            <Button type="submit" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar avaliação"}
            </Button>
          </form>
        )}
      </Window>
    </PageShell>
  );
}
