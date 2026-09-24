import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button, Hero, PageShell, Window } from "../design-system";
import { Login } from "./Login";
import { sair, supabasePainel } from "./supabasePainel";
import { TelaPainel } from "./TelaPainel";
import { useEstadoPainel } from "./useEstadoPainel";
import "./Painel.css";

function Moldura({ lede, children }: { lede: ReactNode; children: ReactNode }) {
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
        size="md"
      >
        {lede}
      </Hero>
      <Window aria-live="polite">{children}</Window>
    </PageShell>
  );
}

function BotaoSair() {
  const [saindo, setSaindo] = useState(false);
  return (
    <Button
      variant="ghost"
      disabled={saindo}
      onClick={async () => {
        setSaindo(true);
        await sair();
      }}
    >
      {saindo ? "Saindo…" : "Sair"}
    </Button>
  );
}

function AreaLogada({ email }: { email: string }) {
  const painel = useEstadoPainel();

  if (painel.semAcesso) {
    return (
      <Moldura lede={<p>Painel da equipe.</p>}>
        <div className="painel-stack">
          <h2 className="painel-titulo-card">Sua conta não tem acesso ao painel</h2>
          <p>
            Você entrou como <strong>{email}</strong>, mas esse e-mail não está liberado para a equipe da Sala
            Profética. Fale com um administrador.
          </p>
          <BotaoSair />
        </div>
      </Moldura>
    );
  }

  if (!painel.estado) {
    return (
      <Moldura lede={<p>Painel da equipe.</p>}>
        {painel.falhouUltima ? (
          <div className="painel-stack">
            <h2 className="painel-titulo-card">Não conseguimos carregar o painel</h2>
            <p>Verifique a conexão. Vamos tentar de novo sozinhos a cada 15 segundos.</p>
            <Button onClick={() => void painel.atualizar()}>Tentar agora</Button>
            <BotaoSair />
          </div>
        ) : (
          <p className="painel-carregando">Carregando o painel…</p>
        )}
      </Moldura>
    );
  }

  return (
    <TelaPainel
      estado={painel.estado}
      conexao={painel.conexao}
      atualizadoEm={painel.atualizadoEm}
      atualizar={painel.atualizar}
      email={email}
      onSair={sair}
    />
  );
}

export function Painel() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let vivo = true;
    supabasePainel.auth.getSession().then(({ data }) => {
      if (vivo) setSessao(data.session);
    });
    const { data } = supabasePainel.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (sessao === undefined) {
    return (
      <Moldura lede={<p>Painel da equipe.</p>}>
        <p className="painel-carregando">Carregando…</p>
      </Moldura>
    );
  }

  if (!sessao) {
    return (
      <Moldura lede={<p>Painel da equipe. Entre com o e-mail e a senha que você recebeu.</p>}>
        <Login />
      </Moldura>
    );
  }

  // key: trocar de usuário zera todo o estado do painel.
  return <AreaLogada key={sessao.user.id} email={sessao.user.email ?? ""} />;
}
