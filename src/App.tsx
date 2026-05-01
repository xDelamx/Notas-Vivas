import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { parseNote } from './services/geminiService';
import { authFetch } from './lib/api';
import { Note, NoteItem } from './types';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { playSuccessSound, playAlertSound } from './utils/audio';
import { StatsDashboard } from './components/StatsDashboard';
import { 
  CheckCircle2, Circle, Plus, Sparkles, Loader2, X, Check, Clock, Mic, MicOff, 
  Archive, RotateCcw, Trash2, MessageCircle, Phone, Bell, Settings, User, Edit2, Moon, Sun, LogOut, AlertCircle, MessageSquare, LayoutGrid, List
} from 'lucide-react';
import { EditNoteModal } from './components/EditNoteModal';
import { NoteCard } from './components/NoteCard';
import { Filters } from './components/Filters';
import { Onboarding } from './components/Onboarding';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { useAuth } from './contexts/AuthContext';
import { useNotes } from './hooks/useNotes';
import { useSettings } from './hooks/useSettings';
import { usePushNotifications } from './hooks/usePushNotifications';
import { AuthModal } from './components/AuthModal';
import { identifyUser, trackEvent } from './utils/analytics';
import { UpgradeModal } from './components/UpgradeModal';
import { useTranslation } from 'react-i18next';
import { FeedbackModal } from './components/FeedbackModal';

export default function App() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { permission: pushPermission, isSubscribing, subscribeUser } = usePushNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);


  // ── Guarda de autenticação (tarefa 1.3.4) ───────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (user) {
      identifyUser(user.id, user.email);
      
      // Detectar sucesso no upgrade via URL (tarefa 3.2.5)
      const params = new URLSearchParams(window.location.search);
      if (params.get('upgrade') === 'success') {
        showToast('Parabéns! Você agora é PRO. Aproveite o Notas Vivas sem limites! 🎉', 'success');
        // Limpa o parâmetro da URL sem recarregar a página
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user]);


  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user) {
      const isOnboarded = localStorage.getItem(`notas-vivas-onboarded-${user.id}`);
      if (!isOnboarded) {
        setShowOnboarding(true);
      }
      
      const hasUsedMic = localStorage.getItem(`notas-vivas-mic-used-${user.id}`) === 'true';
      const hasUsedSave = localStorage.getItem(`notas-vivas-save-used-${user.id}`) === 'true';
      setShowMicTooltip(!hasUsedMic);
      setShowSaveTooltip(!hasUsedSave);
    }
  }, [user]);

  const { notes, setNotes, loading: notesLoading, error: notesError, addNote, updateNote, deleteNote } = useNotes();
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    if (notesError) {
      setStorageWarning(notesError);
    }
  }, [notesError]);

  const [inputText, setInputText] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCheckIn, setActiveCheckIn] = useState<Note | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'archived' | 'stats'>('active');
  const [showSettings, setShowSettings] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [sortBy, setSortBy] = useState<'manual' | 'recent' | 'oldest' | 'urgency' | 'deadline'>('manual');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const { settings, updateSettings } = useSettings();
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToasts(prev => [...prev, { id: Math.random().toString(), type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Sync settings com o state local do idioma (tarefa 3.6.3)
  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language]);


  const [externalAction, setExternalAction] = useState<{ type: string, note: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [pendingDeadlineNote, setPendingDeadlineNote] = useState<Omit<Note, 'id' | 'createdAt'> | null>(null);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // [DEV] Estado de notas — remover log de produção (tarefa 1.1.1 concluída)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Speech Recording Setup
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleListening = async () => {
    setMicError(null);

    if (isListening) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64String = base64data.split(',')[1];
          
          setIsTranscribing(true);
          try {
            const { transcribeAudio } = await import('./services/geminiService');
            const transcript = await transcribeAudio(base64String, mimeType);
            if (transcript.trim()) {
              setInputText(prev => prev ? prev + ' ' + transcript.trim() : transcript.trim());
            }
          } catch (error) {
            console.error("Transcription error:", error);
            setMicError("Erro ao transcrever o áudio. Tente novamente.");
          } finally {
            setIsTranscribing(false);
          }
        };
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error: any) {
      console.error("Erro ao acessar microfone:", error);
      setIsListening(false);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicError('Permissão negada. Tente abrir o app em uma nova aba e permitir o microfone.');
      } else {
        setMicError('Erro ao acessar o microfone: ' + error.message);
      }
    }
  };

  // Check for check-ins and deadlines every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Handle standard check-in prompts
      const noteToPrompt = notes.find(
        (n) => n.checkInTime && now >= n.checkInTime && !n.checkInPrompted && n.status === 'active'
      );

      if (noteToPrompt && !activeCheckIn) {
        setActiveCheckIn(noteToPrompt);
        if (noteToPrompt.urgency === 'high' || noteToPrompt.urgency === 'critical') {
          playAlertSound();
        }
      }

      // Handle deadline notifications
      let stateChanged = false;
      const updatedNotes = notes.map(n => {
        if (n.status === 'active' && n.deadline && n.deadlineNotification && !n.deadlineNotified && now >= n.deadline) {
          stateChanged = true;
          // Trigger notification
          const msgTitle = "⚠️ Prazo Vencido!";
          const msgBody = `O prazo da nota "${n.title}" acaba de vencer!`;
          sendOSNotification(msgTitle, msgBody);
          playAlertSound();
          showToast(msgTitle, 'warning');
          
          setExternalAction({ type: 'notification', note: n.title });
          setTimeout(() => setExternalAction(null), 5000);

          if (n.followUpStrategy === 'whatsapp') {
            authFetch('/api/whatsapp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `⏰ *PRAZO VENCIDO* ⏰\n\nA tarefa a seguir acaba de vencer:\n*${n.title}*`
              })
            }).catch(console.error);
          }

          updateNote(n.id, { deadlineNotified: true });
          return { ...n, deadlineNotified: true };
        }
        return n;
      });

      if (stateChanged) {
        setNotes(updatedNotes);
      }
      
    }, 1000);

    return () => clearInterval(interval);
  }, [notes, activeCheckIn]);

  const handleAddNote = async () => {
    // ── Paywall e Limites (Plano Livre) ───────────────────────────────────────
    if (settings.vivas_plan === 'free') {
      const activeNotesCount = notes.filter(n => n.status === 'active').length;
      if (activeNotesCount >= 10) {
        setShowUpgradeModal(true);
        trackEvent('paywall_hit', { reason: 'max_active_notes' });
        return;
      }
    }

    if (!inputText.trim() || isProcessing) return;

    const text = inputText;
    setInputText('');
    setIsProcessing(true);

    try {
      const timeStr = currentTime.toLocaleString('pt-BR');
      const parsed = await parseNote(text, timeStr, i18n.language || 'pt-BR');
      const newNote: Omit<Note, 'id' | 'createdAt'> = {
        originalText: text,
        title: parsed.title,
        type: parsed.type,
        items: parsed.items,
        checkInTime: Date.now() + parsed.checkInSeconds * 1000,
        status: 'active',
        checkInPrompted: false,
        urgency: parsed.urgency,
        followUpStrategy: parsed.followUpStrategy,
        summary: parsed.summary,
      };

      // Se a IA extraiu um prazo diretamente do texto, aplica automaticamente
      if (parsed.deadlineTimestamp) {
        newNote.deadline = parsed.deadlineTimestamp;
        newNote.deadlineNotification = true;
        // checkIn configurado para 10 minutos antes do prazo (ou checkInSeconds da IA)
        const tenMinsBefore = parsed.deadlineTimestamp - 10 * 60 * 1000;
        newNote.checkInTime = tenMinsBefore > Date.now() ? tenMinsBefore : parsed.deadlineTimestamp;
      }

      // Só pergunta ao usuário se a IA sinalizou que precisa de prazo E não extraiu um automaticamente
      if (!parsed.deadlineTimestamp && (parsed.needsDeadline || parsed.urgency === 'high' || parsed.urgency === 'critical')) {
        setPendingDeadlineNote(newNote);
        setIsProcessing(false);
        return;
      }

      await finalizeAddNote(newNote);
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Erro ao processar a nota. Por favor, tente novamente.");
      setIsProcessing(false);
    }
  };

  const finalizeAddNote = async (noteToAdd: Omit<Note, 'id' | 'createdAt'>) => {
    try {
      // ── Limite Estratégico (Plano Livre): Sem acesso aos servidores do WhatsApp ──
      if (noteToAdd.followUpStrategy === 'whatsapp' && settings.vivas_plan === 'free') {
        noteToAdd.followUpStrategy = 'app';
        showToast('Notificações no WhatsApp são exclusivas do Plano Pro.', 'warning');
      }

      await addNote(noteToAdd);
      playSuccessSound();
      showToast('Nota salva com sucesso!');
      trackEvent('note_created', { type: noteToAdd.type, urgency: noteToAdd.urgency });

      if (noteToAdd.followUpStrategy === 'whatsapp') {
        try {
          await authFetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `📝 *NOVA NOTA REGISTRADA*\n\n*${noteToAdd.title}*\n\nResumo: ${noteToAdd.summary}\n\nUrgência: ${noteToAdd.urgency.toUpperCase()}${noteToAdd.deadline ? `\nPrazo: ${new Date(noteToAdd.deadline).toLocaleString('pt-BR')}` : ''}`
            })
          });
        } catch (error) {
          console.error("Erro ao enviar WhatsApp inicial:", error);
        }
      }
    } finally {
      setIsProcessing(false);
      setPendingDeadlineNote(null);
      setDeadlineInput('');
    }
  };

  const toggleItemCompletion = (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const newItems = note.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    const allCompleted = newItems.length > 0 && newItems.every((i) => i.completed);
    
    // If all completed, move to completed tab automatically
    let newStatus = note.status;
    let completedAt = note.completedAt;
    if (allCompleted && note.status === 'active') {
      newStatus = 'completed';
      completedAt = Date.now();
      showToast('Todas as tarefas concluídas!', 'success');
      playSuccessSound();
      trackEvent('note_completed', { noteId: note.id, auto_completed: true });
    } else if (!allCompleted && note.status === 'completed') {
      newStatus = 'active';
      completedAt = undefined;
    }

    updateNote(noteId, { items: newItems, status: newStatus as any, completedAt });
  };

  const archiveNote = (id: string) => {
    updateNote(id, { status: 'archived' });
    showToast('Nota arquivada', 'info');
    trackEvent('note_archived', { noteId: id });
  };

  const restoreNote = (id: string) => {
    updateNote(id, { status: 'active' });
    showToast('Nota restaurada', 'success');
  };

  const clearCompleted = () => {
    notes.filter(n => n.status === 'completed').forEach(n => deleteNote(n.id));
    showToast('Notas concluídas foram excluídas', 'success');
  };

  const clearArchived = () => {
    notes.filter(n => n.status === 'archived').forEach(n => deleteNote(n.id));
    showToast('Notas arquivadas foram excluídas', 'success');
  };

  const handleSaveEditedNote = (updatedNote: Note) => {
    updateNote(updatedNote.id, updatedNote);
    showToast('Nota editada com sucesso');
    setEditingNote(null);
  };

  const togglePin = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      updateNote(id, { pinned: !note.pinned });
      showToast(note.pinned ? 'Nota desfixada' : 'Nota fixada no topo', 'info');
      trackEvent(note.pinned ? 'note_unpinned' : 'note_pinned', { noteId: id });
    }
  };

  const filteredNotes = React.useMemo(() => {
    let result = [...notes];

    if (activeTab !== 'stats') {
      result = result.filter(n => n.status === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.originalText.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'all') {
      result = result.filter(n => n.type.toLowerCase().includes(filterType));
    }

    if (filterUrgency !== 'all') {
      result = result.filter(n => n.urgency === filterUrgency);
    }

    if (sortBy === 'recent') {
      result.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortBy === 'deadline') {
      result.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline - b.deadline;
      });
    } else if (sortBy === 'urgency') {
      const urgencyScore = { 'crítica': 4, 'alta': 3, 'média': 2, 'baixa': 1 };
      result.sort((a, b) => (urgencyScore[b.urgency as keyof typeof urgencyScore] || 0) - (urgencyScore[a.urgency as keyof typeof urgencyScore] || 0));
    }

    // Pinned notes always come first
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    return result;
  }, [notes, activeTab, searchQuery, filterType, filterUrgency, sortBy]);

  const handleShare = async (note: Note) => {
    try {
      const res = await authFetch(`/api/notes/${note.id}/share`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      const shareUrl = `${window.location.origin}/shared/${token}`;
      
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link de compartilhamento copiado! 🎉', 'success');
    } catch (e) {
      showToast('Erro ao gerar link de compartilhamento.', 'error');
    }
  };

  const handleReorder = (newNotesFlow: Note[]) => {
    setNotes(prev => {
      const originalIndices = prev
          .map((n, i) => n.status === activeTab ? i : -1)
          .filter(i => i !== -1);
      
      const newNotes = [...prev];
      originalIndices.forEach((origIdx, tempIdx) => {
           newNotes[origIdx] = newNotesFlow[tempIdx];
      });
      return newNotes;
    });
  };

  const sendOSNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/vite.svg' });
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleCheckInResponse = async (response: 'yes' | 'partial' | 'no') => {
    if (!activeCheckIn) return;

    // Real external action for high urgency notes
    if (response === 'no' && (activeCheckIn.urgency === 'high' || activeCheckIn.urgency === 'critical')) {
      playAlertSound();
      sendOSNotification('Tarefa Crítica Ignorada!', `Você ignorou: ${activeCheckIn.title}. Enviando alerta para o WhatsApp...`);
      
      setExternalAction({
        type: activeCheckIn.followUpStrategy,
        note: activeCheckIn.title
      });
      setTimeout(() => setExternalAction(null), 5000);

      if (activeCheckIn.followUpStrategy === 'whatsapp') {
        try {
          await authFetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: '🚨 Alerta Crítico',
              body: `Tarefa Ignorada: ${activeCheckIn.title}`,
              message: `🚨 *ALERTA CRÍTICO* 🚨\n\nVocê ignorou o check-in da seguinte tarefa:\n*${activeCheckIn.title}*\n\nPor favor, verifique isso imediatamente!`
            })
          }).then(() => trackEvent('whatsapp_alert_sent', { noteId: activeCheckIn.id, success: true }));
        } catch (error) {
          console.error("Erro ao enviar WhatsApp:", error);
        }
      }
    }

    if (response === 'yes') {
      updateNote(activeCheckIn.id, {
        status: 'completed',
        completedAt: Date.now(),
        checkInPrompted: true,
        items: activeCheckIn.items.map((i) => ({ ...i, completed: true }))
      });
      trackEvent('checkin_answered', { response: 'yes', noteId: activeCheckIn.id });
    } else if (response === 'partial') {
      updateNote(activeCheckIn.id, { checkInPrompted: true });
      trackEvent('checkin_answered', { response: 'partial', noteId: activeCheckIn.id });
    } else if (response === 'no') {
      updateNote(activeCheckIn.id, {
        checkInPrompted: false,
        checkInTime: Date.now() + 1800000,
      });
      trackEvent('checkin_answered', { response: 'no', noteId: activeCheckIn.id });
    }

    setActiveCheckIn(null);
  };

  // ── Early Returns Seguros (Após declarar TODOS os Hooks) ──────────────────────
  const [loadingTooLong, setLoadingTooLong] = React.useState(false);
  React.useEffect(() => {
    if (!authLoading) return;
    const t = setTimeout(() => setLoadingTooLong(true), 5000);
    return () => clearTimeout(t);
  }, [authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4 px-6"
        >
          <Sparkles className="w-10 h-10 text-brand-gold/40 mx-auto" strokeWidth={1} />
          <p className="text-brand-brown/40 text-sm font-serif italic">Carregando...</p>
          {loadingTooLong && (
            <p className="text-brand-brown/30 text-xs max-w-xs">
              Isso está demorando mais que o esperado. Verifique sua conexão com a internet.
            </p>
          )}
        </motion.div>
      </div>
    );
  }


  if (!user) {
    return <AuthModal isDark={isDark} setIsDark={setIsDark} />;
  }
  // ───────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen font-sans text-gray-900 pb-24">

      {/* Banner de aviso de dados corrompidos (tarefa 1.1.6) */}
      <AnimatePresence>
        {storageWarning && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-4"
          >
            <p className="text-amber-800 text-xs font-medium flex-1">{storageWarning}</p>
            <button
              onClick={() => setStorageWarning(null)}
              className="text-amber-600 hover:text-amber-800 transition-colors shrink-0"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner de status Offline */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800 text-white px-4 py-2 text-center"
          >
            <p className="text-xs font-medium flex items-center justify-center gap-2">
               <AlertCircle className="w-4 h-4 text-brand-gold" />
               Você está offline. O aplicativo continuará funcionando em modo cache limitadamente.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="max-w-4xl mx-auto pt-8 pb-6 px-4 md:px-6 relative">
        {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
        <div className="absolute top-8 right-4 md:right-6 flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-brand-brown/40 hover:text-brand-brown/80 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          {/* Menu do usuário (tarefa 1.3.4) */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="p-2 text-brand-brown/40 hover:text-brand-brown/80 transition-colors"
              title={user.email || 'Conta'}
            >
              <User className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  className="absolute right-0 top-10 bg-white border border-gray-100 rounded-sm shadow-xl w-56 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-brand-brown/40">{t('account')}</p>
                    <p className="text-sm text-brand-brown font-serif truncate mt-0.5">{user.email}</p>

                    <div className="mt-3 flex items-center justify-between p-2 bg-gray-50 rounded-sm">
                       <span className="text-[10px] font-bold text-brand-brown/40 uppercase tracking-widest">Idioma</span>
                       <div className="flex items-center gap-2">
                         <button onClick={() => updateSettings({ language: 'pt' })} className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${i18n.language.startsWith('pt') ? 'ring-2 ring-brand-gold bg-white' : 'opacity-40 grayscale'}`} title="Português">🇧🇷</button>
                         <button onClick={() => updateSettings({ language: 'en' })} className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${i18n.language.startsWith('en') ? 'ring-2 ring-brand-gold bg-white' : 'opacity-40 grayscale'}`} title="English">🇺🇸</button>
                         <button onClick={() => updateSettings({ language: 'es' })} className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${i18n.language.startsWith('es') ? 'ring-2 ring-brand-gold bg-white' : 'opacity-40 grayscale'}`} title="Español">🇪🇸</button>
                       </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <button
                        onClick={async () => {
                          try {
                            await subscribeUser();
                            showToast('Notificações ativadas com sucesso! 🔔', 'success');
                          } catch (err: any) {
                            showToast(err.message || 'Erro ao ativar notificações', 'error');
                          }
                        }}
                        disabled={isSubscribing || pushPermission === 'granted'}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-sm transition-all ${
                          pushPermission === 'granted' 
                            ? 'bg-emerald-50 text-emerald-600 cursor-default' 
                            : 'bg-brand-brown/5 text-brand-brown hover:bg-brand-brown/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">
                            {pushPermission === 'granted' ? t('push_active') : t('activate_push')}
                          </span>
                        </div>
                        {isSubscribing && <Loader2 className="w-3 h-3 animate-spin" />}
                        {pushPermission === 'granted' && <Check className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-brand-gold uppercase tracking-wider">
                        {t('vivas_plan', { defaultValue: 'Plano' })} {settings.vivas_plan === 'pro' ? 'PRO' : t('free_plan', { defaultValue: 'LIVRE' })}
                      </span>
                      {settings.vivas_plan === 'pro' ? (
                        <button 
                          onClick={async () => {
                            if (!settings.stripe_customer_id) return;
                            try {
                              const res = await authFetch('/api/stripe/create-portal', {
                                method: 'POST',
                                body: JSON.stringify({ customerId: settings.stripe_customer_id })
                              });
                              const { url } = await res.json();
                              if (url) window.location.href = url;
                            } catch (e) {
                              showToast('Erro ao acessar gerenciador da assinatura', 'error');
                            }
                          }}
                          className="text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-1 rounded hover:bg-brand-gold hover:text-white transition-colors"
                        >
                          Gerenciar
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setShowUserMenu(false); setShowUpgradeModal(true); }}
                          className="text-[10px] bg-brand-brown text-white px-2 py-1 rounded font-bold hover:bg-brand-brown/80 transition-colors"
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { signOut(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('logout')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-semibold tracking-tight text-brand-brown">
            Notas <span className="italic text-brand-gold drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">Vivas</span>
          </h1>
          <p className="text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] text-brand-brown/60 mt-2 font-sans font-medium uppercase">
            {t('slogan')}
          </p>
          <div className="w-12 h-0.5 bg-brand-gold mx-auto mt-3" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 space-y-8">
        {/* Tabs */}
        <div className="flex justify-center gap-4 md:gap-8 border-b border-brand-brown/10 pb-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-all relative py-2 ${
              activeTab === 'active' ? 'text-brand-brown' : 'text-brand-brown/40 hover:text-brand-brown/60'
            }`}
          >
            {t('active')}
            {activeTab === 'active' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-gold" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-all relative py-2 ${
              activeTab === 'completed' ? 'text-brand-brown' : 'text-brand-brown/40 hover:text-brand-brown/60'
            }`}
          >
            {t('completed')}
            {activeTab === 'completed' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-gold" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-all relative py-2 ${
              activeTab === 'archived' ? 'text-brand-brown' : 'text-brand-brown/40 hover:text-brand-brown/60'
            }`}
          >
            {t('archived')}
            {activeTab === 'archived' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-gold" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-all relative py-2 ${
              activeTab === 'stats' ? 'text-brand-brown' : 'text-brand-brown/40 hover:text-brand-brown/60'
            }`}
          >
            {t('stats')}
            {activeTab === 'stats' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-gold" />
            )}
          </button>
        </div>

        {/* Input Area (Only in Active Tab) */}
        {activeTab === 'active' && (
          <div className="bg-white rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
            <div className="p-6 md:p-8">
              <label className="text-[10px] tracking-widest text-brand-gold font-mono uppercase font-bold block mb-4">
                {t('new_note', { defaultValue: 'Nova Nota' })}
              </label>
              <textarea
                className={`w-full bg-transparent resize-none outline-none text-lg md:text-xl placeholder:italic min-h-[100px] md:min-h-[120px] font-serif transition-colors ${
                  inputText.length > 2000 ? 'text-red-500 placeholder:text-red-300' : 'text-brand-brown placeholder:text-gray-300'
                }`}
                placeholder={t('placeholder')}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (inputText.length <= 2000) handleAddNote();
                  }
                }}
              />
              <div className="flex justify-end mt-2">
                <span className={`text-[10px] font-mono tracking-widest ${inputText.length > 2000 ? 'text-red-500 font-bold' : 'text-brand-brown/40'}`}>
                  [{inputText.length}/2000]
                </span>
              </div>
            </div>
            <div className="bg-brand-card-footer px-6 py-3 md:px-8 md:py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-brand-card-footer">
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <div className="text-[10px] text-brand-brown/50 font-mono flex items-center gap-2">
                  <span className="text-sm font-bold">⌘</span> + Enter para salvar
                </div>
                <div className="flex items-center gap-2 relative">
                  {showMicTooltip && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -top-10 left-1/2 -translate-x-1/2 bg-brand-brown text-white text-[10px] py-1 px-3 rounded-sm whitespace-nowrap z-10 pointer-events-none">
                      Pressione para falar
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-brand-brown" />
                    </motion.div>
                  )}
                  <button
                    onClick={() => {
                      if (showMicTooltip && user) {
                        setShowMicTooltip(false);
                        localStorage.setItem(`notas-vivas-mic-used-${user.id}`, 'true');
                      }
                      trackEvent('mic_used');
                      toggleListening();
                    }}
                    disabled={isTranscribing}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                      isListening 
                        ? 'bg-red-100 text-red-600 animate-pulse' 
                        : isTranscribing
                        ? 'bg-brand-gold/20 text-brand-gold cursor-not-allowed'
                        : 'bg-brand-brown/5 text-brand-brown/60 hover:bg-brand-brown/10'
                    }`}
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isListening ? (
                      <Mic className="w-3 h-3 animate-pulse" />
                    ) : (
                      <MicOff className="w-3 h-3" />
                    )}
                    {isTranscribing ? 'Transcrevendo...' : isListening ? 'Parar Gravação' : 'Ditar'}
                  </button>
                </div>
              </div>
              <div className="relative w-full sm:w-auto">
                {showSaveTooltip && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -top-10 left-1/2 -translate-x-1/2 bg-brand-brown text-white text-[10px] py-1 px-3 rounded-sm whitespace-nowrap z-10 pointer-events-none">
                    Clique para salvar a nota
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-brand-brown" />
                  </motion.div>
                )}
                <button
                  onClick={() => {
                    if (showSaveTooltip && user) {
                      setShowSaveTooltip(false);
                      localStorage.setItem(`notas-vivas-save-used-${user.id}`, 'true');
                    }
                    handleAddNote();
                  }}
                  disabled={isProcessing || !inputText.trim() || inputText.length > 2000}
                  className="w-full sm:w-auto bg-brand-brown text-white px-8 py-3 rounded-sm text-xs font-semibold tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90 transition-all shadow-sm"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Salvar Nota"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes List or Stats */}
        <div className="space-y-6 flex flex-col min-h-0">
          {activeTab === 'stats' ? (
            <StatsDashboard notes={notes} />
          ) : (
            <>
              {notes.filter(n => n.status === activeTab).length > 0 && (
                <Filters 
                  searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                  filterType={filterType} setFilterType={setFilterType}
                  filterUrgency={filterUrgency} setFilterUrgency={setFilterUrgency}
                  sortBy={sortBy} setSortBy={setSortBy}
                  viewMode={viewMode} setViewMode={setViewMode}
                />
              )}

              {/* Contador de notas */}
              {notes.filter(n => n.status === activeTab).length > 0 && (
                <div className="flex items-center">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-brand-brown/40">
                    {filteredNotes.length} {filteredNotes.length === 1 ? 'nota' : 'notas'}
                  </span>
                </div>
              )}
              
              {(activeTab === 'completed' || activeTab === 'archived') && filteredNotes.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={activeTab === 'completed' ? clearCompleted : clearArchived}
                    className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-700 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Limpar {activeTab === 'completed' ? 'Concluídas' : 'Arquivadas'}
                  </button>
                </div>
              )}

              <Reorder.Group 
                axis={viewMode === 'grid' ? "x" : "y"} 
                values={sortBy === 'manual' ? filteredNotes : filteredNotes} 
                onReorder={(arr) => sortBy === 'manual' ? handleReorder(arr) : null}
                className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 gap-4 items-start" : "flex flex-col gap-6"}
              >
                <AnimatePresence>
                  {filteredNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        setEditingNote={setEditingNote}
                        archiveNote={archiveNote}
                        restoreNote={restoreNote}
                        toggleItemCompletion={toggleItemCompletion}
                        onShare={handleShare}
                        viewMode={viewMode}
                        onTogglePin={() => togglePin(note.id)}
                      />
                    ))}
                </AnimatePresence>
              </Reorder.Group>
          
          {filteredNotes.length === 0 && notes.filter(n => n.status === activeTab).length > 0 && (
            <p className="text-center text-brand-brown/40 italic font-serif py-10">Nenhuma nota encontrada nos filtros.</p>
          )}

          {notes.filter(n => n.status === activeTab).length === 0 && activeTab !== 'stats' && !isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              {activeTab === 'active' && (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-brand-gold/40" />
                  </div>
                  <p className="text-xl text-brand-brown/40 font-serif italic">Nenhuma anotação por aqui ainda.</p>
                </>
              )}
              {activeTab === 'completed' && (
                <>
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                  </div>
                  <p className="text-xl text-brand-brown/40 font-serif italic">Nenhuma tarefa concluída... ainda!</p>
                  <p className="text-sm text-brand-brown/30 mt-2">Dê o primeiro passo completando uma anotação ativa.</p>
                </>
              )}
              {activeTab === 'archived' && (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Archive className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-xl text-brand-brown/40 font-serif italic">Seu arquivo está vazio.</p>
                  <p className="text-sm text-brand-brown/30 mt-2">Guarde aqui as anotações que não quer perder de vista.</p>
                </>
              )}
            </motion.div>
          )}
            </>
          )}
        </div>
      </main>

      {/* Golden Check-in Balloon */}
      <AnimatePresence>
        {activeCheckIn && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50"
          >
            <div className="bg-white border border-brand-gold/30 shadow-2xl rounded-sm p-6 md:p-8 text-gray-900 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold" />
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-brand-gold" />
                <h4 className="font-serif text-xl font-semibold">Hora do check-in!</h4>
              </div>
              <p className="mb-8 text-gray-600 font-serif text-lg">
                Você concluiu: <span className="font-semibold text-gray-900 italic">"{activeCheckIn.title}"</span>?
              </p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => handleCheckInResponse('yes')}
                  className="flex items-center justify-center gap-3 bg-brand-gold text-white hover:bg-opacity-90 transition-all rounded-sm py-4 px-4 text-xs font-bold uppercase tracking-widest"
                >
                  <Check className="w-4 h-4" />
                  Sim, concluí!
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleCheckInResponse('partial')}
                    className="flex items-center justify-center gap-2 bg-brand-card-footer text-gray-600 hover:bg-gray-200 transition-all rounded-sm py-4 px-2 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Parcialmente
                  </button>
                  <button
                    onClick={() => handleCheckInResponse('no')}
                    className="flex items-center justify-center gap-2 bg-brand-card-footer text-gray-600 hover:bg-gray-200 transition-all rounded-sm py-4 px-2 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Ainda não
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deadline Prompt Modal */}
      <AnimatePresence>
        {pendingDeadlineNote && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-sm shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-8 h-8 text-red-500" />
                  <h2 className="font-serif text-2xl font-semibold text-brand-brown">Atenção!</h2>
                </div>
                
                <p className="text-gray-600 mb-6 font-serif">
                  A IA identificou que a nota <span className="font-semibold italic">"{pendingDeadlineNote.title}"</span> é crítica ou urgente.
                  Gostaria de estipular um prazo final para ela?
                </p>

                <div className="space-y-4 mb-8">
                  <input
                    type="datetime-local"
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-sm p-3 font-mono text-sm outline-none focus:border-brand-gold transition-colors text-brand-brown"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      if (window.confirm("Essa nota foi classificada como urgente. Tem certeza que deseja salvá-la sem definir um prazo final?")) {
                        finalizeAddNote(pendingDeadlineNote);
                      }
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Salvar sem prazo
                  </button>
                  <button 
                    onClick={() => {
                      const noteWithDeadline = { 
                        ...pendingDeadlineNote, 
                        deadline: deadlineInput ? new Date(deadlineInput).getTime() : undefined,
                        deadlineNotification: !!deadlineInput, // Enable notification if a deadline is selected
                      };
                      finalizeAddNote(noteWithDeadline);
                    }}
                    className="bg-brand-brown hover:bg-opacity-90 text-white py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Definir Prazo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-sm shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-serif text-2xl font-semibold text-brand-brown">Configurações do Assistente</h2>
                  <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-sm">
                    <div>
                      <label className="text-[10px] tracking-widest text-brand-gold font-mono uppercase font-bold block mb-1">
                        Aparência
                      </label>
                      <p className="text-xs text-brand-brown/60">Alternar entre modo claro e escuro</p>
                    </div>
                    <button 
                      onClick={() => setIsDark(!isDark)}
                      className="p-3 bg-white rounded-sm shadow-sm text-brand-brown/60 hover:text-brand-brown transition-colors"
                      title={isDark ? "Modo Claro" : "Modo Escuro"}
                    >
                      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-sm">
                    <div>
                      <label className="text-[10px] tracking-widest text-brand-gold font-mono uppercase font-bold block mb-1">
                        Feedback Beta
                      </label>
                      <p className="text-xs text-brand-brown/60">Envie sugestões ou reporte erros</p>
                    </div>
                    <button 
                      onClick={() => { setShowSettings(false); setShowFeedback(true); }}
                      className="p-3 bg-white rounded-sm shadow-sm text-brand-brown/60 hover:text-brand-brown transition-colors"
                      title="Enviar Feedback"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] tracking-widest text-brand-gold font-mono uppercase font-bold block mb-2">
                      Seu WhatsApp para Alertas
                    </label>
                    <div className="flex gap-2">
                      <div className="bg-gray-100 p-3 rounded-sm flex-1 flex items-center gap-3">
                        <Phone className="w-4 h-4 text-brand-brown/40" />
                        <input 
                          type="text" 
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="bg-transparent outline-none text-brand-brown font-mono text-sm w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-gold/5 p-4 rounded-sm border border-brand-gold/10">
                    <div className="flex gap-3">
                      <Sparkles className="w-5 h-5 text-brand-gold shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-brand-brown uppercase tracking-wider mb-1">Curadoria Inteligente Ativa</p>
                        <p className="text-xs text-brand-brown/60 leading-relaxed">
                          A IA monitora suas notas em tempo real. Notas críticas podem gerar ligações ou mensagens automáticas se você não responder aos check-ins.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/whatsapp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            message: `🔧 *TESTE DE INTEGRAÇÃO*\n\nSeu aplicativo Notas Vivas está configurado corretamente e conseguiu enviar esta mensagem de teste pelo Twilio!`
                          })
                        });
                        const data = await res.json();
                        if (data.simulated) {
                          showToast('Integração simulada com sucesso! (Configure Twilio no servidor)', 'info');
                        } else if (data.success) {
                          showToast('Mensagem enviada com sucesso.', 'success');
                          trackEvent('whatsapp_alert_sent', { success: true });
                        } else {
                          showToast(`Erro ao enviar: ${data.error}`, 'error');
                        }
                      } catch (err) {
                        showToast('Erro ao tentar conectar ao servidor local de WhatsApp.', 'error');
                      }
                    }}
                    className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 py-3 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Testar Integração WhatsApp
                  </button>
                </div>

                <button 
                  onClick={() => {
                    updateSettings({ whatsapp_number: phoneNumber });
                    setShowSettings(false);
                    showToast('Configurações salvas!', 'success');
                  }}
                  className="w-full bg-brand-brown text-white py-4 rounded-sm text-xs font-bold uppercase tracking-widest mt-8 hover:bg-opacity-90 transition-all"
                >
                  Salvar Configurações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Note Modal */}
      <AnimatePresence>
        {editingNote && (
          <EditNoteModal
            note={editingNote}
            onClose={() => setEditingNote(null)}
            onSave={handleSaveEditedNote}
          />
        )}
      </AnimatePresence>

      {/* Mic Error Modal */}
      <AnimatePresence>
        {micError && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-sm shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 md:p-8 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-brand-brown mb-2">Microfone Bloqueado</h2>
                <p className="text-brand-brown/70 mb-6 text-sm">
                  {micError}
                </p>
                <div className="flex flex-col gap-3">
                  {window !== window.parent && (
                    <button 
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="w-full bg-brand-brown text-white py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all"
                    >
                      Abrir em Nova Aba
                    </button>
                  )}
                  <button 
                    onClick={() => setMicError(null)}
                    className="w-full bg-gray-100 text-gray-600 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* External Action Simulation Overlay */}
      <AnimatePresence>
        {externalAction && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-4 right-4 md:top-8 md:right-8 z-[200] max-w-[calc(100vw-2rem)] sm:max-w-sm w-full"
          >
            <div className="bg-brand-brown text-white p-4 md:p-6 rounded-sm shadow-2xl border-l-4 border-brand-gold">
              <div className="flex items-start gap-4">
                <div className="bg-brand-gold/20 p-3 rounded-full">
                  {externalAction.type === 'whatsapp' ? <MessageCircle className="w-6 h-6 text-brand-gold" /> : 
                   externalAction.type === 'call' ? <Phone className="w-6 h-6 text-brand-gold animate-bounce" /> :
                   <Bell className="w-6 h-6 text-brand-gold" />}
                </div>
                <div>
                  <h5 className="font-bold text-xs uppercase tracking-widest text-brand-gold mb-1">
                    {externalAction.type === 'whatsapp' ? 'Enviando WhatsApp...' : 
                     externalAction.type === 'call' ? 'Iniciando Ligação...' :
                     'Enviando Notificação...'}
                  </h5>
                  <p className="text-sm font-serif italic opacity-80">
                    "Atenção: A nota '{externalAction.note}' foi identificada como prioridade crítica e requer sua atenção imediata."
                  </p>
                  <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 5 }}
                      className="h-full bg-brand-gold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showUserMenu && (
        <AuthModal isDark={isDark} setIsDark={setIsDark} />
      )}

      <FeedbackModal 
        isOpen={showFeedback} 
        onClose={() => setShowFeedback(false)} 
        showToast={showToast} 
      />

      {showUpgradeModal && (
        <UpgradeModal 
          onClose={() => setShowUpgradeModal(false)} 
          userEmail={user?.email} 
        />
      )}



      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
