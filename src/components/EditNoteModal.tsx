import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Plus, Bell, BellOff } from 'lucide-react';
import { Note, NoteItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface EditNoteModalProps {
  note: Note;
  onClose: () => void;
  onSave: (updatedNote: Note) => void;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({ note, onClose, onSave }) => {
  const [title, setTitle] = useState(note.title);
  const [type, setType] = useState(note.type);
  const [items, setItems] = useState<NoteItem[]>(note.items);

  const formatDatetimeLocal = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [deadlineInput, setDeadlineInput] = useState(formatDatetimeLocal(note.deadline));
  const [deadlineNotification, setDeadlineNotification] = useState(!!note.deadlineNotification);

  const handleItemChange = (id: string, newText: string) => {
    setItems(items.map(item => item.id === id ? { ...item, text: newText } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const addItem = () => {
    setItems([...items, { id: uuidv4(), text: '', completed: false }]);
  };

  const handleSave = () => {
    onSave({
      ...note,
      title,
      type,
      items: items.filter(i => i.text.trim() !== ''),
      deadline: deadlineInput ? new Date(deadlineInput).getTime() : undefined,
      deadlineNotification,
      deadlineNotified: (deadlineInput !== formatDatetimeLocal(note.deadline)) ? false : note.deadlineNotified,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-sm shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-serif text-2xl font-semibold text-brand-brown">Editar Nota</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] tracking-widest text-brand-gold font-mono uppercase font-bold block mb-2">
                Título
              </label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-sm p-3 font-serif text-lg outline-none focus:border-brand-gold transition-colors text-brand-brown"
              />
            </div>

            <div>
              <label className="text-[10px] tracking-widest text-brand-gold font-mono uppercase font-bold block mb-2">
                Categoria / Tipo
              </label>
              <input 
                type="text" 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-sm p-3 font-mono text-sm outline-none focus:border-brand-gold transition-colors text-brand-brown"
              />
            </div>

            <div>
              <label className="text-[10px] tracking-widest text-brand-gold font-mono uppercase font-bold block mb-2">
                Prazo e Notificações
              </label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <input
                  type="datetime-local"
                  value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  className="w-full sm:flex-1 bg-gray-50 border border-gray-200 rounded-sm p-3 font-mono text-sm outline-none focus:border-brand-gold transition-colors text-brand-brown"
                />
                
                <button
                  type="button"
                  onClick={() => setDeadlineNotification(!deadlineNotification)}
                  className={`flex items-center gap-2 p-3 rounded-sm border whitespace-nowrap transition-all ${
                    deadlineNotification 
                      ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' 
                      : 'border-gray-200 bg-gray-50 text-gray-400'
                  }`}
                  title={deadlineNotification ? "Notificar no Prazo" : "Não notificar"}
                >
                  {deadlineNotification ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:inline">
                    {deadlineNotification ? 'Notificar' : 'Silenciado'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] tracking-widest text-brand-gold font-mono uppercase font-bold block mb-2">
                Itens
              </label>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <input 
                      type="text"
                      value={item.text}
                      onChange={(e) => handleItemChange(item.id, e.target.value)}
                      placeholder="Descrição do item"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-sm p-2 font-serif text-base outline-none focus:border-brand-gold transition-colors text-brand-brown"
                    />
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors bg-red-50 rounded-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={addItem}
                className="mt-3 text-[10px] font-bold uppercase tracking-widest text-brand-brown/60 hover:text-brand-brown flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Adicionar Item
              </button>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-3 bg-brand-brown hover:bg-opacity-90 text-white rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
