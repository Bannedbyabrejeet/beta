import React from 'react';
import { Lock, Mail, User, KeyRound, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthBindings } from './types';
import { PasswordField } from './PasswordField';

interface SetupFormProps {
  bindings: AuthBindings;
}

/** US-01.2: alta de la cuenta única de administrador. */
export const SetupForm: React.FC<SetupFormProps> = ({ bindings }) => {
  const {
    password,
    showPassword,
    setShowPassword,
    setupUsername,
    setSetupUsername,
    setupEmail,
    setSetupEmail,
    setupPassword,
    setSetupPassword,
    setupConfirmPassword,
    setSetupConfirmPassword,
    handleSetupSubmit
  } = bindings;

  return (
          <form onSubmit={handleSetupSubmit} className="space-y-4" id="form-admin-setup">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-mono mb-2">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>US-01.2: Set de Credenciales Iniciales</span>
              </div>
              <span>No existe ningún administrador registrado previamente. Cree la cuenta única principal para continuar.</span>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Nombre de Usuario Único
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  id="setup-username-input"
                  required
                  placeholder="ej. admin"
                  value={setupUsername}
                  onChange={(e) => setSetupUsername(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Correo Electrónico de Seguridad (Para Recuperación)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  id="setup-email-input"
                  required
                  placeholder="admin@bannedbyabrejeet.io"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Contraseña Maestra
              </label>
              <PasswordField
                id="setup-password-input"
                value={setupPassword}
                onChange={setSetupPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Confirmar Contraseña
              </label>
              <PasswordField
                id="setup-confirm-password-input"
                value={setupConfirmPassword}
                onChange={setSetupConfirmPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
              />
            </div>

            <button
              type="submit"
              id="btn-submit-create-admin"
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] mt-2 cursor-pointer"
            >
              <span>Crear Cuenta Única de Administrador</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
  );
};
