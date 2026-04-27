import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Cliente Supabase — lado cliente (browser)
//
// A chave usada aqui é a "publishable/anon" — projetada para ser pública.
// A segurança dos dados é garantida pelo Row Level Security (RLS) no banco,
// que garante que cada usuário só acessa seus próprios dados.
//
// A SUPABASE_SERVICE_ROLE_KEY (secreta) é usada APENAS no server.ts
// ─────────────────────────────────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Notas Vivas] Variáveis de ambiente Supabase não configuradas.\n' +
    'Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão no arquivo .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
