import React from 'react';
import { Lock } from 'lucide-react';
import { Tab } from '../../types';
import { NAV_ITEMS } from './navItems';

interface DesktopNavProps {
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
  bannedCount: number;
  isAuthenticated: boolean;
}

/**
 * Navegación de escritorio. Si no hay sesión, muestra un aviso en lugar
 * de las pestañas internas.
 */
export const DesktopNav: React.FC<DesktopNavProps> = ({
  currentTab,
  setCurrentTab,
  bannedCount,
  isAuthenticated
}) => {
  if (!isAuthenticated) {
    return (
      <div className="hidden md:flex items-center gap-2">
        <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5 bg-white/[0.02] px-3 py-1 rounded-full border border-white/5 hover:border-white/15 hover:text-slate-400 transition-colors cursor-default">
          <Lock className="w-3 h-3 text-emerald-500/70" />
          Portal Público • Inicie sesión para acceder a las opciones del sistema
        </span>
      </div>
    );
  }

  return (
    <nav
      className="hidden md:flex items-center gap-1 bg-white/[0.02] p-1 rounded-lg border border-white/5"
      id="main-nav-bar"
    >
      {NAV_ITEMS.map(({ id, tab, label, icon: Icon, activeClass, idleClass }) => (
        <button
          key={id}
          id={id}
          onClick={() => setCurrentTab(tab)}
          className={`group px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
            currentTab === tab ? activeClass : idleClass
          }`}
        >
          <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          {label}
          {tab === 'dashboard' && bannedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full group-hover:bg-rose-500/30 transition-colors">
              {bannedCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};
