import React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
}

/** Input de contraseña con botón para mostrar/ocultar. */
export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  value,
  onChange,
  show,
  onToggleShow
}) => (
  <div className="relative">
    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
    <input
      type={show ? 'text' : 'password'}
      id={id}
      required
      placeholder="••••••••••••"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-10 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
    />
    <button
      type="button"
      onClick={onToggleShow}
      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
);
