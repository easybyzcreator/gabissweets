import React from 'react';
import { GraduationCap, Sparkles } from 'lucide-react';
import { Settings } from '../types';

interface ChefCoursesProps {
  settings?: Settings;
}

export default function ChefCourses({ settings }: ChefCoursesProps) {
  const primaryColor = settings?.primaryColor || '#865d39';

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in font-sans">
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-pink-100 shadow-xl p-8 sm:p-14 text-center flex flex-col items-center justify-center space-y-6">
        <div 
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-md text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <GraduationCap size={42} />
        </div>

        <div className="space-y-3 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-[#E9A7B6] text-xs font-bold uppercase tracking-widest">
            <Sparkles size={13} />
            <span>Em Breve</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-gray-800">
            Cursos da Chef Gabi
          </h2>
          <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
            Esta seção está reservada para os novos cursos, masterclasses e treinamentos exclusivos da Gabi's Sweets.
          </p>
        </div>

        <div className="pt-6 border-t border-gray-100 w-full max-w-md">
          <p className="text-xs text-gray-400">
            Aguardando novas instruções e catálogo de cursos da Gabi.
          </p>
        </div>
      </div>
    </div>
  );
}
