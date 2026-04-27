import React, { useState } from 'react';
import { Sparkles, CheckCircle, X, ShieldCheck } from 'lucide-react';

interface UpgradeModalProps {
  onClose: () => void;
  userEmail?: string;
}

export function UpgradeModal({ onClose, userEmail }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-phjdthutjchnvqrvttcp-auth-token') ? JSON.parse(localStorage.getItem('sb-phjdthutjchnvqrvttcp-auth-token') || '{}').access_token : ''}`
        },
        body: JSON.stringify({ email: userEmail })
      });
      
      const session = await res.json();
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (err) {
      console.error('Erro ao redirecionar para pagamentos:', err);
      alert('Não foi possível conectar de forma segura com o servidor de pagamento.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="relative bg-brand-brown p-8 text-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-gold/20 text-brand-gold mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-serif text-white mb-2">Notas Vivas Pro</h2>
          <p className="text-white/80 font-medium">Libere o poder total do monitoramento inteligente</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Free */}
            <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 opacity-70">
              <h3 className="text-lg font-bold text-brand-brown mb-2">Plano Atual (Free)</h3>
              <p className="text-sm text-brand-brown/60 mb-6">Bom para começar</p>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-brand-brown/80">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Até 10 notas ativas
                </li>
                <li className="flex items-center gap-2 text-sm text-brand-brown/80">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Notificações no Navegador
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <X className="w-4 h-4" />
                  <span className="line-through">Alertas Críticos no WhatsApp</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <X className="w-4 h-4" />
                  <span className="line-through">Estatísticas Avançadas</span>
                </li>
              </ul>
            </div>

            {/* Pro */}
            <div className="p-6 rounded-xl border-2 border-brand-gold bg-brand-gold/5 relative">
              <div className="absolute -top-3 -right-3 bg-brand-gold text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                Mais popular
              </div>
              <h3 className="text-lg font-bold text-brand-brown mb-2">Plano Pro</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold text-brand-brown">R$19</span>
                <span className="text-brand-brown/60 text-sm">,90/mês</span>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm font-medium text-brand-brown">
                  <CheckCircle className="w-4 h-4 text-brand-gold" />
                  Notas ativas Ilimitadas
                </li>
                <li className="flex items-center gap-2 text-sm font-medium text-brand-brown">
                  <CheckCircle className="w-4 h-4 text-brand-gold" />
                  Alertas Críticos no WhatsApp
                </li>
                <li className="flex items-center gap-2 text-sm font-medium text-brand-brown">
                  <CheckCircle className="w-4 h-4 text-brand-gold" />
                  Prioridade de Suporte
                </li>
                <li className="flex items-center gap-2 text-sm font-medium text-brand-brown">
                  <CheckCircle className="w-4 h-4 text-brand-gold" />
                  Exportação de Dados (JSON/PDF)
                </li>
              </ul>
            </div>
          </div>

          <button 
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-brown hover:bg-brand-brown/90 text-white font-bold py-4 px-6 rounded-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
               <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Fazer Upgrade Seguro
              </>
            )}
          </button>
          <p className="text-center text-xs text-brand-brown/40 mt-4 flex items-center justify-center gap-1">
            Pagamento 100% seguro processado via Stripe SaaS.
          </p>
        </div>
      </div>
    </div>
  );
}
