import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Send, Copy, Check, MessageSquare, Globe, Heart, ShieldCheck } from 'lucide-react';
import { 
  CONSUMPTION_INSTRUCTIONS, 
  InstructionId, 
  InstructionLang,
  buildInstructionWhatsAppMessage 
} from '../data/consumptionInstructions';
import { Order } from '../types';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  brandName?: string;
  countryCode?: string;
}

export const SendInstructionToCustomerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  brandName = 'Andréia Cakes',
  countryCode = '+1'
}) => {
  const [selectedInstruction, setSelectedInstruction] = useState<InstructionId>('cake');
  const [lang, setLang] = useState<InstructionLang>('pt');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const customerName = (order.isB2B || order.isPJ 
    ? (order.b2bCompanyName || order.customerName) 
    : order.customerName) || 'Cliente';

  const cleanPhone = (order.phone || '').replace(/\D/g, '');

  const messageText = buildInstructionWhatsAppMessage(
    selectedInstruction,
    lang,
    brandName,
    customerName
  );

  const handleSendWhatsApp = () => {
    if (!cleanPhone) {
      toast.error('Este pedido não possui telefone/WhatsApp cadastrado.');
      return;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp para enviar orientações...');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success('Texto copiado com sucesso!');
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] z-10 font-sans"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0 shadow-xs">
              <MessageSquare size={20} className="text-amber-800" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-black text-gray-900 leading-tight">
                Enviar Instruções de Consumo
              </h2>
              <p className="text-xs text-gray-500">
                Selecione o guia e o idioma para enviar diretamente no WhatsApp do cliente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {/* Customer summary pill */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold uppercase text-[10px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                Cliente
              </span>
              <span className="font-bold text-gray-900">{customerName}</span>
            </div>
            <div className="text-gray-600 font-semibold">
              WhatsApp: <span className="font-mono text-gray-900">{order.phone || 'Não informado'}</span>
            </div>
          </div>

          {/* 1. Escolha do Idioma */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Globe size={14} className="text-[#BD5944]" />
              <span>1. Escolha o Idioma do Envio</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLang('pt')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  lang === 'pt'
                    ? 'bg-[#BD5944] text-white border-[#BD5944] shadow-md ring-2 ring-amber-300'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>🇧🇷</span>
                <span>Português</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  lang === 'en'
                    ? 'bg-[#BD5944] text-white border-[#BD5944] shadow-md ring-2 ring-amber-300'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>🇺🇸</span>
                <span>English (Inglês)</span>
              </button>
            </div>
          </div>

          {/* 2. Escolha da Instrução */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-gray-700">
              2. Escolha qual Guia Enviar
            </label>
            <div className="space-y-2">
              {CONSUMPTION_INSTRUCTIONS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedInstruction(item.id)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selectedInstruction === item.id
                      ? 'bg-amber-50/70 border-[#BD5944] shadow-sm ring-1 ring-[#BD5944]'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-1.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
                      {item.icon}
                    </span>
                    <div>
                      <div className="font-serif font-black text-sm text-gray-900">
                        {item.title[lang]}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {item.badge[lang]}
                      </div>
                    </div>
                  </div>

                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedInstruction === item.id
                      ? 'border-[#BD5944] bg-[#BD5944] text-white'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {selectedInstruction === item.id && <Check size={12} className="stroke-[3]" />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Pré-visualização da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-gray-700">
                3. Prévia da Mensagem Formatada
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl max-h-48 overflow-y-auto text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
              {messageText}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-xs hover:bg-gray-100 transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!cleanPhone}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs text-white shadow-md transition-all cursor-pointer ${
              cleanPhone
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={15} />
            <span>Enviar pelo WhatsApp</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
