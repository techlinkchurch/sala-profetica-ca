import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { EstadoPainel } from "./contrato";
import { supabasePainel } from "./supabasePainel";

const POLLING_MS = 15_000; // rede de segurança: o Wi-Fi do local é instável e o Realtime pode cair
const DEBOUNCE_MS = 300; // um check-out gera várias mudanças seguidas (concluído + próximo chamado)

export type Conexao = "carregando" | "ao_vivo" | "reconectando";

export function useEstadoPainel() {
  const [estado, setEstado] = useState<EstadoPainel | null>(null);
  const [semAcesso, setSemAcesso] = useState(false);
  const [falhouUltima, setFalhouUltima] = useState(false);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);

  const ultimaPedida = useRef(0);
  const ultimaAplicada = useRef(0);

  const atualizar = useCallback(async () => {
    const minha = ++ultimaPedida.current;
    const r = await api.estado();
    // Respostas fora de ordem (rede lenta) não podem sobrescrever um estado mais novo.
    if (minha < ultimaAplicada.current) return;
    ultimaAplicada.current = minha;
    if (!r) {
      setFalhouUltima(true);
      return;
    }
    setFalhouUltima(false);
    if (!r.ok) {
      if (r.motivo === "nao_autorizado") setSemAcesso(true);
      return;
    }
    setSemAcesso(false);
    setEstado(r);
    setAtualizadoEm(Date.now());
  }, []);

  // Primeira carga + polling + retomada quando a aba volta ou a rede volta.
  useEffect(() => {
    void atualizar();
    const intervalo = window.setInterval(() => void atualizar(), POLLING_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void atualizar();
    };
    window.addEventListener("online", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("online", aoVoltar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [atualizar]);

  // Realtime: qualquer mudança na fila do dia ou na sessão da sala dispara um refetch (com debounce).
  const dia = estado?.dia;
  useEffect(() => {
    if (!dia) return;
    let timer: number | undefined;
    const agendar = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void atualizar(), DEBOUNCE_MS);
    };
    const canal = supabasePainel
      .channel(`painel-${dia}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_sala_profetica", filter: `dia_evento=eq.${dia}` },
        agendar,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "sessoes_sala" }, agendar)
      .subscribe((status) => {
        const ok = status === "SUBSCRIBED";
        setRealtimeOk(ok);
        // Ao (re)conectar, pode ter perdido eventos no meio do caminho.
        if (ok) agendar();
      });
    return () => {
      window.clearTimeout(timer);
      setRealtimeOk(false);
      void supabasePainel.removeChannel(canal);
    };
  }, [dia, atualizar]);

  const conexao: Conexao = !estado && !falhouUltima ? "carregando" : !falhouUltima && realtimeOk ? "ao_vivo" : "reconectando";

  return { estado, semAcesso, falhouUltima, conexao, atualizadoEm, atualizar };
}

/** Relógio compartilhado: um único intervalo de 1s para todos os semáforos. */
export function useAgora(intervaloMs = 1000): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return agora;
}
