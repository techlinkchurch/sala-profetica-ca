import { createClient } from "@supabase/supabase-js";

// Cliente só do painel: aqui a sessão do coordenador precisa sobreviver a um recarregamento da página.
// O formulário público usa outro cliente (src/lib/supabase.ts), sem sessão persistida.
// Só a chave publishable vai para o navegador; quem decide o acesso é o banco (is_staff() nas RPCs).
export const supabasePainel = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "sala-profetica-painel-auth",
    },
  },
);

/** Logout: remove os canais do Realtime e a sessão local, mesmo se a rede falhar no meio. */
export async function sair() {
  await supabasePainel.removeAllChannels().catch(() => undefined);
  const { error } = await supabasePainel.auth.signOut().catch((e: unknown) => ({ error: e }));
  if (error) await supabasePainel.auth.signOut({ scope: "local" }).catch(() => undefined);
}
