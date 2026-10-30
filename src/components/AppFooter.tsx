import React from 'react';
import { ShieldAlert } from 'lucide-react';

/** Pie de página global del proyecto. */
export const AppFooter: React.FC = () => (
  <footer className="border-t border-white/5 bg-[#050505]/90 backdrop-blur-md py-6 px-4 sm:px-6 lg:px-8 text-xs font-mono text-slate-500">
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-emerald-400" />
        <span className="text-slate-300 font-bold tracking-tight">BANNEDBYABREJEET</span>
        <span className="text-slate-500">— Autonomous SSH Defense System</span>
      </div>

      <div className="text-slate-400 text-center sm:text-right text-[11px]">
        Desarrollado por <strong className="text-slate-200">Santiago Mulet</strong> &amp;{' '}
        <strong className="text-slate-200">Manuel Abrego</strong>
        <span className="ml-3 text-emerald-400/60 font-mono">v2.4.0-Stable</span>
      </div>
    </div>
  </footer>
);
