import React, { useState } from 'react';
import { 
  Zap, 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  Terminal, 
  Play, 
  Flame, 
  Sparkles,
  Users
} from 'lucide-react';
import { securityEngine } from '../services/securityEngine';
import { EventType } from '../types';

interface AttackSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToConsole: () => void;
}

export const AttackSimulatorModal: React.FC<AttackSimulatorModalProps> = ({
  isOpen,
  onClose,
  onNavigateToConsole
}) => {
  const [targetIp, setTargetIp] = useState<string>('185.220.101.5');
  const [targetUser, setTargetUser] = useState<string>('root');
  const [attempts, setAttempts] = useState<number>(5);
  const [eventType, setEventType] = useState<EventType>('FAILED_PASSWORD');
  const [delayMs, setDelayMs] = useState<number>(300);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLaunchAttack = () => {
    setIsRunning(true);
    securityEngine.simulateAttack({
      ip: targetIp,
      user: targetUser,
      attempts,
      type: eventType,
      delayMs
    });

    setTimeout(() => {
      setIsRunning(false);
      onClose();
      onNavigateToConsole();
    }, attempts * delayMs + 300);
  };

  const applyPreset = (preset: 'bruteforce' | 'whitelist' | 'dictionary' | 'success') => {
    if (preset === 'bruteforce') {
      setTargetIp('198.51.100.42');
      setTargetUser('root');
      setAttempts(5);
      setEventType('FAILED_PASSWORD');
    } else if (preset === 'whitelist') {
      setTargetIp('127.0.0.1');
      setTargetUser('admin');
      setAttempts(6);
      setEventType('FAILED_PASSWORD');
    } else if (preset === 'dictionary') {
      setTargetIp(`45.33.32.${Math.floor(Math.random() * 200) + 10}`);
      setTargetUser('postgres');
      setAttempts(6);
      setEventType('INVALID_USER');
    } else if (preset === 'success') {
      setTargetIp('10.0.0.15');
      setTargetUser('sysadmin');
      setAttempts(1);
      setEventType('ACCEPTED_KEY');
    }
  };

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
                Simulador de Amenazas & Inyector SSH
              </h3>
              <p className="text-xs text-slate-400">
                Genera tráfico sintético hacia <code className="text-emerald-400 font-mono">sshd:22</code> para probar el motor y UFW
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

        {/* Quick Presets */}
        <div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
            Escenarios Predefinidos:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <button
              onClick={() => applyPreset('bruteforce')}
              className="p-2.5 rounded-lg bg-black border border-white/10 hover:border-rose-500/50 text-slate-200 text-left transition-colors"
            >
              <div className="text-rose-400 font-bold">Fuerza Bruta</div>
              <div className="text-[10px] text-slate-400">5 fallos en root</div>
            </button>

            <button
              onClick={() => applyPreset('whitelist')}
              className="p-2.5 rounded-lg bg-black border border-white/10 hover:border-teal-500/50 text-slate-200 text-left transition-colors"
            >
              <div className="text-teal-400 font-bold">Test Whitelist</div>
              <div className="text-[10px] text-slate-400">127.0.0.1 exenta</div>
            </button>

            <button
              onClick={() => applyPreset('dictionary')}
              className="p-2.5 rounded-lg bg-black border border-white/10 hover:border-amber-500/50 text-slate-200 text-left transition-colors"
            >
              <div className="text-amber-400 font-bold">Diccionario</div>
              <div className="text-[10px] text-slate-400">Usuarios inválidos</div>
            </button>

            <button
              onClick={() => applyPreset('success')}
              className="p-2.5 rounded-lg bg-black border border-white/10 hover:border-emerald-500/50 text-slate-200 text-left transition-colors"
            >
              <div className="text-emerald-400 font-bold">Key Aceptada</div>
              <div className="text-[10px] text-slate-400">Acceso legítimo</div>
            </button>
          </div>
        </div>

        {/* Custom Attack Parameters Form */}
        <div className="space-y-4 font-mono text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 block mb-1">IP de Origen Simulada:</label>
              <input
                type="text"
                value={targetIp}
                onChange={(e) => setTargetIp(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Usuario Objetivo:</label>
              <input
                type="text"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 block mb-1">Cantidad de Intentos: ({attempts})</label>
              <input
                type="range"
                min="1"
                max="10"
                value={attempts}
                onChange={(e) => setAttempts(parseInt(e.target.value, 10))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Tipo de Evento Syslog:</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              >
                <option value="FAILED_PASSWORD">FAILED_PASSWORD</option>
                <option value="INVALID_USER">INVALID_USER</option>
                <option value="ACCEPTED_KEY">ACCEPTED_KEY</option>
                <option value="PREAUTH_DISCONNECT">PREAUTH_DISCONNECT</option>
              </select>
            </div>
          </div>

        </div>

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
