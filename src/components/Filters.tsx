import React, { useState } from 'react';
import { Search, Filter, SortDesc, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

interface FiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterType: string;
  setFilterType: (val: string) => void;
  filterUrgency: string;
  setFilterUrgency: (val: string) => void;
  sortBy: 'manual' | 'recent' | 'oldest' | 'urgency' | 'deadline';
  setSortBy: (val: 'manual' | 'recent' | 'oldest' | 'urgency' | 'deadline') => void;
}

export function Filters({
  searchQuery, setSearchQuery,
  filterType, setFilterType,
  filterUrgency, setFilterUrgency,
  sortBy, setSortBy
}: FiltersProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasActiveFilters = searchQuery !== '' || filterType !== 'all' || filterUrgency !== 'all' || sortBy !== 'manual';

  return (
    <div className="bg-white rounded-sm shadow-sm border border-gray-100 overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-brand-brown">
          <Filter className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {t('search_and_filters', { defaultValue: 'Buscar e Filtrar' })}
          </span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-brand-gold ml-2" title="Filtros ativos"></span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-brand-brown/40" /> : <ChevronDown className="w-4 h-4 text-brand-brown/40" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100"
          >
            <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
              {/* Search */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brown/40" />
        <input 
          type="text"
          placeholder={t('search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-50 border border-gray-100 rounded-sm pl-9 pr-4 py-2 text-sm font-sans text-brand-brown outline-none focus:border-brand-gold transition-colors placeholder:text-gray-400"
        />
      </div>

      <div className="flex flex-wrap gap-3 w-full md:w-auto">
        {/* Type Filter */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-sm px-3 py-1.5 focus-within:border-brand-gold transition-colors">
          <Filter className="w-3.5 h-3.5 text-brand-brown/40" />
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent outline-none text-xs text-brand-brown font-medium cursor-pointer"
          >
            <option value="all">{t('filter_type')}</option>
            <option value="tarefa">{t('task', { defaultValue: 'Tarefa' })}</option>
            <option value="lista de compras">{t('shopping_list', { defaultValue: 'Compras' })}</option>
            <option value="ideia">{t('idea', { defaultValue: 'Ideia' })}</option>
            <option value="lembrete">{t('reminder', { defaultValue: 'Lembrete' })}</option>
          </select>
        </div>

        {/* Urgency Filter */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-sm px-3 py-1.5 focus-within:border-brand-gold transition-colors">
          <select 
            value={filterUrgency} 
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="bg-transparent outline-none text-xs text-brand-brown font-medium cursor-pointer"
          >
            <option value="all">{t('filter_urgency')}</option>
            <option value="baixa">{t('low')}</option>
            <option value="média">{t('medium')}</option>
            <option value="alta">{t('high')}</option>
            <option value="crítica">{t('critical')}</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-sm px-3 py-1.5 focus-within:border-brand-gold transition-colors">
          <SortDesc className="w-3.5 h-3.5 text-brand-brown/40" />
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent outline-none text-xs text-brand-brown font-medium cursor-pointer"
          >
            <option value="manual">{t('sort_manual', { defaultValue: 'Manual' })}</option>
            <option value="recent">{t('sort_recent')}</option>
            <option value="oldest">{t('sort_oldest')}</option>
            <option value="urgency">{t('sort_urgency')}</option>
            <option value="deadline">{t('sort_deadline')}</option>
          </select>
        </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
