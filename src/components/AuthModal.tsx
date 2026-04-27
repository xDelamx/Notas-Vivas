import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, Chrome, Mail, EyeOff, Eye, AlertCircle, Moon, Sun, Lock } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// AuthModal — Tela de Login / Cadastro (tarefa 1.3.3)
// Renderizada quando não há usuário autenticado, substituindo o app inteiro.
// Design editorial consistente com a identidade visual do Notas Vivas.
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'login' | 'signup';

interface AuthModalProps {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}

export function AuthModal({ isDark: _isDark, setIsDark: _setIsDark }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const friendlyError = (msg: string): string => {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado. Tente fazer login.';
    if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    return msg;
  };

  const validate = (): string | null => {
    if (!email.includes('@') || !email.includes('.')) return 'Digite um e-mail válido.';
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (mode === 'signup' && !acceptedTerms) return 'Você deve aceitar os Termos e a Política para criar uma conta.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) setError(friendlyError(error.message));
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setError(friendlyError(error.message));
        } else {
          setSuccessMsg('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) { setError(friendlyError(error.message)); setGoogleLoading(false); }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-semibold tracking-tight text-brand-brown">
            Notas <span className="italic text-brand-gold">Vivas</span>
          </h1>
          <p className="text-[10px] tracking-[0.25em] text-brand-brown/50 mt-2 uppercase font-sans font-medium">
            Anotações que acompanham você
          </p>
          <div className="w-10 h-0.5 bg-brand-gold mx-auto mt-3" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-sm shadow-[0_8px_40px_rgba(0,0,0,0.09)] border border-gray-100 overflow-hidden">
          
          {/* Mode Toggle Header */}
          <div className="grid grid-cols-2 border-b border-gray-100">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccessMsg(null); }}
                className={`py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
                  mode === m ? 'text-brand-brown' : 'text-brand-brown/35 hover:text-brand-brown/60'
                }`}
              >
                {m === 'login' ? 'Entrar' : 'Criar Conta'}
                {mode === m && (
                  <motion.div layoutId="auth-tab-line" className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-gold" />
                )}
              </button>
            ))}
          </div>

          <div className="p-7">
            <AnimatePresence mode="wait">
              {successMsg ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-3"
                >
                  <Sparkles className="w-10 h-10 text-brand-gold mx-auto" strokeWidth={1.5} />
                  <p className="text-brand-brown font-serif text-lg">Quase lá!</p>
                  <p className="text-brand-brown/60 text-sm leading-relaxed">{successMsg}</p>
                  <button
                    onClick={switchMode}
                    className="text-[10px] font-bold uppercase tracking-widest text-brand-gold hover:underline mt-4 inline-block"
                  >
                    Voltar para o Login
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'login' ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >


                  {/* Email */}
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brown/25" />
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-sm pl-10 pr-4 py-3 text-sm font-sans text-brand-brown placeholder:text-gray-300 outline-none focus:border-brand-gold transition-colors"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brown/25" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha (mín. 6 caracteres)"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-sm pl-10 pr-10 py-3 text-sm font-sans text-brand-brown placeholder:text-gray-300 outline-none focus:border-brand-gold transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-brown/25 hover:text-brand-brown/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {mode === 'signup' && (
                    <div className="flex items-start gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 w-3.5 h-3.5 border-gray-300 rounded text-brand-gold focus:ring-brand-gold bg-white shrink-0"
                      />
                      <label htmlFor="terms" className="text-xs text-gray-500 leading-snug">
                        Eu li e concordo com os{' '}
                        <Link to="/terms" target="_blank" className="text-brand-gold hover:underline">Termos de Uso</Link>{' '}
                        e a{' '}
                        <Link to="/privacy" target="_blank" className="text-brand-gold hover:underline">Política de Privacidade</Link>.
                      </label>
                    </div>
                  )}

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-sm px-3 py-2.5 overflow-hidden"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-brown text-white py-3.5 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                  </button>

                  {/* Switch Mode */}
                  <p className="text-center text-xs text-brand-brown/40 pt-1">
                    {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
                    <button type="button" onClick={switchMode} className="text-brand-gold hover:underline font-semibold">
                      {mode === 'login' ? 'Criar agora' : 'Fazer login'}
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-[10px] text-brand-brown/30 mt-6 font-sans">
          Notas Vivas v0.1.0 · Seus dados são privados e seguros
        </p>
      </motion.div>
    </div>
  );
}
