import React from 'react';
import { Mail, Clock, Inbox, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthBindings } from './types';

interface ForgotFormProps {
  bindings: AuthBindings;
}

/** US-01.3: solicitud de token de recuperación. */
export const ForgotForm: React.FC<ForgotFormProps> = ({ bindings }) => {
  const {
    emails,
    setMode,
    password,
    forgotEmail,
    setForgotEmail,
    setErrorMessage,
    setShowInboxModal,
    handleForgotSubmit
  } = bindings;

  return (
          <form onSubmit={handleForgotSubmit} className="space-y-4" id="form-forgot-password">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 text-xs font-mono mb-2">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>US-01.3 &amp; US-10: Token Temporal Volátil</span>
              </div>
              <span>Se enviará un correo con un enlace temporal respaldado con el comando <code className="text-amber-300 font-bold">EXPIRE</code> en Redis (TTL 15 min).</span>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Correo Electrónico Registrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  id="forgot-email-input"
                  required
                  placeholder="admin@bannedbyabrejeet.io"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-forgot"
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.25)] cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar Enlace de Recuperación (US-01.3)</span>
            </button>

            <div className="flex items-center justify-between pt-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Iniciar Sesión</span>
              </button>

              {emails.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInboxModal(true)}
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Ver Buzón ({emails.length})</span>
                </button>
              )}
            </div>
          </form>
  );
};
