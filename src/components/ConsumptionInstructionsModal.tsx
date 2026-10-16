import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ArrowLeft, Heart, Globe, Sparkles, Check, Copy, Cake, UtensilsCrossed } from 'lucide-react';
import { 
  CONSUMPTION_INSTRUCTIONS, 
  InstructionId, 
  InstructionLang,
  buildInstructionWhatsAppMessage 
} from '../data/consumptionInstructions';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  brandName?: string;
  initialItem?: InstructionId | null;
}

export const ConsumptionInstructionsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  brandName = 'Andréia Cakes',
  initialItem = null
}) => {
  const [selectedId, setSelectedId] = useState<InstructionId | null>(initialItem);
  const [lang, setLang] = useState<InstructionLang>('en');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentItem = selectedId 
    ? CONSUMPTION_INSTRUCTIONS.find(i => i.id === selectedId) || null 
    : null;

  const handleCopyText = (id: InstructionId) => {
    const text = buildInstructionWhatsAppMessage(id, lang, brandName);
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(lang === 'pt' ? 'Orientações copiadas com sucesso!' : 'Instructions copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-[#FDF8F5] rounded-3xl shadow-2xl border border-[#EADBCE] overflow-hidden flex flex-col max-h-[90vh] z-10 font-sans"
      >
        {/* Top Decorative Tag Banner */}
        <div className="bg-[#FAF0E8] border-b border-[#EADBCE] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#BD5944]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#BD5944]">
              {lang === 'pt' ? 'Instruções de Consumo & Cuidados' : 'Care & Consumption Guidelines'}
            </span>
          </div>

          {/* Discreet Language Switcher */}
          <div className="flex items-center gap-1 bg-white/90 p-0.5 rounded-full border border-[#EADBCE] shadow-xs">
            <button
              type="button"
              onClick={() => setLang('pt')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                lang === 'pt' 
                  ? 'bg-[#BD5944] text-white shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Ler em Português"
            >
              <span>🇧🇷</span>
              <span>PT</span>
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                lang === 'en' 
                  ? 'bg-[#BD5944] text-white shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Read in English"
            >
              <span>🇺🇸</span>
              <span>EN</span>
            </button>
          </div>
        </div>

        {/* Modal Main Header */}
        <div className="p-4 sm:p-5 border-b border-[#EADBCE] bg-[#FDF8F5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedId && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="w-8 h-8 rounded-full bg-white border border-[#EADBCE] text-[#BD5944] hover:bg-[#FAF0E8] transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                title={lang === 'pt' ? 'Voltar para as opções' : 'Back to options'}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-[#342825] tracking-tight">
                {selectedId && currentItem 
                  ? currentItem.title[lang]
                  : (lang === 'pt' ? 'Instruções de Consumo' : 'Consumption Instructions')}
              </h2>
              <p className="text-xs text-[#7A6761] mt-0.5">
                {selectedId && currentItem
                  ? currentItem.subtitle[lang]
                  : (lang === 'pt' 
                      ? 'Selecione abaixo o item que você deseja orientações:' 
                      : 'Select an item below to view specific storage & serving tips:')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#EADBCE] text-stone-500 hover:text-stone-900 hover:bg-[#FAF0E8] transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 ml-2"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-[#FDF8F5]">
          {!selectedId ? (
            /* LEVEL 1: 3 Big Clickable Cards */
            <div className="space-y-3.5 py-1">
              {CONSUMPTION_INSTRUCTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="w-full text-left p-4 sm:p-5 rounded-2xl bg-white border border-[#EADBCE] hover:border-[#BD5944] hover:bg-[#FAF0E8]/40 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-13 h-13 rounded-2xl bg-[#FAF0E8] border border-[#EADBCE] text-[#BD5944] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      {item.id === 'cake' ? (
                        <Cake size={24} />
                      ) : item.id === 'caseirinhos' ? (
                        <UtensilsCrossed size={22} />
                      ) : (
                        <Sparkles size={22} />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#BD5944] block mb-0.5">
                        {item.badge[lang]}
                      </span>
                      <h3 className="text-base sm:text-lg font-serif font-black text-[#342825] group-hover:text-[#BD5944] transition-colors">
                        {item.title[lang]}
                      </h3>
                      <p className="text-xs text-[#7A6761] line-clamp-1 mt-0.5">
                        {item.subtitle[lang]}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-[#FAF0E8] text-[#BD5944] group-hover:bg-[#BD5944] group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                    <ChevronRight size={16} />
                  </div>
                </button>
              ))}

              {/* Informative footer tip */}
              <div className="p-4 rounded-2xl bg-white/70 border border-[#EADBCE]/80 text-center">
                <p className="text-xs text-[#7A6761]">
                  {lang === 'pt' 
                    ? 'Nossas receitas são feitas artesanalmente sem conservantes para proporcionar máxima qualidade.' 
                    : 'Our treats are freshly handcrafted without artificial preservatives for peak quality.'}
                </p>
              </div>
            </div>
          ) : currentItem ? (
            /* LEVEL 2: Detailed Instruction View with Sub-tabs */
            <div className="space-y-5 animate-fade-in">
              {/* Quick Tab Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/90 rounded-2xl border border-[#EADBCE] shadow-xs">
                {CONSUMPTION_INSTRUCTIONS.map(tab => {
                  const isSelected = selectedId === tab.id;
                  const tabWord = tab.id === 'cake' 
                    ? (lang === 'pt' ? 'Bolos & Tortas' : 'Cakes & Tortes')
                    : tab.id === 'caseirinhos' 
                    ? (lang === 'pt' ? 'Caseirinhos' : 'Loaf Cakes')
                    : 'Brigadeiros';

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedId(tab.id)}
                      className={`py-2.5 px-1 sm:px-2 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center leading-tight ${
                        isSelected
                          ? 'bg-[#BD5944] text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-950 hover:bg-[#FAF0E8]'
                      }`}
                    >
                      <span>{tabWord}</span>
                    </button>
                  );
                })}
              </div>

              {/* Card Container styled like Imagem 4 */}
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#EADBCE] shadow-sm space-y-6">
                {/* Intro note */}
                <div className="p-3.5 rounded-2xl bg-[#FAF0E8] border border-[#EADBCE] text-[#342825] text-xs sm:text-sm font-medium leading-relaxed">
                  {currentItem.intro[lang]}
                </div>

                {/* Structured Sections */}
                <div className="space-y-4">
                  {currentItem.sections[lang].map((sec, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 rounded-2xl bg-[#FDF8F5] border border-[#EADBCE]/70 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        {sec.icon && <span className="text-base">{sec.icon}</span>}
                        <h4 className="font-serif font-black text-sm sm:text-base text-[#342825]">
                          {sec.heading}
                        </h4>
                      </div>
                      <div className="space-y-1.5 text-xs sm:text-sm text-[#54423D] leading-relaxed">
                        {sec.paragraphs.map((p, pIdx) => (
                          <p key={pIdx}>{p}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Important notice if any */}
                {currentItem.importantNotice && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm font-medium leading-relaxed">
                    ⚠️ {currentItem.importantNotice[lang]}
                  </div>
                )}

                {/* Heartfelt Brand Signature */}
                <div className="pt-4 border-t border-[#EADBCE] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                  <div>
                    <span className="text-xs text-[#7A6761] block">
                      {lang === 'pt' ? 'Feito com carinho por' : 'Handcrafted with love by'}
                    </span>
                    <span className="font-serif font-bold text-base text-[#342825]">
                      {brandName} 🤎
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyText(currentItem.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#FAF0E8] text-[#BD5944] border border-[#EADBCE] hover:bg-[#BD5944] hover:text-white transition-all cursor-pointer shadow-xs"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? (lang === 'pt' ? 'Copiado!' : 'Copied!') : (lang === 'pt' ? 'Copiar Orientações' : 'Copy Text')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#EADBCE] bg-[#FAF0E8]/70 flex items-center justify-between">
          <span className="text-[11px] text-[#7A6761] italic">
            {brandName} • {lang === 'pt' ? 'Instruções de Consumo' : 'Consumption Guide'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#342825] text-white hover:bg-[#BD5944] transition-all cursor-pointer shadow-xs"
          >
            {lang === 'pt' ? 'Fechar' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
