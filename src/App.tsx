import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AttackSimulatorModal } from './components/AttackSimulatorModal';
import { AppFooter } from './components/AppFooter';
import { AppRoutes } from './components/AppRoutes';
import { securityEngine } from './services/securityEngine';
import { AdminUser, Tab } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('landing');
  const [bannedCount, setBannedCount] = useState<number>(securityEngine.getBannedIps().length);
  const [isAttackModalOpen, setIsAttackModalOpen] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser>(securityEngine.getAdminUser());

  useEffect(() => {
    const unsubscribe = securityEngine.subscribe(() => {
      setBannedCount(securityEngine.getBannedIps().length);
      setAdminUser(securityEngine.getAdminUser());
    });
    return unsubscribe;
  }, []);

  // Sincronización con los backends reales (polling cada 2s).
  // Así, un ataque SSH detectado en Mulet aparece en el Dashboard al instante.
  useEffect(() => {
    securityEngine.startPolling(2000);
    return () => securityEngine.stopPolling();
  }, []);

  // When authenticated, remove auth tab and redirect to dashboard
  useEffect(() => {
    if (adminUser.isAuthenticated && currentTab === 'auth') {
      setCurrentTab('dashboard');
    }
  }, [adminUser.isAuthenticated, currentTab]);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300 font-sans">
      
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        bannedCount={bannedCount}
        onOpenAttackModal={() => setIsAttackModalOpen(true)}
      />

      {/* Main View Router */}
      <AppRoutes
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        adminUser={adminUser}
        onOpenAttackModal={() => setIsAttackModalOpen(true)}
      />

      {/* Attack Simulator Global Modal - Only when authenticated */}
      <AttackSimulatorModal
        isOpen={isAttackModalOpen && adminUser.isAuthenticated}
        onClose={() => setIsAttackModalOpen(false)}
        onNavigateToConsole={() => setCurrentTab('dashboard')}
      />

      <AppFooter />

    </div>
  );
}
