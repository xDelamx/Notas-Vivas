import React from 'react';
import { motion, useDragControls, Reorder } from 'motion/react';
import { Edit2, Archive, RotateCcw, CheckCircle2, Circle, GripVertical, Bell, Share2 } from 'lucide-react';
import { Note } from '../types';
import { useTranslation } from 'react-i18next';

export const getCategoryStyles = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('compra')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500' };
  if (t.includes('tarefa')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-500' };
  if (t.includes('ideia')) return { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', accent: 'bg-violet-500' };
  if (t.includes('lembrete')) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: 'bg-amber-500' };
  return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', accent: 'bg-slate-500' };
};

interface NoteCardProps {
  note: Note;
  setEditingNote: (note: Note) => void;
  archiveNote: (id: string) => void;
  restoreNote: (id: string) => void;
  toggleItemCompletion: (noteId: string, itemId: string) => void;
  onShare: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, setEditingNote, archiveNote, restoreNote, toggleItemCompletion, onShare }) => {
  const { t } = useTranslation();
  const controls = useDragControls();
  const styles = getCategoryStyles(note.type);

  return (
    <Reorder.Item
      value={note}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-sm shadow-sm border border-gray-100 p-6 md:p-8 transition-colors relative overflow-hidden group ${
        note.status === 'completed' ? 'opacity-90 bg-gray-50' : ''
      }`}
    >
      <div className={`absolute top-0 left-0 w-full h-1 ${styles.accent}`} />
      
      {/* Absolute positioned action buttons */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
        {note.status === 'active' && (
          <button
            onClick={() => setEditingNote(note)}
            className="p-1.5 text-gray-400 hover:text-brand-gold hover:bg-gray-50 rounded transition-all"
            title={t('edit')}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => note.status === 'active' || note.status === 'completed' ? archiveNote(note.id) : restoreNote(note.id)}
          className="p-1.5 text-gray-400 hover:text-brand-gold hover:bg-gray-50 rounded transition-all"
          title={note.status === 'active' || note.status === 'completed' ? t('archive') : t('unarchive')}
        >
          {note.status === 'active' || note.status === 'completed' ? (
            <Archive className="w-4 h-4" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onShare(note)}
          className="p-1.5 text-gray-400 hover:text-brand-gold hover:bg-gray-50 rounded transition-all"
          title={t('share')}
        >
          <Share2 className="w-4 h-4" />
        </button>
        <div 
          onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
          }}
          style={{ touchAction: 'none' }}
          className="cursor-grab active:cursor-grabbing p-1.5 text-gray-400 hover:text-brand-gold hover:bg-gray-50 rounded transition-all"
          title="Reordenar (Arraste)"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      <div className="pr-20 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className={`font-serif text-xl md:text-2xl font-semibold ${note.status === 'completed' ? 'text-gray-400' : 'text-brand-brown'}`}>
            {note.title}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {note.status === 'completed' && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded text-emerald-700 bg-emerald-50">
              <CheckCircle2 className="w-3 h-3" /> {t('completed')}
            </span>
          )}
          {note.status === 'archived' && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded text-gray-600 bg-gray-100">
              <Archive className="w-3 h-3" /> {t('archived')}
            </span>
          )}
          <span className={`inline-block text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded ${styles.bg} ${styles.text}`}>
            {t(note.type.toLowerCase(), { defaultValue: note.type })}
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest text-brand-brown/40">
            • Criada: {new Date(note.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
          {note.completedAt && (
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-600/60">
              • Concluída: {new Date(note.completedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          )}
          {note.deadline && note.status !== 'completed' && (
            <span className={`text-[10px] uppercase font-mono tracking-widest flex items-center gap-1 ${note.deadline < Date.now() ? 'text-red-600 font-bold' : 'text-brand-brown/60'}`}>
              • Prazo: {new Date(note.deadline).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              {note.deadlineNotification && <Bell className="w-3 h-3 ml-0.5" />}
            </span>
          )}
        </div>
      </div>

      {note.items.length > 0 ? (
        <ul className="space-y-4 mt-6">
          {note.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-4 group cursor-pointer"
              onClick={() => toggleItemCompletion(note.id, item.id)}
            >
              <button className="mt-1 text-gray-300 group-hover:text-brand-gold transition-colors focus:outline-none">
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-brand-gold" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <span
                className={`text-lg transition-all font-serif ${
                  item.completed ? 'line-through text-gray-400 italic' : 'text-brand-brown font-medium'
                }`}
              >
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 text-brand-brown/60 font-serif italic text-lg">
          {note.originalText}
        </div>
      )}
    </Reorder.Item>
  );
};
