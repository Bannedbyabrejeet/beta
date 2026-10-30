import React, { useState, useEffect } from 'react';
import { MonitorScreen } from './MonitorScreen';
import { MONITOR_EVENTS } from './monitorEvents';
import { CheckCircle2, Play, RotateCcw, ShieldCheck, Activity } from 'lucide-react';

/** Monitor SOC animado: simula el flujo de detección y mitigación. */
export const ThreatMonitor: React.FC = () => {
  const [terminalStep, setTerminalStep] = useState<number>(0);
  const [isTerminalRunning, setIsTerminalRunning] = useState<boolean>(true);

  useEffect(() => {
    if (!isTerminalRunning) return;
    const timer = setInterval(() => {
      setTerminalStep(prev => (prev < MONITOR_EVENTS.length - 1 ? prev + 1 : 0));
    }, 1500);
    return () => clearInterval(timer);
  }, [isTerminalRunning]);

  const restartTerminal = () => {
    setTerminalStep(0);
    setIsTerminalRunning(true);
  };

  return (
    <div className="mt-14 max-w-4xl mx-auto" id="interactive-terminal-mockup">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
            
            {/* Window Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                </div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  SOC Telemetry Feed • Live Activity
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20 transition-colors cursor-default">
                  DEFENSE: ARMED
                </div>
                <button
                  onClick={() => setIsTerminalRunning(!isTerminalRunning)}
                  className="px-2.5 py-1 text-[11px] font-mono rounded bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white text-slate-300 flex items-center gap-1 border border-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-3 h-3 text-emerald-400" />
                  {isTerminalRunning ? 'Pausar' : 'Reanudar'}
                </button>
                <button
                  onClick={restartTerminal}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-white/10 rounded border border-transparent hover:border-white/10 transition-all active:scale-95 cursor-pointer"
                  title="Reiniciar flujo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Live Stats inside Monitor */}
            <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="group bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-0.5 p-3.5 rounded-lg border border-white/5 transition-all duration-150 cursor-default">
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 uppercase tracking-tighter font-mono transition-colors">Amenazas Mitigadas</div>
                <div className="text-2xl font-mono font-bold text-white group-hover:text-emerald-300 mt-0.5 transition-colors">1,248</div>
              </div>
              <div className="group bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-0.5 p-3.5 rounded-lg border border-white/5 transition-all duration-150 cursor-default">
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 uppercase tracking-tighter font-mono transition-colors">Intentos Bloqueados</div>
                <div className="text-2xl font-mono font-bold text-red-400 group-hover:text-red-300 mt-0.5 transition-colors">14.2k</div>
              </div>
              <div className="group bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-0.5 p-3.5 rounded-lg border border-white/5 transition-all duration-150 cursor-default">
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 uppercase tracking-tighter font-mono transition-colors">Disponibilidad del Servicio</div>
                <div className="text-2xl font-mono font-bold text-emerald-400 group-hover:text-emerald-300 mt-0.5 transition-colors">99.99%</div>
              </div>
              <div className="group bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-0.5 p-3.5 rounded-lg border border-white/5 transition-all duration-150 cursor-default">
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 uppercase tracking-tighter font-mono transition-colors">Latencia de Reacción</div>
                <div className="text-2xl font-mono font-bold text-white group-hover:text-cyan-300 mt-0.5 transition-colors">&lt; 0.2ms</div>
              </div>
            </div>

            <MonitorScreen step={terminalStep} />

            {/* Clean Status bar */}
            <div className="px-6 py-3.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Mitigación automática activa sin intervención manual
              </span>
              <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors cursor-default">
                Kernel Packet Drop
              </span>
            </div>
          </div>
        </div>
  );
};
