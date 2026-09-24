const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

// Datas vindas da RPC são "YYYY-MM-DD" no fuso de Belém; meio-dia evita virar o dia ao converter.
function paraData(dia: string): Date {
  return new Date(`${dia}T12:00:00`);
}

function hojeEmBelem(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Belem" }).format(new Date());
}

export function diaDaSemana(dia: string): string {
  return DIAS_SEMANA[paraData(dia).getDay()];
}

/** "sábado, 26/09" */
export function formatarDia(dia: string): string {
  const d = paraData(dia);
  return `${diaDaSemana(dia)}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "sábado, 26/09" ou "amanhã, sábado, 26/09" */
export function descreverDia(dia: string): string {
  const diferenca = Math.round((paraData(dia).getTime() - paraData(hojeEmBelem()).getTime()) / 86_400_000);
  return diferenca === 1 ? `amanhã, ${formatarDia(dia)}` : formatarDia(dia);
}

/** "08:50" -> "8h50"; "00:00" -> null (dia inteiro) */
export function descreverHora(hora: string | null): string | null {
  if (!hora || hora === "00:00") return null;
  const [h, m] = hora.split(":").map(Number);
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
