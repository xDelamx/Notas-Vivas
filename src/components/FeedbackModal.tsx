import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, CheckCircle2, Loader2, AlertTriangle, Lightbulb } from 'lucide-react';
import { authFetch } from '../lib/api';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export function FeedbackModal({ isOpen, onClose, showToast }: FeedbackModalProps) {
  const [type, setType] = useState<'bug' | 'suggestion' | 'other'>('suggestion');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await authFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ type, content }),
      });

      if (!res.ok) throw new Error();
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setContent('');
        onClose();
      }, 3000);
    } catch (error) {
      showToast('Erro ao enviar feedback. Tente novamente mais tarde.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-brown/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-sm shadow-2xl z-[101] overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-gold" />
                <h2 className="font-serif text-xl font-bold text-brand-brown">Feedback do Beta</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-brand-brown transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-brand-brown">Obrigado pelo feedback!</h3>
                  <p className="text-brand-brown/60 text-sm">Sua contribuição é fundamental para o sucesso do Notas Vivas.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-brown/40 mb-3 block">Tipo de Feedback</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setType('bug')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-sm border transition-all ${type === 'bug' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Bug</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('suggestion')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-sm border transition-all ${type === 'suggestion' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Sugestão</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('other')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-sm border transition-all ${type === 'other' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Outro</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-brown/40 mb-3 block">Sua mensagem</label>
                    <textarea
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Conte para nós o que você achou ou o que podemos melhorar..."
                      className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold/40 text-brand-brown resize-none text-sm leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending || !content.trim()}
                    className="w-full bg-brand-brown text-white py-4 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-brand-gold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar Feedback
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
