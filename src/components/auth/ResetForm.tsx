import React from 'react';
import { Lock, KeyRound, ArrowRight, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthBindings } from './types';

interface ResetFormProps {
  bindings: AuthBindings;
}

/** US-10: confirmación de la nueva contraseña con token. */
export const ResetForm: React.FC<ResetFormProps> = ({ bindings }) => {
  const {
    setMode,
    password,
    activeResetToken,
    setActiveResetToken,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    tokenTtlSeconds,
    handleResetSubmit,
    handleSimulateTtlExpire
  } = bindings;

  return (
          <form onSubmit={handleResetSubmit} className="space-y-4" id="form-reset-password">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estado del Token en Redis (US-10):</span>
                </span>
                <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                  tokenTtlSeconds > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {tokenTtlSeconds > 0 ? `TTL: ${tokenTtlSeconds}s` : 'CADUCADO (0s)'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Key Redis: <code className="text-amber-300 font-mono">auth:reset_token:{activeResetToken.substring(0, 16)}...</code>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Token Temporal de Recuperación
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  id="reset-token-input"
                  required
                  placeholder="rst_..."
                  value={activeResetToken}
                  onChange={(e) => setActiveResetToken(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  id="reset-new-password-input"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <CheckCircle2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  id="reset-confirm-password-input"
                  required
                  placeholder="••••••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-reset-password"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] cursor-pointer"
            >
              <span>Confirmar y Actualizar Contraseña</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between pt-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateTtlExpire}
                className="text-rose-400 hover:text-rose-300 underline text-[11px]"
                title="Prueba de Criterio US-10: Hace que el token expire a 0s de inmediato"
              >
                Simular Expiración TTL (0s)
              </button>
            </div>
          </form>
  );
};
