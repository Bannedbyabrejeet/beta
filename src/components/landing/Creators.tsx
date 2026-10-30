import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CreatorsProps {
  isAuthenticated: boolean;
  onNavigateToDashboard: () => void;
}

/** Sección de autores con CTA final. */
export const Creators: React.FC<CreatorsProps> = ({ isAuthenticated, onNavigateToDashboard }) => (
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5">
        <div className="bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 p-8 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-200">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs mb-2 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>SISTEMA AUTÓNOMO DE PROTECCIÓN PERIMETRAL SSH</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              Bannedbyabrejeet Perimeter Engine
            </h3>
            <p className="text-slate-400 text-sm">
              Diseñado e implementado por <strong className="text-slate-200">Santiago Mulet</strong> y <strong className="text-slate-200">Manuel Abrego</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToDashboard}
              className="px-6 py-2.5 rounded-md font-semibold bg-emerald-500 text-black hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] active:translate-y-0 active:scale-[0.98] transition-all text-xs font-mono cursor-pointer duration-150"
            >
              {isAuthenticated ? 'Acceder al Dashboard' : 'Iniciar Sesión'}
            </button>
          </div>
        </div>
      </section>
);
