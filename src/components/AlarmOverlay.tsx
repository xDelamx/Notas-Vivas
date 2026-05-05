import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff, AlertTriangle, Clock } from 'lucide-react';
import { Note } from '../types';

interface AlarmOverlayProps {
  note: Note;
  onDismiss: () => void;
}

export const AlarmOverlay: React.FC<AlarmOverlayProps> = ({ note, onDismiss }) => {
  const [active, setActive] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Função para tocar som de alarme persistente usando Web Audio API
  const startAlarmSound = () => {
    try {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
        
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime); // Lá (A5)
        
        gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.3, audioCtxRef.current.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.5);
        
        // Repete o som
        if (active) {
          setTimeout(playBeep, 800);
        }
      };

      playBeep();
    } catch (e) {
      console.error('Erro ao iniciar som do alarme:', e);
    }
  };

  // Função para vibrar continuamente
  const startVibration = () => {
    if ('vibrate' in navigator) {
      const vibratePattern = () => {
        if (active) {
          navigator.vibrate([500, 200, 500, 200, 500]);
          setTimeout(vibratePattern, 2000);
        }
      };
      vibratePattern();
    }
  };

  useEffect(() => {
    startAlarmSound();
    startVibration();
    
    return () => {
      setActive(false);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-brand-brown p-4 md:p-10 overflow-hidden"
    >
      {/* Background Animated Rings */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-[300px] h-[300px] border-4 border-white rounded-full" 
        />
        <motion.div 
          animate={{ scale: [1, 2.5, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          className="w-[400px] h-[400px] border-2 border-white rounded-full absolute" 
        />
      </div>

      <div className="max-w-md w-full bg-white rounded-sm shadow-2xl p-8 md:p-12 flex flex-col items-center text-center relative">
        <motion.div
          animate={{ 
            rotate: [-10, 10, -10],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center mb-8 shadow-lg shadow-red-200"
        >
          <Bell className="w-10 h-10" />
        </motion.div>

        <h2 className="text-[10px] tracking-[0.2em] font-bold text-red-600 uppercase mb-4 font-mono">
          Alarme Crítico Ativado
        </h2>
        
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown mb-6 leading-tight">
          {note.title}
        </h1>

        <div className="flex items-center gap-2 text-brand-brown/40 mb-10 font-serif italic text-lg">
          <Clock className="w-5 h-5" />
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        <p className="text-gray-500 mb-12 text-lg font-serif">
          {note.summary}
        </p>

        <button
          onClick={onDismiss}
          className="w-full py-6 bg-brand-brown text-white rounded-sm text-xs font-bold uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
        >
          <BellOff className="w-5 h-5" />
          Desligar Alarme
        </button>

        <div className="mt-8 flex items-center gap-2 text-red-500/60">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-[9px] uppercase font-bold tracking-widest">Toque e vibração persistentes</span>
        </div>
      </div>
    </motion.div>
  );
};
