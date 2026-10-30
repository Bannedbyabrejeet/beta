import React from 'react';
import { ATTACK_PRESETS, PresetId } from './presets';

interface AttackPresetsProps {
  onSelect: (id: PresetId) => void;
}

/** Grilla de escenarios predefinidos. */
export const AttackPresets: React.FC<AttackPresetsProps> = ({ onSelect }) => (
  <div>
    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
      Escenarios Predefinidos:
    </span>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
      {ATTACK_PRESETS.map(({ id, title, subtitle, titleClass, hoverClass }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`p-2.5 rounded-lg bg-black border border-white/10 ${hoverClass} text-slate-200 text-left transition-colors`}
        >
          <div className={`${titleClass} font-bold`}>{title}</div>
          <div className="text-[10px] text-slate-400">{subtitle}</div>
        </button>
      ))}
    </div>
  </div>
);
