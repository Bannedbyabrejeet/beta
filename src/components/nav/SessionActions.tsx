import React from 'react';
import { Zap, LogOut, KeyRound } from 'lucide-react';
import { AdminUser } from '../../types';

interface SessionActionsProps {
  adminUser: AdminUser;
  onOpenAttackModal: () => void;
  onLogout: () => void;
  onLogin: () => void;
}

/**
 * Acciones de la derecha: simulador de ataque, estado de la sesión y logout.
 */
export const SessionActions: React.FC<SessionActionsProps> = ({
  adminUser,
  onOpenAttackModal,
  onLogout,
  onLogin
}) => (
  <div className="flex items-center gap-2.5">
    {adminUser.isAuthenticated && (
      <button
        id="btn-simulate-attack-nav"
        onClick={onOpenAttackModal}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm cursor-pointer"
      >
        <Zap className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
        <span className="hidden sm:inline">Simular Ataque</span>
      </button>
    )}

    {adminUser.isAuthenticated ? (
      <div className="flex items-center gap-2">
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-emerald-500/30 text-xs font-mono text-slate-300 select-none hover:border-emerald-500/50 transition-colors"
          title={`Sesión activa: ${adminUser.username} (${adminUser.email})`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold">{adminUser.username}</span>
        </div>

        <button
          id="btn-logout-nav"
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
          title="Cerrar sesión de administrador"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>
    ) : (
      <button
        id="btn-login-nav"
        onClick={onLogin}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-semibold bg-emerald-500 text-black hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 transition-all cursor-pointer"
      >
        <KeyRound className="w-3.5 h-3.5 text-black" />
        <span>Iniciar Sesión</span>
      </button>
    )}
  </div>
);
