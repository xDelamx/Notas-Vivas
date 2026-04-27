import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Brain, Sparkles, Clock } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useNotes } from '../hooks/useNotes';
import { useAuth } from '../contexts/AuthContext';
import { Note } from '../types';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { updateSettings } = useSettings();
  const { addNote } = useNotes();
  const [loading, setLoading] = React.useState(false);

  const { user } = useAuth();

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Set onboarded flag no localStorage com sufixo do ID do user
      if (user) {
        localStorage.setItem(`notas-vivas-onboarded-${user.id}`, 'true');
      }

      // 2. Create example note
      const exampleNote: Omit<Note, 'id' | 'createdAt'> = {
        title: 'Bem-vindo ao Notas Vivas 👋',
        originalText: 'Essa é a sua primeira nota de exemplo! O app já organizou as informações e criou itens acionáveis para você.',
        summary: 'Explore os recursos interativos do Notas Vivas para entender como a inteligência artificial ajuda na sua organização diária.',
        type: 'Lembrete',
        status: 'active',
        urgency: 'low',
        followUpStrategy: 'notification',
        checkInTime: Date.now() + 86400000, // amanhã
        checkInPrompted: false,
        items: [
          { id: '1', text: 'Experimente clicar neste círculo para concluir a tarefa', completed: false },
          { id: '2', text: 'Arraste uma nota usando o ícone superior direito', completed: false },
          { id: '3', text: 'Crie uma nova nota usando apenas sua voz no botão "Ditar"', completed: false }
        ]
      };
      await addNote(exampleNote);
      
      onComplete();
    } catch (err) {
      console.error('Erro no onboarding', err);
      // Failsafe
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-light z-[500] flex items-center justify-center p-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[100px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-sm shadow-2xl p-8 md:p-12 relative z-10"
      >
        <div className="text-center mb-10">
          <Sparkles className="w-12 h-12 text-brand-gold mx-auto mb-6" />
          <h1 className="text-3xl md:text-5xl font-serif font-semibold text-brand-brown mb-4">
            Seja bem-vindo.
          </h1>
          <p className="text-gray-600 text-lg font-serif">
            Suas anotações agora ganham vida.
          </p>
        </div>

        <div className="space-y-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="bg-brand-brown/5 p-3 rounded-full shrink-0">
              <Brain className="w-6 h-6 text-brand-brown" />
            </div>
            <div>
              <h3 className="font-bold text-brand-brown mb-1 text-sm uppercase tracking-widest">Inteligência Artificial</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Você apenas dita ou escreve de forma corrida. O Notas Vivas analisa, extrai tarefas, resume e categoriza tudo sozinho.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="bg-brand-gold/10 p-3 rounded-full shrink-0">
              <Clock className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <h3 className="font-bold text-brand-brown mb-1 text-sm uppercase tracking-widest">Check-ins Ativos</h3>
              <p className="text-gray-600 text-sm leading-relaxed">O sistema te cobra gentilmente. Se uma nota expirar ou for complexa, você receberá alertas até resolvê-la.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-emerald-50 p-3 rounded-full shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-brand-brown mb-1 text-sm uppercase tracking-widest">Privacidade 100%</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Suas informações são processadas privadamente e estão protegidas tecnologicamente no seu banco em nuvem isolado.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleFinish}
          disabled={loading}
          className="w-full bg-brand-brown text-white py-4 rounded-sm font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all text-xs disabled:opacity-50"
        >
          {loading ? 'Preparando seu ambiente...' : 'Começar a usar'}
        </button>
      </motion.div>
    </div>
  );
}
