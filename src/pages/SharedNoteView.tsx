import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Sparkles, CheckCircle2, Circle, Clock, Mail, 
  ArrowLeft, ExternalLink, ShieldCheck, ChevronRight
} from 'lucide-react';
import { trackEvent } from '../utils/analytics';

interface SharedNote {
  title: string;
  originalText: string;
  type: string;
  items: Array<{ text: string; completed?: boolean }>;
  summary: string;
  urgency: string;
  createdAt: string;
}

export function SharedNoteView() {
  const { token } = useParams<{ token: string }>();
  const [note, setNote] = useState<SharedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedNote = async () => {
      try {
        const res = await fetch(`/api/shared/${token}`);
        if (!res.ok) throw new Error('Nota não encontrada ou link inválido.');
        const data = await res.json();
        setNote(data);
        trackEvent('shared_note_viewed', { token, title: data.title });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchSharedNote();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige/20">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex flex-col items-center gap-4"
        >
          <Sparkles className="w-10 h-10 text-brand-gold/40" />
          <p className="text-brand-brown/40 font-serif italic">Preparando visualização...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige/20 px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif text-brand-brown font-semibold">Link Indisponível</h1>
          <p className="text-brand-brown/60 text-sm">Esta nota não pode ser carregada. O link pode ter sido desativado pelo proprietário ou está incorreto.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-brand-gold font-bold text-xs uppercase tracking-widest hover:gap-3 transition-all">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  const urgencyColors: Record<string, string> = {
    'critical': 'bg-red-50 text-red-600 border-red-100',
    'high': 'bg-orange-50 text-orange-600 border-orange-100',
    'medium': 'bg-amber-50 text-amber-600 border-amber-100',
    'low': 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };

  return (
    <div className="min-h-screen bg-brand-beige/20 pb-20 font-sans">
      {/* Branding Header */}
      <header className="max-w-2xl mx-auto pt-10 pb-6 px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-brand-brown rounded-sm flex items-center justify-center text-white font-serif italic text-lg leading-none group-hover:scale-105 transition-transform">N</div>
          <span className="font-serif font-semibold text-brand-brown text-lg tracking-tight group-hover:opacity-80 transition-opacity">Notas Vivas</span>
        </Link>
        <span className="text-[10px] font-bold text-brand-brown/30 uppercase tracking-[0.2em] flex items-center gap-2">
          <ShieldCheck className="w-3 h-3" /> Link Seguro
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-brand-brown/5 overflow-hidden"
        >
          {/* Note Metadata Header */}
          <div className="p-8 border-b border-brand-brown/5 bg-gradient-to-br from-white to-brand-beige/5">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${urgencyColors[note.urgency] || urgencyColors.low}`}>
                {note.urgency}
              </span>
              <span className="text-[10px] font-bold text-brand-brown/40 uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(note.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-brand-brown leading-tight mb-4">{note.title}</h1>
            <p className="text-brand-brown/60 text-sm italic font-serif leading-relaxed line-clamp-3">"{note.summary}"</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Checklist Items */}
            {note.items && note.items.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.2em]">Checklist Extraído</h2>
                <div className="grid gap-2">
                  {note.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-sm border border-brand-brown/5 bg-brand-beige/5">
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-brand-brown/20 mt-0.5 shrink-0" />
                      )}
                      <span className={`text-sm ${item.completed ? 'text-brand-brown/40 line-through' : 'text-brand-brown'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Original Transcription */}
            <section className="space-y-4">
              <h2 className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.2em]">Texto Original</h2>
              <div className="relative p-6 bg-brand-beige/10 rounded-sm border border-brand-brown/5">
                <span className="absolute -top-3 left-4 px-2 bg-white text-[10px] font-bold text-brand-brown/20 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Transcrição por IA
                </span>
                <p className="text-brand-brown/70 text-sm leading-relaxed whitespace-pre-wrap">{note.originalText}</p>
              </div>
            </section>
          </div>
        </motion.div>

        {/* CTA Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center p-12 bg-white rounded-sm border border-dashed border-brand-brown/10"
        >
          <Sparkles className="w-8 h-8 text-brand-gold/40 mx-auto mb-4" />
          <h3 className="text-xl font-serif text-brand-brown font-semibold mb-2">Gostou da organização?</h3>
          <p className="text-sm text-brand-brown/60 mb-8 max-w-sm mx-auto">Transforme seus áudios e anotações confusas em planos de ação claros com inteligência artificial.</p>
          <Link to="/" className="bg-brand-brown text-white text-xs font-bold uppercase tracking-widest px-8 py-4 rounded-sm hover:bg-brand-gold transition-colors inline-flex items-center gap-3 shadow-xl">
             Comece Grátis <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
