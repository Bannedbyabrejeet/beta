import React from 'react';
import { Mail, Inbox, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthBindings } from './types';

interface InboxModalProps {
  bindings: AuthBindings;
}

/** Bandeja de correo simulada con los tokens de recuperación. */
export const InboxModal: React.FC<InboxModalProps> = ({ bindings }) => {
  const {
    emails,
    setMode,
    setActiveResetToken,
    setErrorMessage,
    showInboxModal,
    setShowInboxModal
  } = bindings;

  return (
      <AnimatePresence>
        {showInboxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white text-sm">Buzón Transaccional (SMTP Simulado)</span>
                </div>
                <button
                  onClick={() => setShowInboxModal(false)}
                  className="text-slate-400 hover:text-white px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>

              {/* Email List */}
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                {emails.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <span>No hay correos en la bandeja de entrada.</span>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Haga clic en "¿Olvidé mi contraseña?" y solicite un enlace de recuperación.
                    </p>
                  </div>
                ) : (
                  emails.map((mail) => (
                    <div
                      key={mail.id}
                      className="p-4 rounded-xl bg-black border border-purple-500/30 space-y-3"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-purple-300 font-bold">{mail.subject}</span>
                        <span>{new Date(mail.sentAt).toLocaleTimeString()}</span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1">
                        <div>De: <span className="text-emerald-400">{mail.from}</span></div>
                        <div>Para: <span className="text-slate-200">{mail.to}</span></div>
                      </div>

                      <div className="p-2.5 rounded bg-white/[0.02] border border-white/5 text-[11px] text-slate-300 whitespace-pre-wrap">
                        {mail.content}
                      </div>

                      {/* Token details and Quick Action */}
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-300 font-bold text-[11px]">Token Temporal en Redis:</span>
                          <span className="text-amber-400 text-[10px] font-bold">
                            EXPIRE 900s
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-200 bg-black/60 p-1.5 rounded break-all border border-amber-500/30">
                          {mail.token}
                        </div>

                        <button
                          onClick={() => {
                            setActiveResetToken(mail.token);
                            setMode('reset');
                            setShowInboxModal(false);
                            setErrorMessage(null);
                          }}
                          className="w-full mt-2 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Enlace de Recuperación (US-01.3)</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-white/5 bg-black flex items-center justify-between text-[11px] text-slate-400">
                <span>Persistencia: <code className="text-amber-400">auth:reset_token:&lt;TOKEN&gt;</code></span>
                <button
                  onClick={() => setShowInboxModal(false)}
                  className="px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
};
