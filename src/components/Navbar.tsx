import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Layers, 
  FileCode2, 
  Zap, 
  Radio, 
  Database,
  Lock,
  KeyRound,
  UserCheck,
  LogOut,
  UserX
} from 'lucide-react';
import { securityEngine } from '../services/securityEngine';
import { AdminUser } from '../types';

interface NavbarProps {
  currentTab: 'landing' | 'dashboard' | 'auth' | 'swagger' | 'architecture' | 'redis';
  setCurrentTab: (tab: 'landing' | 'dashboard' | 'auth' | 'swagger' | 'architecture' | 'redis') => void;
  bannedCount: number;
  onOpenAttackModal: () => void;
}

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
        
        {/* Brand & Project Identity */}
        <div 
          onClick={() => setCurrentTab('landing')}
          className="flex items-center gap-2.5 cursor-pointer group"
          id="nav-brand-logo"
        >
          <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-tight text-lg text-white">
                BANNEDBYABREJEET
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
                v2.4-UFW
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 block -mt-0.5">
              Mulet &amp; Abrego
            </span>
          </div>
        </div>

        {/* Navigation Tabs - Only visible when authenticated */}
        {adminUser.isAuthenticated ? (
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.02] p-1 rounded-lg border border-white/5" id="main-nav-bar">
            <button
              id="nav-tab-landing"
              onClick={() => setCurrentTab('landing')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                currentTab === 'landing'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Plataforma
            </button>

            <button
              id="nav-tab-dashboard"
              onClick={() => setCurrentTab('dashboard')}
              className={`group px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-sm border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-transparent'
              }`}
            >
              <Radio className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              Dashboard
              {bannedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full group-hover:bg-rose-500/30 transition-colors">
                  {bannedCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-swagger"
              onClick={() => setCurrentTab('swagger')}
              className={`group px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'swagger'
                  ? 'bg-cyan-500/15 text-cyan-400 shadow-sm border border-cyan-500/30'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              OpenAPI Docs
            </button>

            <button
              id="nav-tab-architecture"
              onClick={() => setCurrentTab('architecture')}
              className={`group px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'architecture'
                  ? 'bg-indigo-500/15 text-indigo-300 shadow-sm border border-indigo-500/30'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/20 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              Arquitectura
            </button>

            <button
              id="nav-tab-redis"
              onClick={() => setCurrentTab('redis')}
              className={`group px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'redis'
                  ? 'bg-amber-500/15 text-amber-300 shadow-sm border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/20 border border-transparent'
              }`}
            >
              <Database className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              Redis Streams &amp; KV
            </button>
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5 bg-white/[0.02] px-3 py-1 rounded-full border border-white/5 hover:border-white/15 hover:text-slate-400 transition-colors cursor-default">
              <Lock className="w-3 h-3 text-emerald-500/70" />
              Portal Público • Inicie sesión para acceder a las opciones del sistema
            </span>
          </div>
        )}

        {/* Right Action Tools & Auth Session State */}
        <div className="flex items-center gap-2.5">
          {/* Live Attack Simulator Button - Only visible when authenticated */}
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

          {/* Active Admin Session Status & Logout */}
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
                onClick={handleLogout}
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
              onClick={() => setCurrentTab('auth')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-semibold bg-emerald-500 text-black hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-black" />
              <span>Iniciar Sesión</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar - Only visible when authenticated */}
      {adminUser.isAuthenticated && (
        <div className="md:hidden flex items-center justify-around border-t border-white/5 bg-[#050505]/95 px-2 py-1 text-xs">
          <button 
            onClick={() => setCurrentTab('landing')}
            className={`py-1 px-2 ${currentTab === 'landing' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Plataforma
          </button>
          <button 
            onClick={() => setCurrentTab('dashboard')}
            className={`py-1 px-2 ${currentTab === 'dashboard' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Dashboard ({bannedCount})
          </button>
          <button 
            onClick={() => setCurrentTab('swagger')}
            className={`py-1 px-2 ${currentTab === 'swagger' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
          >
            Swagger
          </button>
          <button 
            onClick={() => setCurrentTab('architecture')}
            className={`py-1 px-2 ${currentTab === 'architecture' ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}
          >
            Docker
          </button>
          <button 
            onClick={() => setCurrentTab('redis')}
            className={`py-1 px-2 ${currentTab === 'redis' ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}
          >
            Redis
          </button>
        </div>
      )}
    </header>
  );
};
