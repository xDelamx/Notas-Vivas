import { v4 as uuidv4 } from 'uuid';
import { authFetch } from '../lib/api';

export interface ParsedNote {
  type: string;
  title: string;
  items: { id: string; text: string; completed: boolean }[];
  checkInSeconds: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  followUpStrategy: 'app' | 'whatsapp' | 'call' | 'notification';
  summary: string;
  needsDeadline: boolean;
}

/**
 * Envia o texto da nota ao servidor, que chama o Gemini internamente.
 * Nunca expõe a chave de API no cliente.
 */
export async function parseNote(text: string, currentTime: string, language: string = 'pt-BR'): Promise<ParsedNote> {
  try {
    const response = await authFetch('/api/parse-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, timeStr: currentTime, language }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Erro do servidor: ${response.status}`);
    }

    const parsed = await response.json();

    return {
      type: parsed.type || 'Outro',
      title: parsed.title || 'Nota sem título',
      items: (parsed.items || []).map((item: { text?: string }) => ({
        id: uuidv4(),
        text: item.text || 'Item',
        completed: false,
      })),
      checkInSeconds: parsed.checkInSeconds || 1800,
      urgency: (parsed.urgency as ParsedNote['urgency']) || 'low',
      followUpStrategy: (parsed.followUpStrategy as ParsedNote['followUpStrategy']) || 'app',
      summary: parsed.summary || 'Nota processada.',
      needsDeadline: !!parsed.needsDeadline,
    };
  } catch (e) {
    console.error('Erro no parseNote:', e);
    // Fallback gracioso: salva a nota sem processamento de IA
    return {
      type: 'Outro',
      title: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
      items: [],
      checkInSeconds: 1800,
      urgency: 'low',
      followUpStrategy: 'app',
      summary: 'O assistente teve dificuldade em analisar esta nota, mas ela foi salva.',
      needsDeadline: false,
    };
  }
}

/**
 * Envia o áudio em base64 ao servidor, que usa o Gemini para transcrever.
 * Nunca expõe a chave de API no cliente.
 */
export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
  const response = await authFetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64Audio, mimeType }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Erro ao transcrever: ${response.status}`);
  }

  const data = await response.json();
  return data.transcription || '';
}
