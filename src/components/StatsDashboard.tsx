import React from 'react';
import { Note } from '../types';
import { Clock, TrendingUp, CheckCircle, Flame, Download, FileJson, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { trackEvent } from '../utils/analytics';

interface StatsDashboardProps {
  notes: Note[];
}

export function StatsDashboard({ notes }: StatsDashboardProps) {
  const completedNotes = notes.filter(n => n.status === 'completed' && n.completedAt);
  const totalNotes = notes.length;
  const completedCount = completedNotes.length;

  const getCompletionTime = (note: Note) => {
    if (!note.completedAt) return null;
    return note.completedAt - note.createdAt;
  };

  const avgCompletionTimeMs = completedNotes.length > 0 
    ? completedNotes.reduce((acc, note) => acc + (getCompletionTime(note) || 0), 0) / completedNotes.length 
    : 0;
  
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = Math.floor(totalWeeks / 4);
    const totalYears = Math.floor(totalMonths / 12);

    const years = totalYears;
    const months = totalMonths % 12;
    const weeks = totalWeeks % 4;
    const days = totalDays % 7;
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;

    const parts = [];
    if (years > 0) parts.push(years === 1 ? '1 ano' : `${years} anos`);
    if (months > 0) parts.push(months === 1 ? '1 mês' : `${months} meses`);
    if (weeks > 0) parts.push(`${weeks} sem`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.slice(0, 3).join(' ');
  };

  // Find most recurrent category
  const categoryCounts = notes.reduce((acc, note) => {
    acc[note.type] = (acc[note.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const handleExportJSON = () => {
    trackEvent('export_triggered', { format: 'json' });
    const dataStr = JSON.stringify(notes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `notas-vivas-export-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportPDF = () => {
    trackEvent('export_triggered', { format: 'pdf' });
    const doc = new jsPDF();
    doc.text('Notas Vivas - Relatório de Anotações', 14, 15);
    doc.setFontSize(10);
    doc.text(`Data da exportação: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

    const tableData = notes.map(n => [
      n.title.substring(0, 40) + (n.title.length > 40 ? '...' : ''),
      n.type,
      n.status === 'completed' ? 'Concluída' : n.status === 'active' ? 'Ativa' : 'Arquivada',
      n.urgency,
      new Date(n.createdAt).toLocaleDateString('pt-BR')
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Título', 'Categoria', 'Status', 'Urgência', 'Criada em']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 36, 34] } // brand-brown
    });

    doc.save(`notas-vivas-relatorio-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white rounded-sm shadow-sm border border-gray-100 p-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-brown">Estatísticas e Exportação</h3>
        <div className="flex gap-2">
          <button 
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-brand-brown rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors border border-gray-200"
            title="Baixar Backup (JSON)"
          >
            <FileJson className="w-3 h-3" />
            <span className="hidden sm:inline">JSON</span>
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-brand-brown rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors border border-gray-200"
            title="Baixar Relatório (PDF)"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main Stats */}
        <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-brown/50">Taxa de Conclusão</p>
            <p className="text-2xl font-serif text-brand-brown">
              {totalNotes > 0 ? Math.round((completedCount / totalNotes) * 100) : 0}%
            </p>
            <p className="text-xs text-brand-brown/60">{completedCount} de {totalNotes} notas</p>
          </div>
        </div>

        <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-brown/50">Tempo Médio de Ação</p>
            <p className="text-2xl font-serif text-brand-brown">
              {completedCount > 0 ? formatTime(avgCompletionTimeMs) : '--'}
            </p>
            <p className="text-xs text-brand-brown/60">Da criação até a conclusão</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-brown/50 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> 
          Insights e Tendências
        </h3>
        
        {topCategories.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-brand-brown/80 mb-2">Categorias mais recorrentes que você costuma anotar:</p>
            {topCategories.map(([category, count], idx) => (
              <div key={category} className="flex items-center gap-3">
                <span className="text-brand-brown/40 font-mono text-xs">{idx + 1}.</span>
                <span className="flex-1 font-serif text-brand-brown">{category}</span>
                <span className="bg-brand-brown/5 text-brand-brown px-2 py-1 text-xs rounded-sm">
                  {count} {count === 1 ? 'nota' : 'notas'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-brown/50 italic">Crie algumas notas para ver os insights.</p>
        )}
      </div>

      {completedNotes.length > 0 && (
        <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6">
           <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-brown/50 mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4" /> 
            Desempenho Recente
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-brand-brown/80">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] uppercase font-bold tracking-widest text-brand-brown/50">
                  <th className="pb-3 truncate px-2">Nota</th>
                  <th className="pb-3 px-2">Criada em</th>
                  <th className="pb-3 px-2">Concluída em</th>
                  <th className="pb-3 px-2 text-right">Tempo Ativa</th>
                </tr>
              </thead>
              <tbody>
                {completedNotes.slice(0, 5).map(note => (
                  <tr key={note.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2 truncate max-w-[150px] font-serif">{note.title}</td>
                    <td className="py-3 px-2 text-xs">{new Date(note.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="py-3 px-2 text-xs">{note.completedAt ? new Date(note.completedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '--'}</td>
                    <td className="py-3 px-2 text-right text-xs font-mono">
                      {note.completedAt ? formatTime(note.completedAt - note.createdAt) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
