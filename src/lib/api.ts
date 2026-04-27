import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// authFetch — wrapper autenticado para chamadas à API do servidor (tarefa 1.3.5)
//
// Inclui automaticamente o header Authorization: Bearer <JWT> em todas as
// requisições aos endpoints /api/*. Isso permite que o servidor valide a
// identidade do usuário e rejeite chamadas não autenticadas com HTTP 401.
// ─────────────────────────────────────────────────────────────────────────────

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return fetch(url, { ...options, headers });
}
