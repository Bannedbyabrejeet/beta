import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { AuthPortal } from './components/AuthPortal';
import { SwaggerDocs } from './components/SwaggerDocs';
import { ArchitectureHub } from './components/ArchitectureHub';
import { RedisInspector } from './components/RedisInspector';
import { AttackSimulatorModal } from './components/AttackSimulatorModal';
import { securityEngine } from './services/securityEngine';
import { ShieldAlert, Terminal, Layers, FileCode2, Database, Heart } from 'lucide-react';
import { AdminUser } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'landing' | 'dashboard' | 'auth' | 'swagger' | 'architecture' | 'redis'>('landing');
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
      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage
            isAuthenticated={adminUser.isAuthenticated}
            onNavigateToDashboard={() => {
              if (adminUser.isAuthenticated) {
                setCurrentTab('dashboard');
              } else {
                setCurrentTab('auth');
              }
            }}
            onNavigateToSwagger={() => {
              if (adminUser.isAuthenticated) {
                setCurrentTab('swagger');
              } else {
                setCurrentTab('auth');
              }
            }}
            onNavigateToArchitecture={() => {
              if (adminUser.isAuthenticated) {
                setCurrentTab('architecture');
              } else {
                setCurrentTab('auth');
              }
            }}
            onOpenAttackModal={() => {
              if (adminUser.isAuthenticated) {
                setIsAttackModalOpen(true);
              } else {
                setCurrentTab('auth');
              }
            }}
          />
        )}

        {/* Dashboard Route: Protected by Admin Session (FRONT-01 / US-01) */}
        {currentTab === 'dashboard' && (
          adminUser.isAuthenticated ? (
            <Dashboard
              onOpenAttackModal={() => setIsAttackModalOpen(true)}
              onNavigateToSwagger={() => setCurrentTab('swagger')}
              onNavigateToArchitecture={() => setCurrentTab('architecture')}
              onNavigateToRedis={() => setCurrentTab('redis')}
            />
          ) : (
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="mb-4 text-center">
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Acceso Restringido: Inicie sesión como Administrador para ver las métricas y reglas del Firewall</span>
                </span>
              </div>
              <AuthPortal
                onSuccessLogin={() => setCurrentTab('dashboard')}
                onCancel={() => setCurrentTab('landing')}
              />
            </div>
          )
        )}

        {/* Dedicated Auth Portal View - Only accessible when NOT authenticated */}
        {currentTab === 'auth' && !adminUser.isAuthenticated && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <AuthPortal
              onSuccessLogin={() => setCurrentTab('dashboard')}
              onCancel={() => setCurrentTab('landing')}
            />
          </div>
        )}

        {/* Swagger / OpenAPI Docs Route: Protected */}
        {currentTab === 'swagger' && (
          adminUser.isAuthenticated ? (
            <SwaggerDocs />
          ) : (
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="mb-4 text-center">
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Acceso Restringido: Inicie sesión como Administrador para consultar y probar la API OpenAPI</span>
                </span>
              </div>
              <AuthPortal
                onSuccessLogin={() => setCurrentTab('swagger')}
                onCancel={() => setCurrentTab('landing')}
              />
            </div>
          )
        )}

        {/* Architecture Hub Route: Protected */}
        {currentTab === 'architecture' && (
          adminUser.isAuthenticated ? (
            <ArchitectureHub />
          ) : (
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="mb-4 text-center">
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Acceso Restringido: Inicie sesión como Administrador para ver el blueprint Docker y arquitectura</span>
                </span>
              </div>
              <AuthPortal
                onSuccessLogin={() => setCurrentTab('architecture')}
                onCancel={() => setCurrentTab('landing')}
              />
            </div>
          )
        )}

        {/* Redis Streams & KV Route: Protected */}
        {currentTab === 'redis' && (
          adminUser.isAuthenticated ? (
            <RedisInspector />
          ) : (
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="mb-4 text-center">
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Acceso Restringido: Inicie sesión como Administrador para inspeccionar Redis Streams &amp; KV</span>
                </span>
              </div>
              <AuthPortal
                onSuccessLogin={() => setCurrentTab('redis')}
                onCancel={() => setCurrentTab('landing')}
              />
            </div>
          )
        )}
      </main>

      {/* Attack Simulator Global Modal - Only when authenticated */}
      <AttackSimulatorModal
        isOpen={isAttackModalOpen && adminUser.isAuthenticated}
        onClose={() => setIsAttackModalOpen(false)}
        onNavigateToConsole={() => setCurrentTab('dashboard')}
      />

      {/* Global Enterprise Footer */}
      <footer className="border-t border-white/5 bg-[#050505]/90 backdrop-blur-md py-6 px-4 sm:px-6 lg:px-8 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-bold tracking-tight">BANNEDBYABREJEET</span>
            <span className="text-slate-500">— Autonomous SSH Defense System</span>
          </div>

          <div className="text-slate-400 text-center sm:text-right text-[11px]">
            Desarrollado por <strong className="text-slate-200">Santiago Mulet</strong> &amp;{' '}
            <strong className="text-slate-200">Manuel Abrego</strong>
            <span className="ml-3 text-emerald-400/60 font-mono">v2.4.0-Stable</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
