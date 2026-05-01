-- Migração: Adiciona suporte a notas fixadas (Fase 1)
-- Execute este script no painel SQL do Supabase

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice opcional para melhorar performance na ordenação
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes (user_id, is_pinned);
