import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function Terms() {
  return (
    <div className="min-h-screen font-sans text-gray-900 bg-brand-light p-6 md:p-12 relative overflow-hidden">
      {/* Decoração estática suave */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-brown/5 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-brand-gold hover:text-brand-brown transition-colors mb-8 text-sm font-bold tracking-widest uppercase">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Início
        </Link>
        <h1 className="text-4xl md:text-5xl font-serif font-semibold text-brand-brown mb-6 pt-4">Termos de Uso</h1>
        <div className="space-y-6 text-gray-700 leading-relaxed font-serif text-lg">
          <section>
            <h2 className="text-2xl font-bold text-brand-brown mb-3">1. Aceitação dos Termos</h2>
            <p>Ao criar uma conta e utilizar o Notas Vivas, você concorda legalmente em seguir estes termos de uso.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-brand-brown mb-3">2. Uso do Serviço</h2>
            <p>O Notas Vivas utiliza inteligência artificial (Gemini) e envio de mensagens programadas. Você concorda em não utilizar o serviço para propósitos ilegais, não gerar conteúdo abusivo ou tentar comprometer a infraestrutura do aplicativo.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-brand-brown mb-3">3. Assinaturas e Cancelamento</h2>
            <p>Ao assinar o plano Pro, você concorda com a cobrança recorrente automática. O cancelamento pode ser feito a qualquer momento antes do próximo ciclo de faturamento na aba Configurações.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-brand-brown mb-3">4. Limitação de Responsabilidade</h2>
            <p>Não nos responsabilizamos pela perda de eventuais dados ou por falhas na entrega de lembretes (ex: indisponibilidade da operadora de mensagens).</p>
          </section>
          <p className="pt-8 text-sm text-gray-500 italic">Última atualização: 19 de Abril de 2026</p>
        </div>
      </div>
    </div>
  );
}
