import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function Privacy() {
  return (
    <div className="min-h-screen font-sans text-gray-900 bg-brand-light p-6 md:p-12 relative overflow-hidden">
      {/* Decoração estática suave */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-brown/5 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-brand-gold hover:text-brand-brown transition-colors mb-8 text-sm font-bold tracking-widest uppercase">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Início
        </Link>
        <h1 className="text-4xl md:text-5xl font-serif font-semibold text-brand-brown mb-6 pt-4">Política de Privacidade</h1>
        <div className="space-y-6 text-gray-700 leading-relaxed font-serif text-lg">
          <section>
            <h2 className="text-2xl font-bold text-brand-brown mb-3">1. Coleta de Dados</h2>
            <p>Coletamos seu endereço de e-mail (para autenticação), o número de telefone (se fornecido para alertas) e as anotações que você insere na plataforma para fornecer o nosso serviço principal.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-brand-brown mb-3">2. Uso de Inteligência Artificial</h2>
            <p>As suas anotações criadas ou áudios gravados são enviados para a API do Google (Gemini) para processamento estrito, classificação estrutural e agendamento. Seus dados nunca são utilizados para treinar modelos abertos públicos.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-brand-brown mb-3">3. Compartilhamento e Serviços Excedentes</h2>
            <p>Seus dados podem transitar através dos nossos parceiros estritos para finalização do serviço contratado: Twilio (para alertas de WhatsApp/SMS) e Stripe (para pagamentos comerciais). Não vendemos nem distribuímos seus dados para redes de anúncios.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-brand-brown mb-3">4. Seus Direitos (LGPD)</h2>
            <p>Você tem o direito de exportar todos os seus dados a qualquer momento ou excluir a sua conta permanentemente através do painel de Configurações do aplicativo. A exclusão também revoga registros mantidos de suas anotações.</p>
          </section>
          <p className="pt-8 text-sm text-gray-500 italic">Última atualização: 19 de Abril de 2026</p>
        </div>
      </div>
    </div>
  );
}
