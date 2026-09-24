import { Hero, NumberedSection, PageShell, Prose, Window } from "../design-system";
import "./PoliticaPrivacidade.css";

const EMAIL_CONTATO = "linkcentrocity@gmail.com";

export function PoliticaPrivacidade() {
  return (
    <PageShell>
      <Hero eyebrow="Sala Profética · Link Church" titleLight="Política de" titleStrong="Privacidade" size="md">
        <p>Última atualização: 23 de setembro de 2026</p>
      </Hero>

      <Window>
        <div className="privacidade-intro">
          <Prose>
            <p>
              Esta página explica, de forma direta, quais dados coletamos quando você se cadastra na fila da Sala
              Profética, para que servem e como você pode pedir a remoção deles a qualquer momento.
            </p>
          </Prose>
        </div>

        <NumberedSection number={1} title="Quem somos">
          <Prose>
            <p>
              Esta política se aplica ao sistema de fila da Sala Profética, um serviço da Link Church usado durante
              conferências e eventos para organizar o atendimento por ordem de chegada, via cadastro por QR Code e
              confirmação pelo WhatsApp.
            </p>
          </Prose>
        </NumberedSection>

        <NumberedSection number={2} title="Quais dados coletamos">
          <Prose>
            <p>Quando você preenche o formulário de cadastro, coletamos:</p>
            <ul>
              <li>
                <strong>Nome</strong> — para chamarmos você quando chegar sua vez.
              </li>
              <li>
                <strong>Telefone (WhatsApp)</strong> — para confirmar sua entrada na fila e avisar quando estiver
                perto da sua vez.
              </li>
              <li>
                <strong>E-mail</strong> — para contato sobre o seu cadastro e, se você autorizar, para comunicações
                futuras.
              </li>
            </ul>
            <p>Não coletamos nenhum outro dado além do que você mesmo informa no formulário.</p>
          </Prose>
        </NumberedSection>

        <NumberedSection number={3} title="Para que usamos seus dados">
          <Prose>
            <ul>
              <li>Organizar e gerenciar a fila de atendimento do dia do evento.</li>
              <li>Enviar mensagens de WhatsApp confirmando seu cadastro e avisando quando sua vez estiver próxima.</li>
              <li>
                Se você optar por isso no cadastro, enviar comunicações futuras da Link Church (convites de eventos,
                lembretes) — esse envio só acontece se você marcar essa opção explicitamente.
              </li>
            </ul>
          </Prose>
        </NumberedSection>

        <NumberedSection number={4} title="Base legal">
          <Prose>
            <p>
              Tratamos seus dados com base no seu consentimento, dado no momento do cadastro, conforme a Lei Geral de
              Proteção de Dados (LGPD — Lei nº 13.709/2018). O envio de comunicações futuras depende de um
              consentimento à parte, marcado separadamente no formulário.
            </p>
          </Prose>
        </NumberedSection>

        <NumberedSection number={5} title="Com quem compartilhamos">
          <Prose>
            <p>
              Seus dados não são vendidos nem compartilhados com terceiros para fins comerciais. Eles ficam
              armazenados em nossa infraestrutura (Supabase) e são usados exclusivamente para o funcionamento do
              sistema de fila e, quando autorizado, para o envio de mensagens pela API oficial do WhatsApp (Meta).
            </p>
          </Prose>
        </NumberedSection>

        <NumberedSection number={6} title="Por quanto tempo guardamos">
          <Prose>
            <p>
              Os dados de fila de um evento específico ficam associados àquele dia. O cadastro base (nome, telefone,
              e-mail) permanece até que você solicite a remoção, ou pelo tempo necessário para as finalidades
              descritas acima.
            </p>
          </Prose>
        </NumberedSection>

        <NumberedSection number={7} title="Seus direitos">
          <Prose>
            <p>Você pode, a qualquer momento:</p>
            <ul>
              <li>Pedir para saber quais dados temos sobre você.</li>
              <li>Pedir a correção de dados incorretos.</li>
              <li>Pedir a exclusão completa do seu cadastro.</li>
              <li>Revogar o consentimento para comunicações futuras, mesmo que tenha aceitado antes.</li>
            </ul>
            <p>Basta entrar em contato pelo canal abaixo.</p>
          </Prose>
        </NumberedSection>

        <NumberedSection number={8} title="Contato">
          <Prose>
            <p>
              <strong>Responsável:</strong> Link Church
              <br />
              <strong>E-mail:</strong> <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>
            </p>
          </Prose>
        </NumberedSection>
      </Window>

      <p className="privacidade-voltar">
        <a href="/">Ir para o cadastro da fila</a>
      </p>
    </PageShell>
  );
}
