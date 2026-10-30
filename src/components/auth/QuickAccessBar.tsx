import React from 'react';
import { Inbox, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthBindings } from './types';

interface QuickAccessBarProps {
  bindings: AuthBindings;
}

/** Atajos de evaluación (Issue #5). */
export const QuickAccessBar: React.FC<QuickAccessBarProps> = ({ bindings }) => {
  const {
    emails,
    setShowInboxModal,
    handleFillValidCreds,
    handleFillInvalidCreds,
    handleTestUnconfigured
  } = bindings;

  return (
      <div className="w-full max-w-md mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/10 font-mono text-xs text-slate-300">
        <div className="flex items-center justify-between mb-2.5 text-slate-400 text-[11px]">
          <span className="font-bold flex items-center gap-1 text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Accesos Rápidos de Evaluación (Issue #5):
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold">Criterios US-01 / US-01.2 / US-01.3 / US-10</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Button 1: Test valid credentials */}
          <button
            onClick={handleFillValidCreds}
            id="btn-test-valid-creds"
            className="p-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-left transition-colors"
          >
            <div className="font-bold text-[11px]">Credenciales Válidas</div>
            <div className="text-[10px] text-slate-400">admin / admin123</div>
          </button>

          {/* Button 2: Test invalid credentials (US-01 rejection) */}
          <button
            onClick={handleFillInvalidCreds}
            id="btn-test-invalid-creds"
            className="p-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-left transition-colors"
          >
            <div className="font-bold text-[11px]">Credenciales Inválidas</div>
            <div className="text-[10px] text-slate-400">Verifica rechazo</div>
          </button>

          {/* Button 3: Test Initial Setup screen (US-01.2) */}
          <button
            onClick={handleTestUnconfigured}
            id="btn-test-unconfigured-setup"
            className="p-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-left transition-colors"
          >
            <div className="font-bold text-[11px]">Probar Cuenta Única</div>
            <div className="text-[10px] text-slate-400">US-01.2 (Sin admin)</div>
          </button>

          {/* Button 4: Open Transactional Email Inbox (US-01.3) */}
          <button
            onClick={() => setShowInboxModal(true)}
            id="btn-test-open-inbox"
            className="p-2 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-left transition-colors"
          >
            <div className="font-bold text-[11px] flex items-center justify-between">
              <span>Buzón de Correos</span>
              {emails.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              )}
            </div>
            <div className="text-[10px] text-slate-400">Tokens temporales ({emails.length})</div>
          </button>
        </div>
      </div>
  );
};
