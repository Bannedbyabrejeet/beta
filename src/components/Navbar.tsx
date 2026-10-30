import React, { useState, useEffect } from 'react';
import { securityEngine } from '../services/securityEngine';
import { AdminUser, Tab } from '../types';
import { Brand } from './nav/Brand';
import { DesktopNav } from './nav/DesktopNav';
import { SessionActions } from './nav/SessionActions';
import { MobileNav } from './nav/MobileNav';

interface NavbarProps {
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
  bannedCount: number;
  onOpenAttackModal: () => void;
}

/**
 * Barra superior: identidad, navegación y acciones de sesión.
 * La lógica de cada bloque vive en `components/nav/`.
 */
export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  bannedCount,
  onOpenAttackModal
}) => {
  const [adminUser, setAdminUser] = useState<AdminUser>(securityEngine.getAdminUser());

  useEffect(() => {
    const unsub = securityEngine.subscribe(() => {
      setAdminUser(securityEngine.getAdminUser());
    });
    return unsub;
  }, []);

  const handleLogout = () => {
    securityEngine.logout();
    setCurrentTab('landing');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Brand onGoHome={() => setCurrentTab('landing')} />

        <DesktopNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          bannedCount={bannedCount}
          isAuthenticated={adminUser.isAuthenticated}
        />

        <SessionActions
          adminUser={adminUser}
          onOpenAttackModal={onOpenAttackModal}
          onLogout={handleLogout}
          onLogin={() => setCurrentTab('auth')}
        />
      </div>

      {adminUser.isAuthenticated && (
        <MobileNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          bannedCount={bannedCount}
        />
      )}
    </header>
  );
};
