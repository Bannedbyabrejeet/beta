import React from 'react';
import { Tab } from '../../types';
import { MOBILE_ITEMS } from './navItems';

interface MobileNavProps {
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
  bannedCount: number;
}

/** Barra de navegación compacta para pantallas chicas. */
export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  setCurrentTab,
  bannedCount
}) => (
  <div className="md:hidden flex items-center justify-around border-t border-white/5 bg-[#050505]/95 px-2 py-1 text-xs">
    {MOBILE_ITEMS.map(({ tab, label, activeClass }) => (
      <button
        key={tab}
        onClick={() => setCurrentTab(tab)}
        className={`py-1 px-2 ${currentTab === tab ? activeClass : 'text-slate-400'}`}
      >
        {tab === 'dashboard' ? `${label} (${bannedCount})` : label}
      </button>
    ))}
  </div>
);
