import React from 'react';
import { motion } from 'motion/react';
import { MONITOR_EVENTS } from './monitorEvents';

interface MonitorScreenProps {
  step: number;
}

const COLOR_BY_TYPE: Record<string, string> = {
  info: 'text-cyan-400 opacity-80',
  warn: 'text-yellow-400',
  metric: 'text-emerald-400',
  alert: 'text-red-400 font-bold bg-red-500/10 px-1 py-0.5 rounded inline-block',
  exec: 'text-red-400 font-medium',
  success: 'text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded inline-block font-semibold',
  redis: 'text-slate-400'
};

/** Pantalla del monitor con los eventos revelados hasta el paso actual. */
export const MonitorScreen: React.FC<MonitorScreenProps> = ({ step }) => (
  <div className="p-6 pt-3">
              <div className="bg-black rounded-lg border border-white/10 overflow-hidden">
                <div className="bg-white/5 px-4 py-2 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">ACTIVIDAD DE EVENTOS EN TIEMPO REAL</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    CONEXIÓN SEGURA
                  </span>
                </div>
                <div className="p-4 font-mono text-xs sm:text-[13px] leading-relaxed space-y-1 h-[230px] overflow-y-auto bg-black text-emerald-500/90 select-none">
                  {MONITOR_EVENTS.slice(0, step + 1).map((step, idx) => {
                    let colorClass = 'text-slate-300';
                    if (step.type === 'info') colorClass = 'text-cyan-400 opacity-80';
                    if (step.type === 'warn') colorClass = 'text-yellow-400';
                    if (step.type === 'metric') colorClass = 'text-emerald-400';
                    if (step.type === 'alert') colorClass = 'text-red-400 font-bold bg-red-500/10 px-1 py-0.5 rounded inline-block';
                    if (step.type === 'exec') colorClass = 'text-red-400 font-medium';
                    if (step.type === 'success') colorClass = 'text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded inline-block font-semibold';
                    if (step.type === 'redis') colorClass = 'text-slate-400';

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`${colorClass} hover:bg-white/[0.06] hover:pl-2 rounded px-1.5 py-0.5 transition-all duration-150 cursor-pointer`}
                      >
                        {step.text}
                      </motion.div>
                    );
                  })}
                  <div className="flex items-center gap-1 text-slate-400 pt-1">
                    <span className="text-xs text-emerald-400 font-bold">[ESCUDO ACTIVO]</span>
                    <span className="text-xs">Inspeccionando tráfico perimetral...</span>
                    <span className="w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
                  </div>
                </div>
              </div>

              {/* Status footer inside screen */}
              <div className="mt-4 flex gap-4 items-center px-3 py-1.5 bg-white/5 rounded-full border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full rounded-full"></div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 whitespace-nowrap font-medium">PROTECCIÓN: 100% OPERATIVA</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
            </div>
);
