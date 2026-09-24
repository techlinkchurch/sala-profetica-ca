import { useEffect, useState } from "react";
import { Button } from "./design-system";
import { gerarIngresso, salvarIngresso, type DadosIngresso } from "./lib/ingresso";

export function BotaoIngresso(dados: DadosIngresso) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [falhou, setFalhou] = useState(false);

  // Gera antes do toque: o Safari só abre o menu de compartilhar se share() vier logo após o clique.
  useEffect(() => {
    let ativo = true;
    gerarIngresso(dados)
      .then((f) => ativo && setArquivo(f))
      .catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
    };
  }, [dados.nome, dados.email, dados.posicao, dados.diaEvento]);

  if (falhou) return null;

  return (
    <Button disabled={!arquivo} onClick={() => arquivo && salvarIngresso(arquivo)}>
      {arquivo ? "Salvar ingresso" : "Preparando ingresso…"}
    </Button>
  );
}
