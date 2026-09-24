import { formatarDia } from "./datas";

export type DadosIngresso = {
  nome: string;
  email: string;
  posicao: number;
  diaEvento: string;
};

const W = 1080;
const H = 1920;
const MARGEM = 80;
const FONTE = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';

const COR = {
  sky: "#86cadb",
  teal: "#3f8f85",
  sage: "#a6c9a2",
  petrol950: "#0a2f39",
  petrol900: "#0e3c46",
  petrol800: "#124b56",
  petrol700: "#16596a",
  petrol600: "#1d6475",
  cream200: "#e3dfd5",
  cream100: "#ece8df",
  cream50: "#f4f1ea",
};

function fonte(peso: number, tamanho: number) {
  return `${peso} ${tamanho}px ${FONTE}`;
}

// canvas.letterSpacing ainda não existe em todo Safari; espaçamento manual, letra a letra.
function textoEspacado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  espaco: number,
  alinhar: "left" | "right" = "left",
) {
  const larguras = [...texto].map((c) => ctx.measureText(c).width);
  const total = larguras.reduce((a, b) => a + b, 0) + espaco * (larguras.length - 1);
  let cx = alinhar === "right" ? x - total : x;
  ctx.textAlign = "left";
  [...texto].forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += larguras[i] + espaco;
  });
}

function tamanhoQueCabe(ctx: CanvasRenderingContext2D, texto: string, peso: number, max: number, largura: number, min: number) {
  let t = max;
  ctx.font = fonte(peso, t);
  while (t > min && ctx.measureText(texto).width > largura) {
    t -= 2;
    ctx.font = fonte(peso, t);
  }
  return t;
}

function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(" ")) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width <= largura || !atual) atual = teste;
    else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// E-mails longos não têm espaços: quebra por caractere quando não cabe nem no tamanho mínimo.
function quebrarPorCaractere(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const c of texto) {
    if (ctx.measureText(atual + c).width > largura && atual) {
      linhas.push(atual);
      atual = c;
    } else atual += c;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function retanguloArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function desenharFundo(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, W * 0.55, H * 0.8);
  g.addColorStop(0, COR.sky);
  g.addColorStop(0.28, COR.teal);
  g.addColorStop(0.5, COR.petrol800);
  g.addColorStop(0.75, COR.petrol900);
  g.addColorStop(1, COR.petrol950);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = COR.petrol700;
  ctx.lineWidth = 110;
  ctx.beginPath();
  ctx.arc(-40, -40, 300, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = COR.sage;
  ctx.translate(W - 330, 110);
  ctx.scale(1.9, 1.9);
  const chevron = new Path2D("M0 0 L80 60 L0 120 L0 88 L38 60 L0 32 Z M100 0 L180 60 L100 120 L100 88 L138 60 L100 32 Z");
  ctx.fill(chevron);
  ctx.restore();

  return g;
}

function desenharCabecalho(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COR.petrol900;
  ctx.font = fonte(700, 28);
  textoEspacado(ctx, "CÉUS ABERTOS 26’ · LINK CHURCH", W - MARGEM, 300, 5, "right");

  ctx.fillStyle = COR.cream100;
  ctx.textBaseline = "alphabetic";
  ctx.font = fonte(900, 120);
  ctx.textAlign = "left";
  ctx.fillText("sa", MARGEM, 450);
  const larguraSa = ctx.measureText("sa").width;
  ctx.font = fonte(300, 120);
  ctx.fillText("la", MARGEM + larguraSa - 4, 450);

  tamanhoQueCabe(ctx, "PROFÉTICA", 900, 220, W - MARGEM * 2, 120);
  ctx.fillText("PROFÉTICA", MARGEM - 6, 620);
}

function desenharCartao(ctx: CanvasRenderingContext2D, fundo: CanvasGradient, dados: DadosIngresso) {
  const x = MARGEM;
  const y = 700;
  const w = W - MARGEM * 2;
  const h = 1030;
  const pad = 64;
  const larguraTexto = w - pad * 2;

  ctx.save();
  ctx.shadowColor = "rgba(6, 30, 36, 0.45)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = COR.cream200;
  retanguloArredondado(ctx, x, y, w, h, 64);
  ctx.fill();
  ctx.restore();

  ctx.save();
  retanguloArredondado(ctx, x, y, w, h, 64);
  ctx.clip();
  ctx.fillStyle = COR.cream50;
  ctx.fillRect(x, y, w, 110);
  ctx.restore();

  [COR.sky, COR.petrol600, COR.petrol800].forEach((cor, i) => {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x + pad + i * 46, y + 55, 14, 0, Math.PI * 2);
    ctx.fill();
  });

  let cy = y + 200;
  ctx.fillStyle = COR.petrol700;
  ctx.font = fonte(700, 28);
  textoEspacado(ctx, `INGRESSO · ${formatarDia(dados.diaEvento).toUpperCase()}`, x + pad, cy, 5);

  cy += 120;
  ctx.fillStyle = COR.petrol900;
  ctx.font = fonte(300, 110);
  ctx.textAlign = "left";
  ctx.fillText("Posição", x + pad - 4, cy);
  const larguraPosicao = ctx.measureText("Posição ").width;
  ctx.font = fonte(900, 110);
  ctx.fillText(`#${dados.posicao}`, x + pad - 4 + larguraPosicao, cy);

  // picote do ingresso: linha tracejada com os recortes laterais pintados com o fundo
  cy += 80;
  ctx.fillStyle = fundo;
  [x, x + w].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(22, 89, 106, 0.35)";
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.moveTo(x + 60, cy);
  ctx.lineTo(x + w - 60, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  cy += 110;
  ctx.fillStyle = COR.petrol700;
  ctx.font = fonte(700, 26);
  textoEspacado(ctx, "NOME", x + pad, cy, 5);
  ctx.fillStyle = COR.petrol900;
  ctx.font = fonte(800, 58);
  ctx.textAlign = "left";
  for (const linha of quebrarLinhas(ctx, dados.nome, larguraTexto).slice(0, 2)) {
    cy += 70;
    ctx.fillText(linha, x + pad, cy);
  }

  cy += 90;
  ctx.fillStyle = COR.petrol700;
  ctx.font = fonte(700, 26);
  textoEspacado(ctx, "E-MAIL", x + pad, cy, 5);
  ctx.fillStyle = COR.petrol900;
  const tamanhoEmail = tamanhoQueCabe(ctx, dados.email, 600, 46, larguraTexto, 32);
  for (const linha of quebrarPorCaractere(ctx, dados.email, larguraTexto).slice(0, 2)) {
    cy += tamanhoEmail + 12;
    ctx.fillText(linha, x + pad, cy);
  }

  const aviso = { x: x + pad, y: y + h - 64 - 170, w: larguraTexto, h: 170 };
  ctx.fillStyle = "rgba(134, 202, 219, 0.3)";
  retanguloArredondado(ctx, aviso.x, aviso.y, aviso.w, aviso.h, 24);
  ctx.fill();
  ctx.fillStyle = COR.petrol700;
  ctx.fillRect(aviso.x, aviso.y, 8, aviso.h);
  ctx.font = fonte(700, 24);
  textoEspacado(ctx, "ONDE FICA A SALA PROFÉTICA", aviso.x + 40, aviso.y + 60, 4);
  ctx.fillStyle = COR.petrol900;
  ctx.font = fonte(500, 34);
  ctx.fillText("Prédio 2, em frente ao prédio", aviso.x + 40, aviso.y + 108);
  ctx.fillText("da conferência.", aviso.x + 40, aviso.y + 148);
}

function desenharRodape(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(236, 232, 223, 0.8)";
  ctx.font = fonte(400, 34);
  ctx.textAlign = "center";
  ctx.fillText("Apresente este ingresso e confirme", W / 2, 1810);
  ctx.fillText("seu e-mail com a nossa equipe.", W / 2, 1856);
}

export async function gerarIngresso(dados: DadosIngresso): Promise<File> {
  await Promise.all([
    document.fonts.load(fonte(300, 40)),
    document.fonts.load(fonte(400, 40)),
    document.fonts.load(fonte(500, 40)),
    document.fonts.load(fonte(600, 40)),
    document.fonts.load(fonte(700, 40)),
    document.fonts.load(fonte(800, 40)),
    document.fonts.load(fonte(900, 40)),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const fundo = desenharFundo(ctx);
  desenharCabecalho(ctx);
  desenharCartao(ctx, fundo, dados);
  desenharRodape(ctx);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falha ao gerar a imagem"))), "image/png"),
  );
  return new File([blob], "ingresso-sala-profetica.png", { type: "image/png" });
}

// No celular abre o menu de compartilhar ("Salvar imagem"); no computador, baixa o arquivo direto,
// mesmo que o navegador (ex.: Edge no Windows) também tenha menu de compartilhar.
export async function salvarIngresso(arquivo: File): Promise<void> {
  const ehCelular = window.matchMedia("(pointer: coarse)").matches;
  if (ehCelular && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: "Ingresso · Sala Profética" });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
