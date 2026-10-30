import React from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthBindings } from './types';
import { PasswordField } from './PasswordField';

interface LoginFormProps {
  bindings: AuthBindings;
}

/** US-01: login del administrador. */
export const LoginForm: React.FC<LoginFormProps> = ({ bindings }) => {
  const {
    setMode,
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    setErrorMessage,
    setSuccessMessage,
    handleLoginSubmit
  } = bindings;

  return (
          <form onSubmit={handleLoginSubmit} className="space-y-4" id="form-admin-login">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Usuario o Correo Electrónico
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  id="login-username-input"
                  required
                  placeholder="admin"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-300">
                  Contraseña
                </label>
                <button
                  type="button"
                  id="btn-forgot-password-link"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  ¿Olvidé mi contraseña?
                </button>
              </div>
              <PasswordField
                id="login-password-input"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
              />
            </div>

            <button
              type="submit"
              id="btn-submit-login"
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] mt-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Iniciar Sesión en Dashboard</span>
            </button>
          </form>
  );
};
