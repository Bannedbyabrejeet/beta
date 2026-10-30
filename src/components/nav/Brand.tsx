import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface BrandProps {
  onGoHome: () => void;
}

/** Identidad del proyecto (logo + versión + autores). */
export const Brand: React.FC<BrandProps> = ({ onGoHome }) => (
  <div
    onClick={onGoHome}
    className="flex items-center gap-2.5 cursor-pointer group"
    id="nav-brand-logo"
  >
    <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
      <ShieldAlert className="w-5 h-5 text-black" />
    </div>
    <div>
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold tracking-tight text-lg text-white">
          BANNEDBYABREJEET
        </span>
        <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
          v2.4-UFW
        </span>
      </div>
      <span className="text-[10px] font-mono text-slate-500 block -mt-0.5">
        Mulet &amp; Abrego
      </span>
    </div>
  </div>
);
