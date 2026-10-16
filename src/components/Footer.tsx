import React from 'react';
import { motion } from 'motion/react';

interface FooterProps {
  primaryColor?: string;
  tagTitle?: string;
  tagLogo?: string;
  tagUrl?: string;
}

export default function Footer({ 
  primaryColor = '#865d39',
  tagTitle,
  tagLogo,
  tagUrl
}: FooterProps) {
  const activeColor = primaryColor || '#865d39';
  const fixedTagTitle = tagTitle || 'ALUNO(A)/MENTORADO(A)';
  const isCustomUrl = tagUrl && !tagUrl.includes('andreiacakesusa') && tagUrl !== 'https://andreiacakesusa.com/';
  const fixedTagUrl = isCustomUrl ? tagUrl : 'https://www.instagram.com/gabissweets/';
  const isCustomLogo = tagLogo && !tagLogo.includes('IMG-6643') && !tagLogo.includes('Whats-App-Image') && !tagLogo.includes('andreia-cakes-tag');
  const fixedTagLogo = isCustomLogo ? tagLogo : 'https://i.ibb.co/1YHhXv0b/patitour-2026-10-13-T110847-317.png';

  return (
    <footer className="w-full py-8 flex flex-col items-center justify-center gap-4 mt-auto">
      {/* Tag Fixa Aluno(a) / Mentorado(a) */}
      <a 
        href={fixedTagUrl}
        target="_blank" 
        rel="noopener noreferrer"
        className="mb-2 flex flex-col items-center justify-between rounded-2xl bg-[#fdf8f5] border-2 hover:opacity-95 active:scale-98 transition-all text-center w-[184px] min-h-[92px] cursor-pointer shadow-md overflow-hidden pt-2.5 pb-2 px-3"
        style={{ borderColor: '#E9A7B6' }}
        title="Gabi´s sweets"
      >
        <span 
          className="text-[9px] font-extrabold tracking-[0.2em] uppercase select-none px-1 mb-1 leading-tight"
          style={{ color: '#E9A7B6' }}
        >
          {fixedTagTitle}
        </span>
        <div className="w-full flex-1 flex items-center justify-center overflow-hidden bg-transparent py-0.5">
          <img 
            src={fixedTagLogo} 
            alt="Gabi´s sweets" 
            className="h-[56px] max-h-[60px] w-auto max-w-[160px] object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </a>

      {/* Developed By - Easy Byz Creator with fixed color #342825 & reduced spacing */}
      <div className="flex flex-col items-center justify-center">
        <p 
          className="text-[10px] tracking-[0.2em] font-sans font-bold uppercase select-none mb-0.5 leading-none"
          style={{ color: '#342825' }}
        >
          POWERED BY
        </p>
        <a 
          href="https://easybyzcreator.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group block"
          title="Easy Byz Creator"
        >
          <motion.div
            className="w-[105px] h-[90px] flex items-center justify-center"
            initial={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div 
              className="w-full h-full"
              style={{
                backgroundColor: '#342825',
                WebkitMaskImage: 'url(https://i.ibb.co/Kj1CTDrD/patitour-2026-04-11-T125246-010.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'top center',
                maskImage: 'url(https://i.ibb.co/Kj1CTDrD/patitour-2026-04-11-T125246-010.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'top center'
              }}
            />
          </motion.div>
        </a>
      </div>
    </footer>
  );
}
