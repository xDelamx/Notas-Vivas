import { useState, useEffect, useCallback } from 'react';
import { Note } from '../types';
import { authFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Helper: Converter do banco (snake_case) para o frontend (camelCase)
function mapDbToNote(dbNote: any): Note {
  return {
    id: dbNote.id,
    originalText: dbNote.original_text,
    title: dbNote.title,
    type: dbNote.type,
    items: dbNote.items || [],
    status: dbNote.status,
    urgency: dbNote.urgency,
    followUpStrategy: dbNote.follow_up_strategy,
    summary: dbNote.summary,
    checkInTime: dbNote.check_in_time ? Number(dbNote.check_in_time) : null,
    checkInPrompted: dbNote.check_in_prompted,
    deadline: dbNote.deadline ? Number(dbNote.deadline) : undefined,
    deadlineNotification: dbNote.deadline_notification,
    deadlineNotified: dbNote.deadline_notified,
    completedAt: dbNote.completed_at ? Number(dbNote.completed_at) : undefined,
    createdAt: new Date(dbNote.created_at).getTime(),
  };
}

// Helper: Converter do frontend (camelCase) para o banco (snake_case)
function mapNoteToDb(note: Partial<Note>): any {
  const dbNote: any = {};
  if (note.originalText !== undefined) dbNote.original_text = note.originalText;
  if (note.title !== undefined) dbNote.title = note.title;
  if (note.type !== undefined) dbNote.type = note.type;
  if (note.items !== undefined) dbNote.items = note.items;
  if (note.status !== undefined) dbNote.status = note.status;
  if (note.urgency !== undefined) dbNote.urgency = note.urgency;
  if (note.followUpStrategy !== undefined) dbNote.follow_up_strategy = note.followUpStrategy;
  if (note.summary !== undefined) dbNote.summary = note.summary;
  if (note.checkInTime !== undefined) dbNote.check_in_time = note.checkInTime;
  if (note.checkInPrompted !== undefined) dbNote.check_in_prompted = note.checkInPrompted;
  if (note.deadline !== undefined) dbNote.deadline = note.deadline;
  if (note.deadlineNotification !== undefined) dbNote.deadline_notification = note.deadlineNotification;
  if (note.deadlineNotified !== undefined) dbNote.deadline_notified = note.deadlineNotified;
  if (note.completedAt !== undefined) dbNote.completed_at = note.completedAt;
  return dbNote;
}

export function useNotes() {
  const { session } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const res = await authFetch('/api/notes');
      if (!res.ok) throw new Error('Falha ao carregar notas');
      const data = await res.json();
      setNotes(data.map(mapDbToNote));
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async (note: Omit<Note, 'id' | 'createdAt'>) => {
    try {
      const dbData = mapNoteToDb(note);
      
      // Otimista: adiciona na interface local com um ID temporário
      const tempId = crypto.randomUUID();
      const newNote = { ...note, id: tempId, createdAt: Date.now() } as Note;
      setNotes(prev => [newNote, ...prev]);

      const res = await authFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify(dbData)
      });
      if (!res.ok) throw new Error('Falha ao criar nota no banco');
      
      const createdDbNote = await res.json();
      const finalNote = mapDbToNote(createdDbNote);

      setNotes(prev => prev.map(n => n.id === tempId ? finalNote : n));
      return finalNote;
    } catch (err) {
      console.error(err);
      fetchNotes(); // Reverte a atualização otimista
      throw err;
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      // Otimista
      setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

      const dbData = mapNoteToDb(updates);
      const res = await authFetch(`/api/notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dbData)
      });
      if (!res.ok) throw new Error('Falha ao atualizar nota');
    } catch (err) {
      console.error(err);
      fetchNotes(); // Reverte
      throw err;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      // Otimista
      setNotes(prev => prev.filter(n => n.id !== id));

      const res = await authFetch(`/api/notes/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Falha ao excluir nota');
    } catch (err) {
      console.error(err);
      fetchNotes(); // Reverte
      throw err;
    }
  };

  return { notes, setNotes, loading, error, addNote, updateNote, deleteNote, refetch: fetchNotes };
}
