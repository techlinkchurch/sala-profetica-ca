import type { ReactNode } from "react";
import { AvisoLocal } from "./AvisoLocal";
import { Button, Eyebrow } from "./design-system";
import { descreverDia, descreverHora, diaDaSemana } from "./lib/datas";
import type { ErroDeCampo, Recusa } from "./lib/inscricao";

export type RecusaEmTela = Exclude<Recusa, { motivo: ErroDeCampo }>;

type Props = {
  recusa: RecusaEmTela;
  onUsarOutroNumero: () => void;
};

function Tela({ eyebrow, titulo, children }: { eyebrow: string; titulo: string; children: ReactNode }) {
  return (
    <div className="stack">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="result-title">{titulo}</h2>
      {children}
    </div>
  );
}

function quando(dia: string, hora: string | null): string {
  const h = descreverHora(hora);
  return h ? `${descreverDia(dia)}, a partir das ${h}` : descreverDia(dia);
}

export function TelaRecusa({ recusa, onUsarOutroNumero }: Props) {
  const outroNumero = (
    <Button variant="ghost" onClick={onUsarOutroNumero}>
      Usar outro número
    </Button>
  );

  switch (recusa.motivo) {
    case "ja_inscrito":
      return (
        <Tela eyebrow="Tudo certo" titulo="Você já está na fila de hoje com esse número.">
          <p>Fique de olho no WhatsApp: a gente te chama quando for a sua vez.</p>
          <AvisoLocal />
          {outroNumero}
        </Tela>
      );

    case "ja_participou":
      return (
        <Tela
          eyebrow="Inscrição já feita"
          titulo={`Esse número já foi inscrito na Sala Profética de ${diaDaSemana(recusa.dia_inscrito)}.`}
        >
          <p>Para que mais pessoas tenham essa oportunidade, cada pessoa participa uma vez por conferência.</p>
          <p>Se você não conseguiu comparecer no dia da sua inscrição, fale com um de nossos staffs.</p>
          {outroNumero}
        </Tela>
      );

    case "ainda_nao_abriu":
      return (
        <Tela eyebrow="Quase lá" titulo={`As inscrições de hoje abrem às ${descreverHora(recusa.abre_as)}.`}>
          <p>Volte a partir desse horário para entrar na fila. As vagas são limitadas, então não demore!</p>
        </Tela>
      );

    case "fora_do_periodo":
      return recusa.proximo_dia ? (
        <Tela eyebrow="Em breve" titulo="As inscrições da Sala Profética ainda não abriram.">
          <p>
            Elas abrem <strong>{quando(recusa.proximo_dia, recusa.proximo_abre_as)}</strong>. Volte nesse dia
            para entrar na fila. As vagas são limitadas!
          </p>
        </Tela>
      ) : (
        <Tela eyebrow="Inscrições encerradas" titulo="As inscrições da Sala Profética desta conferência foram encerradas.">
          <p>Obrigado pelo interesse. Deus continua falando sempre, e Ele tem uma palavra para você!</p>
        </Tela>
      );

    case "vagas_esgotadas":
      return recusa.proximo_dia ? (
        <Tela eyebrow="Vagas de hoje preenchidas" titulo="As vagas de hoje acabaram, mas ainda tem outra chance!">
          <p>
            Tente de novo <strong>{quando(recusa.proximo_dia, recusa.proximo_abre_as)}</strong>. As vagas são
            limitadas, então chegue cedo!
          </p>
        </Tela>
      ) : (
        <Tela eyebrow="Vagas preenchidas" titulo="As vagas da Sala Profética desta conferência foram preenchidas.">
          <p>Dessa vez não deu, mas você ainda terá uma próxima oportunidade.</p>
          <p>
            E lembre-se: <strong>Deus continua falando sempre</strong>, aqui e agora. Se anime e viva cada
            momento da conferência, porque Ele tem coisas preparadas para você!
          </p>
        </Tela>
      );
  }
}
