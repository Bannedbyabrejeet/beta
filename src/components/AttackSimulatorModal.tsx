import React, { useState } from 'react';
import { Zap, X, Play } from 'lucide-react';
import { securityEngine } from '../services/securityEngine';
import { AttackParams, INITIAL_PARAMS, PresetId, resolvePreset } from './attack/presets';
import { AttackPresets } from './attack/AttackPresets';
import { AttackParamsForm } from './attack/AttackParamsForm';

interface AttackSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToConsole: () => void;
}

/**
 * Modal del simulador de ataques. Envía los eventos al motor REAL
 * (Backend B -> Redis -> UFW).
 */
export const AttackSimulatorModal: React.FC<AttackSimulatorModalProps> = ({
  isOpen,
  onClose,
  onNavigateToConsole
}) => {
  const [params, setParams] = useState<AttackParams>(INITIAL_PARAMS);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLaunchAttack = async () => {
    setIsRunning(true);
    await securityEngine.simulateAttack({
      ip: params.ip,
      user: params.user,
      attempts: params.attempts,
      type: params.type,
      delayMs: 300
    });

    setTimeout(() => {
      setIsRunning(false);
      onClose();
      onNavigateToConsole();
    }, 400);
  };

  const applyPreset = (id: PresetId) => setParams(resolvePreset(id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl space-y-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Simulador de Amenazas &amp; Inyector SSH
              </h3>
              <p className="text-xs text-slate-400">
                Genera tráfico sintético hacia{' '}
                <code className="text-emerald-400 font-mono">sshd:22</code> para probar el motor y UFW
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AttackPresets onSelect={applyPreset} />

        <AttackParamsForm params={params} onChange={setParams} />

        {/* Footer CTAs */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-[11px] font-mono text-slate-500">
            Los eventos se parsearán y evaluarán contra Redis en tiempo real.
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-white/5 border border-white/10 text-slate-300 text-xs font-mono hover:bg-white/10"
            >
              Cancelar
            </button>

            <button
              onClick={handleLaunchAttack}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-rose-500 text-black font-bold text-xs font-mono hover:bg-rose-400 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Inyectando Paquetes...' : 'Lanzar Simulación'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
