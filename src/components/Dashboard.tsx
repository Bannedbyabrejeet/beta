import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Sliders, 
  Users, 
  Radio, 
  Search, 
  Filter, 
  Trash2, 
  Plus, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  KeyRound, 
  Flame, 
  Globe, 
  RefreshCw, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Send,
  Database,
  Layers,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Eye,
  Info,
  FileCheck,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { securityEngine } from '../services/securityEngine';
import { SystemConfig, SshLogEvent, BannedIp, EventType, UfwRuleEntry } from '../types';

interface DashboardProps {
  onOpenAttackModal: () => void;
  onNavigateToSwagger: () => void;
  onNavigateToArchitecture: () => void;
  onNavigateToRedis: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenAttackModal,
  onNavigateToSwagger,
  onNavigateToArchitecture,
  onNavigateToRedis
}) => {
  // Active Dashboard Sub-view
  const [subView, setSubView] = useState<'console' | 'banned' | 'settings' | 'auth' | 'issue7'>('console');
  const [selectedVerifiedLog, setSelectedVerifiedLog] = useState<SshLogEvent | null>(null);
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | 'WHITELIST' | 'SUCCESS' | 'FAILURE' | 'BANNED'>('ALL');

  // Live Log Tester state
  const [testLogInput, setTestLogInput] = useState<string>(
    'Aug 26 15:40:12 edge-gw sshd[32100]: Failed password for root from 198.51.100.77 port 44210 ssh2'
  );
  const [testLogResult, setTestLogResult] = useState<{ event: SshLogEvent | null; banTriggered: boolean } | null>(null);

  // Engine state subscriptions
  const [config, setConfig] = useState<SystemConfig>(securityEngine.getConfig());
  const [whitelist, setWhitelist] = useState<string[]>(securityEngine.getWhitelist());
  const [logs, setLogs] = useState<SshLogEvent[]>(securityEngine.getLogs());
  const [bannedIps, setBannedIps] = useState<BannedIp[]>(securityEngine.getBannedIps());
  const [ufwRules, setUfwRules] = useState<UfwRuleEntry[]>(securityEngine.getUfwRules());
  const [ufwOperations, setUfwOperations] = useState<any[]>(securityEngine.getUfwOperations());
  const [adminUser, setAdminUser] = useState(securityEngine.getAdminUser());

  // Form states for settings
  const [formConfig, setFormConfig] = useState<SystemConfig>(config);
  const [newWhitelistIp, setNewWhitelistIp] = useState<string>('');
  const [whitelistMsg, setWhitelistMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [unbanMsg, setUnbanMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [configSavedNotice, setConfigSavedNotice] = useState<boolean>(false);

  // Filter states for logs
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');

  // Password reset state (US-01.3, US-10)
  const [resetEmail, setResetEmail] = useState<string>('admin@bannedbyabrejeet.io');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenTtl, setTokenTtl] = useState<number>(0);
  const [newPassword, setNewPassword] = useState<string>('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Sync with security engine
  useEffect(() => {
    const unsubscribe = securityEngine.subscribe(() => {
      const updatedConfig = securityEngine.getConfig();
      setConfig(updatedConfig);
      setWhitelist(securityEngine.getWhitelist());
      setLogs(securityEngine.getLogs());
      setBannedIps(securityEngine.getBannedIps());
      setUfwRules(securityEngine.getUfwRules());
      setUfwOperations(securityEngine.getUfwOperations());
      setAdminUser(securityEngine.getAdminUser());
    });
    return unsubscribe;
  }, []);

  // Update form state if config changes externally
  useEffect(() => {
    setFormConfig(config);
  }, [config]);

  // Countdown timer for reset token TTL
  useEffect(() => {
    if (tokenTtl <= 0) return;
    const timer = setInterval(() => {
      setTokenTtl(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [tokenTtl]);

  // Handle saving configuration (FastAPI / Service 1)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await securityEngine.updateConfig(formConfig);
    setConfigSavedNotice(true);
    setTimeout(() => setConfigSavedNotice(false), 3000);
  };

  // Handle adding to whitelist
  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhitelistIp.trim()) return;
    const res = await securityEngine.addToWhitelist(newWhitelistIp.trim());
    setWhitelistMsg({ text: res.message, isError: !res.success });
    if (res.success) setNewWhitelistIp('');
    setTimeout(() => setWhitelistMsg(null), 4000);
  };

  // Handle removing from whitelist
  const handleRemoveWhitelist = async (ip: string) => {
    const res = await securityEngine.removeFromWhitelist(ip);
    setWhitelistMsg({ text: res.message, isError: !res.success });
    setTimeout(() => setWhitelistMsg(null), 4000);
  };

  // Handle unban via Redis Pub/Sub (con verificacion real contra UFW)
  const handleUnban = async (ip: string) => {
    const res = await securityEngine.unbanIp(ip, 'Manual unban triggered via Operator Console');
    setUnbanMsg({ text: res.message, isError: !res.success });
    setTimeout(() => setUnbanMsg(null), 10000);
  };

  // Handle password reset token request (Redis TTL)
  const handleGenerateResetToken = async () => {
    const res = await securityEngine.generatePasswordResetToken(resetEmail);
    setGeneratedToken(res.token);
    setTokenTtl(res.ttlSeconds);
    setResetSuccessMsg(null);
  };

  const handleConfirmPasswordReset = async () => {
    if (!generatedToken || !newPassword) return;
    const res = await securityEngine.completePasswordReset(generatedToken, newPassword);
    if (res.success) {
      setResetSuccessMsg(res.message);
      setGeneratedToken(null);
      setNewPassword('');
    } else {
      setWhitelistMsg({ text: res.message, isError: true });
    }
  };

  // Handle testing custom log (procesado por el motor real del Backend B)
  const handleTestCustomLog = async (logLine?: string) => {
    const lineToTest = logLine || testLogInput;
    if (!lineToTest.trim()) return;
    const res = await securityEngine.ingestSshLog(lineToTest.trim());
    setTestLogResult(res);
  };

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.rawLog.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.verification?.decisionSummary && log.verification.decisionSummary.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = eventTypeFilter === 'ALL' || log.eventType === eventTypeFilter;

    let matchesVerif = true;
    if (verificationFilter === 'WHITELIST') {
      matchesVerif = log.verification?.actionTaken === 'IGNORED_WHITELIST' || whitelist.includes(log.ip);
    } else if (verificationFilter === 'SUCCESS') {
      matchesVerif = log.verification?.actionTaken === 'LOGGED_SUCCESS' || log.eventType === 'ACCEPTED_KEY';
    } else if (verificationFilter === 'FAILURE') {
      matchesVerif = log.verification?.actionTaken === 'RECORDED_FAILURE_PENDING';
    } else if (verificationFilter === 'BANNED') {
      matchesVerif = log.verification?.actionTaken === 'THRESHOLD_EXCEEDED_BANNED' || bannedIps.some(b => b.ip === log.ip);
    }

    return matchesSearch && matchesType && matchesVerif;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-200">
      
      {/* Top Banner / System Status */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8 bg-[#0f0f0f] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Consola Operativa Multiservicio
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
              FastAPI + Express Engine
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Motor de defensa SSH activo con monitor de <code className="text-emerald-400 font-mono">/var/log/auth.log</code> y sincronización Redis Pub/Sub.
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenAttackModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            Inyectar Ataque SSH
          </button>

          <button
            onClick={onNavigateToRedis}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            Redis Key-Value
          </button>

          <button
            onClick={onNavigateToSwagger}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            OpenAPI Docs
          </button>
        </div>
      </div>

      {/* Sub-view Navigation Tabs (Microfrontends Switcher) */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/5 pb-4">
        
        {/* Microfrontend B: Live Visor */}
        <button
          onClick={() => setSubView('console')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium font-mono transition-all ${
            subView === 'console'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Visor de Logs SSH (Vue.js MFE)</span>
          <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] text-slate-300">
            {logs.length}
          </span>
        </button>

        {/* Microfrontend B: Banned IPs & Unban Manager */}
        <button
          onClick={() => setSubView('banned')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium font-mono transition-all ${
            subView === 'banned'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-400" />
          <span>IPs Sancionadas en UFW</span>
          <span className="px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-500/30 text-[10px] text-rose-300">
            {bannedIps.length}
          </span>
        </button>

        {/* Microfrontend A: Settings & Whitelist */}
        <button
          onClick={() => setSubView('settings')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium font-mono transition-all ${
            subView === 'settings'
              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
              : 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/20 border border-transparent'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Parámetros & Whitelist (React MFE)</span>
        </button>

        {/* Issue #7: Security Engine & Automated Test Suite */}
        <button
          onClick={() => setSubView('issue7')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium font-mono transition-all ${
            subView === 'issue7'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-transparent'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Motor & Verificación (Issue #7)</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[10px] text-emerald-300 border border-emerald-500/30">
            Backend B
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. Sub-view: Live SSH Log Console (Microfrontend B) */}
      {/* ========================================================================= */}
      {subView === 'console' && (
        <div className="space-y-6">
          
          {/* Real-time Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group p-4 bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 rounded-xl cursor-default">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Eventos SSH</span>
                <Terminal className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-mono font-bold text-white group-hover:text-emerald-300 transition-colors">{logs.length}</div>
              <div className="text-[11px] text-emerald-400 font-mono mt-1">/var/log/auth.log stream</div>
            </div>

            <div className="group p-4 bg-white/[0.03] border border-white/10 hover:border-rose-500/30 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 rounded-xl cursor-default">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>IPs Bloqueadas en UFW</span>
                <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-mono font-bold text-rose-400 group-hover:text-rose-300 transition-colors">{bannedIps.length}</div>
              <div className="text-[11px] text-rose-300/80 font-mono mt-1">Port 22 packet drop</div>
            </div>

            <div className="group p-4 bg-white/[0.03] border border-white/10 hover:border-amber-500/30 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 rounded-xl cursor-default">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Regla Umbral</span>
                <Sliders className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-mono font-bold text-amber-400 group-hover:text-amber-300 transition-colors">{config.max_retries} fallos</div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">En ventana de {config.findtime_min}m</div>
            </div>

            <div className="group p-4 bg-white/[0.03] border border-white/10 hover:border-teal-500/30 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 rounded-xl cursor-default">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Whitelist Activa</span>
                <ShieldCheck className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-mono font-bold text-teal-400 group-hover:text-teal-300 transition-colors">{whitelist.length} IPs</div>
              <div className="text-[11px] text-teal-300/80 font-mono mt-1">127.0.0.1 locked</div>
            </div>
          </div>

          {/* Log Search and Filter Toolbar */}
          <div className="flex flex-col gap-3 bg-[#0f0f0f] p-3.5 rounded-xl border border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por IP, usuario o syslog..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black border border-white/10 hover:border-white/20 rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="bg-black border border-white/10 hover:border-white/20 rounded-md px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="ALL">Todos los Eventos</option>
                  <option value="FAILED_PASSWORD">FAILED_PASSWORD</option>
                  <option value="INVALID_USER">INVALID_USER</option>
                  <option value="ACCEPTED_KEY">ACCEPTED_KEY</option>
                  <option value="PREAUTH_DISCONNECT">PREAUTH_DISCONNECT</option>
                </select>

                <button
                  onClick={() => {
                    securityEngine.simulateAttack({ attempts: 1 });
                  }}
                  className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white text-xs font-mono text-slate-300 flex items-center gap-1.5 border border-white/10 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  title="Generar intento simulado"
                >
                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                  <span>+1 Evento</span>
                </button>
              </div>
            </div>

            {/* Quick verification filter tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5 text-[11px] font-mono">
              <span className="text-slate-500 text-[10px]">Filtro de Verificación:</span>
              {[
                { id: 'ALL', label: 'Todos los Registros' },
                { id: 'WHITELIST', label: '🛡️ Perdonados (Whitelist)' },
                { id: 'SUCCESS', label: '✅ Accesos Válidos' },
                { id: 'FAILURE', label: '⚠️ Fallos Computados' },
                { id: 'BANNED', label: '🔥 IPs Sancionadas' },
              ].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setVerificationFilter(pill.id as any)}
                  className={`px-2.5 py-1 rounded-md text-[10px] transition-all cursor-pointer ${
                    verificationFilter === pill.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Structured SSH Syslog Table */}
          <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0f0f0f] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">IP Origen & Geolocalización</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Tipo de Evento</th>
                    <th className="px-4 py-3">Puerto</th>
                    <th className="px-4 py-3">Veredicto del Motor</th>
                    <th className="px-4 py-3 text-right">Acción / Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No se encontraron registros que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isBanned = bannedIps.some(b => b.ip === log.ip);
                      const isWhitelisted = whitelist.includes(log.ip);

                      return (
                        <tr key={log.id} className="hover:bg-white/[0.04] transition-colors duration-150">
                          <td className="px-4 py-2.5 whitespace-nowrap text-slate-400">
                            {log.timestamp}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap font-semibold">
                            <div className="flex items-center gap-2">
                              <span>{log.geo?.flag || '🌐'}</span>
                              <span className="text-white hover:text-emerald-400 transition-colors">{log.ip}</span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({log.geo?.countryCode || 'EXT'})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                              log.user === 'root' 
                                ? 'bg-rose-950/50 text-rose-300 border border-rose-500/30' 
                                : 'bg-white/5 text-slate-200 border border-white/5'
                            }`}>
                              {log.user}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {log.eventType === 'FAILED_PASSWORD' && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]">
                                FAILED_PASSWORD
                              </span>
                            )}
                            {log.eventType === 'INVALID_USER' && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                                INVALID_USER
                              </span>
                            )}
                            {log.eventType === 'ACCEPTED_KEY' && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                                ACCEPTED_KEY
                              </span>
                            )}
                            {log.eventType === 'PREAUTH_DISCONNECT' && (
                              <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[10px]">
                                PREAUTH_DISCONNECT
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-slate-400">
                            {log.port}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {isBanned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold animate-pulse">
                                <Flame className="w-3 h-3 text-rose-400" /> BANEADA EN UFW
                              </span>
                            ) : isWhitelisted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px]">
                                <ShieldCheck className="w-3 h-3 text-teal-400" /> PERDONADA (WHITELIST)
                              </span>
                            ) : log.verification?.actionTaken === 'LOGGED_SUCCESS' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                                <CheckCircle className="w-3 h-3 text-emerald-400" /> ACCESO VÁLIDO
                              </span>
                            ) : log.verification?.actionTaken === 'RECORDED_FAILURE_PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-amber-400" /> FALLO ({log.verification.failuresInWindowAfter}/{config.max_retries})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[10px]">
                                MONITOREADA
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedVerifiedLog(log)}
                                className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:border-emerald-500/40 hover:-translate-y-0.5 active:scale-95 text-[10px] border border-emerald-500/20 font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="Verificar decisión y dictamen del motor para este evento"
                              >
                                <Eye className="w-3 h-3 text-emerald-400" />
                                <span>Verificar</span>
                              </button>

                              {isBanned ? (
                                <button
                                  onClick={() => handleUnban(log.ip)}
                                  className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 hover:border-rose-500/50 hover:-translate-y-0.5 active:scale-95 border border-rose-500/30 text-[10px] transition-all font-semibold cursor-pointer"
                                >
                                  Desbanear
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    securityEngine.simulateAttack({ ip: log.ip, attempts: 5 });
                                  }}
                                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 hover:border-rose-500/30 hover:-translate-y-0.5 active:scale-95 text-[10px] border border-white/5 transition-all cursor-pointer"
                                  title="Forzar 5 ataques desde esta IP"
                                >
                                  +5 Fallos
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Sub-view: Active Banned IPs & UFW Rule Manager */}
      {/* ========================================================================= */}
      {subView === 'banned' && (
        <>
        {unbanMsg && (
          <div className={`mb-4 p-3 rounded-lg text-xs font-mono ${
            unbanMsg.isError ? 'bg-rose-950/40 border border-rose-500/30 text-rose-300' : 'bg-teal-950/40 border border-teal-500/30 text-teal-300'
          }`}>
            {unbanMsg.text}
          </div>
        )}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0f0f0f] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400" />
                IPs Sancionadas en Linux UFW Firewall
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Reglas activas a nivel de kernel mediante <code className="text-rose-400 font-mono">ufw insert 1 deny from &lt;IP&gt; to any port 22</code>. El desbaneo manual publica en Redis Pub/Sub (<code className="text-amber-400 font-mono">channel:unban_events</code>).
              </p>
            </div>
            <button
              onClick={onOpenAttackModal}
              className="px-4 py-2 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono font-semibold hover:bg-rose-500/25 hover:border-rose-500/50 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
            >
              + Simular Nueva Amenaza
            </button>
          </div>

          {/* Banned IPs Table */}
          <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0f0f0f] shadow-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">IP Sancionada</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Intentos / Razón</th>
                  <th className="px-4 py-3">Último Usuario</th>
                  <th className="px-4 py-3">Regla UFW Ejecutada</th>
                  <th className="px-4 py-3">Tiempo Restante (TTL)</th>
                  <th className="px-4 py-3 text-right">Desbaneo Inmediato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {bannedIps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500/60 mb-2" />
                      No hay direcciones IP sancionadas en este momento. El perímetro está seguro.
                    </td>
                  </tr>
                ) : (
                  bannedIps.map((b) => {
                    const remainingMs = Math.max(0, b.expiresAt - Date.now());
                    const remainingMin = Math.floor(remainingMs / 60000);
                    const remainingSec = Math.floor((remainingMs % 60000) / 1000);

                    return (
                      <tr key={b.ip} className="hover:bg-white/[0.04] transition-colors duration-150">
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-rose-300">
                          {b.ip}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {b.flag || '🌐'} {b.country || 'External'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-amber-300 font-semibold">{b.attemptsCount} fallos</span>
                          <span className="text-[10px] text-slate-400 block">{b.reason}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                            {b.lastUser}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <code className="text-[10px] text-emerald-400 bg-black px-1.5 py-0.5 rounded border border-white/10">
                            {b.ufwRule}
                          </code>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-amber-400 font-bold">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                            <span>{remainingMin}m {remainingSec}s</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleUnban(b.ip)}
                            className="px-3 py-1.5 rounded-md bg-rose-500 text-black font-bold hover:bg-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all text-xs cursor-pointer"
                          >
                            Desbanear (Pub/Sub)
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Estado REAL del firewall (leído con 'ufw status numbered' por el Backend B) */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2.5 mb-1">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Reglas UFW Activas en el Firewall</h3>
                <span className="text-[10px] font-mono text-slate-500">
                  (lectura real: <code className="text-amber-400">ufw status numbered</code>)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Esta es la verdad del firewall. Si una IP aparece acá, sigue bloqueada, aunque figure
                liberada en la lista de sancionadas.
              </p>

              {ufwRules.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-300">
                    No hay reglas de bloqueo por IP. El firewall no tiene ninguna IP denegada.
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {ufwRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/20 font-mono text-[11px]"
                    >
                      <span className="text-slate-500">[{rule.id}]</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                        {rule.action}
                      </span>
                      <span className="text-cyan-300">port {rule.toPort}</span>
                      <span className="text-white">{rule.fromIp}</span>
                      {rule.comment && (
                        <span className="text-slate-500 truncate"># {rule.comment}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(securityEngine.getUfwOperations().length > 0) && (
                <div className="mt-4 space-y-1">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        Últimas operaciones del firewall
                  </p>
                  {securityEngine.getUfwOperations().slice(0, 4).map((op: any, idx: number) => (
                    <div
                      key={`${op.timestamp}-${idx}`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono border ${
                        op.ok
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <span className="font-bold">{op.action}</span>
                      <span className="text-white">{op.ip}</span>
                      <span>
                        {op.ok
                          ? op.removed
                            ? `→ ${op.removed} regla(s) eliminada(s)`
                            : op.skipped
                              ? '→ ya estaba libre'
                              : '→ regla creada'
                          : `→ ERROR: ${op.error}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>

      )}

      {/* ========================================================================= */}
      {/* 3. Sub-view: Configuration Parameters & Whitelist (Microfrontend A) */}
      {/* ========================================================================= */}
      {subView === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Parameters Form (US-02, US-08, US-09) */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0f0f0f] border border-white/10 hover:border-white/15 transition-colors">
            <div className="flex items-center gap-2.5 mb-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">Parámetros de Baneo y Detección</h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mb-6">
              Ajuste de umbrales persistidos en el Hash de Redis <code className="text-amber-400 font-mono">config:settings</code> y expuestos vía FastAPI REST API.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Max Retries Slider & Input */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <label className="text-slate-300 font-semibold">Intentos Fallidos Máximos (max_retries)</label>
                  <span className="text-emerald-400 font-bold">{formConfig.max_retries} intentos</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={formConfig.max_retries}
                  onChange={(e) => setFormConfig({ ...formConfig, max_retries: parseInt(e.target.value, 10) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Número de intentos fallidos antes de aplicar la regla de denegación UFW.
                </p>
              </div>

              {/* Findtime Slider & Input */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <label className="text-slate-300 font-semibold">Ventana Temporal de Análisis (findtime_min)</label>
                  <span className="text-cyan-400 font-bold">{formConfig.findtime_min} minutos</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={formConfig.findtime_min}
                  onChange={(e) => setFormConfig({ ...formConfig, findtime_min: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Ventana de tiempo dentro de la cual se acumulan los fallos de una IP.
                </p>
              </div>

              {/* Ban Time Slider & Input */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <label className="text-slate-300 font-semibold">Tiempo de Penalización / Baneo (ban_time_min)</label>
                  <span className="text-amber-400 font-bold">{formConfig.ban_time_min} minutos</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="1440"
                  step="5"
                  value={formConfig.ban_time_min}
                  onChange={(e) => setFormConfig({ ...formConfig, ban_time_min: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Duración del bloqueo en minutos antes de que el motor ejecute la remoción automática de UFW.
                </p>
              </div>

              {/* Toggle Switches */}
              <div className="pt-2 border-t border-white/5 space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Desbaneo Automático al expirar TTL (Auto-Unban)</span>
                  <input
                    type="checkbox"
                    checked={formConfig.auto_unban_enabled}
                    onChange={(e) => setFormConfig({ ...formConfig, auto_unban_enabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Integración con UFW Linux Firewall (CAP_NET_ADMIN)</span>
                  <input
                    type="checkbox"
                    checked={formConfig.ufw_enabled}
                    onChange={(e) => setFormConfig({ ...formConfig, ufw_enabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-md bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 transition-all cursor-pointer"
                >
                  Guardar Configuración en Redis
                </button>

                {configSavedNotice && (
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-4 h-4" /> Guardado exitosamente
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Whitelist Manager & Anti-Lockout (US-08) */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0f0f0f] border border-white/10 hover:border-white/15 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h2 className="text-xl font-bold text-white">Lista Blanca & Prevención de Auto-bloqueo</h2>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mb-6">
                IPs y bloques de red exentos de baneo persistidos en el Set de Redis <code className="text-teal-400 font-mono">config:whitelist</code>.
              </p>

              {/* Add IP Form */}
              <form onSubmit={handleAddWhitelist} className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Ej: 192.168.1.50 o 10.0.0.0/24"
                  value={newWhitelistIp}
                  onChange={(e) => setNewWhitelistIp(e.target.value)}
                  className="flex-1 bg-black border border-white/10 hover:border-white/20 focus:border-teal-400 rounded-md px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-md text-xs font-mono font-semibold hover:bg-teal-500/30 hover:border-teal-500/50 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </form>

              {whitelistMsg && (
                <div className={`p-3 rounded-lg text-xs font-mono mb-4 ${
                  whitelistMsg.isError ? 'bg-rose-950/40 border border-rose-500/30 text-rose-300' : 'bg-teal-950/40 border border-teal-500/30 text-teal-300'
                }`}>
                  {whitelistMsg.text}
                </div>
              )}

              {/* Whitelist Badges */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                  IPs Registradas en Whitelist:
                </span>
                <div className="flex flex-wrap gap-2">
                  {whitelist.map((ip) => {
                    const isImmutable = ip === '127.0.0.1' || ip === '::1';
                    return (
                      <div
                        key={ip}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono group transition-all ${
                          isImmutable
                            ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:border-emerald-500/50'
                            : 'bg-white/5 border border-white/10 hover:border-white/20 text-slate-200'
                        }`}
                      >
                        {isImmutable ? <Lock className="w-3 h-3 text-emerald-400" /> : <Globe className="w-3 h-3 text-slate-400" />}
                        <span>{ip}</span>
                        {isImmutable ? (
                          <span className="text-[10px] bg-emerald-500/20 px-1 rounded text-emerald-300">
                            Locked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemoveWhitelist(ip)}
                            className="p-0.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded transition-all cursor-pointer"
                            title="Remover de Whitelist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-black border border-white/5 text-xs font-mono text-slate-400 hover:border-white/15 transition-colors">
              <span className="text-emerald-400 font-bold block mb-1">🛡️ Salvaguarda de Prevención de Auto-bloqueo:</span>
              La dirección loopback local <code className="text-emerald-300 font-semibold">127.0.0.1</code> y <code className="text-emerald-300 font-semibold">::1</code> están protegidas a nivel de API REST y no pueden ser eliminadas bajo ninguna circunstancia.
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Sub-view: Authentication & TTL Temporary Token Engine (US-01, US-10) */}
      {/* ========================================================================= */}
      {subView === 'auth' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Active Admin Session Status */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0f0f0f] border border-white/10">
            <div className="flex items-center gap-2.5 mb-2">
              <KeyRound className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Sesión Administrativa & JWT</h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mb-6">
              Manejo de credenciales con hash Bcrypt y tokens JWT firmados mediante clave secreta en FastAPI.
            </p>

            <div className="space-y-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-black border border-white/5">
                <div className="text-slate-400 mb-1">Usuario Administrador Configurado:</div>
                <div className="text-white font-bold text-sm">{adminUser.username} ({adminUser.email})</div>
              </div>

              <div className="p-3.5 rounded-xl bg-black border border-white/5">
                <div className="text-slate-400 mb-1">Token JWT de Sesión (Bearer):</div>
                <div className="text-purple-300 break-all text-[11px] bg-white/[0.02] p-2 rounded border border-white/5">
                  {adminUser.token || 'No session token active'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black border border-white/5">
                <div className="text-slate-400 mb-1">Persistencia en Redis:</div>
                <div className="text-amber-400 font-semibold">Hash key: auth:admin</div>
              </div>
            </div>
          </div>

          {/* Password Reset Engine with Native Redis TTL (US-01.3, US-10) */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0f0f0f] border border-white/10">
            <div className="flex items-center gap-2.5 mb-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Recuperación con Enlace Temporal TTL</h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mb-6">
              Generación de tokens temporales de recuperación respaldados por la expiración nativa TTL en Redis (US-01.3).
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5">
                  Correo Electrónico del Administrador:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="flex-1 bg-black border border-white/10 rounded-md px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleGenerateResetToken}
                    className="px-4 py-2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold hover:bg-amber-500/30"
                  >
                    Generar Token TTL
                  </button>
                </div>
              </div>

              {/* Active Token Display with Countdown */}
              {generatedToken && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold">Token Generado en Redis:</span>
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> TTL: {tokenTtl}s
                    </span>
                  </div>
                  <div className="text-slate-200 bg-black p-2 rounded break-all border border-amber-500/20 text-[11px]">
                    {generatedToken}
                  </div>

                  <div className="pt-2">
                    <label className="text-slate-300 block mb-1 text-[11px]">Nueva Contraseña:</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="flex-1 bg-black border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white"
                      />
                      <button
                        onClick={handleConfirmPasswordReset}
                        className="px-3 py-1.5 rounded-md bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400"
                      >
                        Confirmar Cambio
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {resetSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {resetSuccessMsg}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Sub-view: Issue #7 - Security Engine & Verification Suite (Backend B)  */}
      {/* ========================================================================= */}
      {subView === 'issue7' && (
        <div className="space-y-8">
          
          {/* Friendly Non-Technical Banner */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0f0f0f] via-[#141414] to-[#0a1f15] border border-emerald-500/20 shadow-2xl">
            <div className="space-y-4 w-full">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  NÚCLEO ALGORÍTMICO (BACKEND B)
                </span>
                <span className="text-xs text-slate-400 font-mono">OpenSSH Syslog Stream</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <Cpu className="w-6 h-6 text-emerald-400" />
                Issue #7: Lector de Logs SSH y Motor de Seguridad
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Este módulo vigila continuamente los intentos de acceso en el servidor, lee los registros de <code className="text-emerald-400 font-mono">/var/log/auth.log</code> y toma decisiones automáticas sin intervención humana:
              </p>

              {/* The 3 Pillars explained in simple language */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-black/50 border border-white/5">
                  <div className="text-teal-400 font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    1. Lista Blanca
                  </div>
                  <p className="text-slate-400 text-[11px] font-sans">
                    Perdona de inmediato a las IPs protegidas (como <code className="text-teal-300 font-mono">127.0.0.1</code> o equipos del personal) para evitar auto-bloqueos.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/5">
                  <div className="text-amber-400 font-bold flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    2. Conteo de Fallos
                  </div>
                  <p className="text-slate-400 text-[11px] font-sans">
                    Suma cada intento fallido de IPs desconocidas. Al alcanzar el límite ({config.max_retries} faltas), aplica la orden de bloqueo.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/5">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5 mb-1">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    3. Reloj de Tolerancia
                  </div>
                  <p className="text-slate-400 text-[11px] font-sans">
                    Si pasan más de {config.findtime_min} minutos entre errores, los fallos viejos se borran y el contador se reinicia a cero.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live Log Tester */}
          <div className="p-6 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                Probador Interactivo de Logs en Vivo
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Escribe cualquier registro o presiona uno de los ejemplos típicos para ver cómo el motor de seguridad lo verifica en tiempo real.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Ejemplos Rápidos:</span>
              <button
                onClick={() => {
                  const line = `Aug 26 15:40:12 edge-gw sshd[32100]: Failed password for root from 198.51.100.77 port 44210 ssh2`;
                  setTestLogInput(line);
                  handleTestCustomLog(line);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                1. Intento fallido con root
              </button>

              <button
                onClick={() => {
                  const line = `Aug 26 15:40:15 edge-gw sshd[32104]: Accepted publickey for sysadmin from 10.0.0.15 port 55120 ssh2: RSA SHA256:KeyOk`;
                  setTestLogInput(line);
                  handleTestCustomLog(line);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                2. Login válido de sysadmin
              </button>

              <button
                onClick={() => {
                  const line = `Aug 26 15:40:20 edge-gw sshd[32110]: Failed password for root from 127.0.0.1 port 52100 ssh2`;
                  setTestLogInput(line);
                  handleTestCustomLog(line);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20 hover:bg-teal-500/20 transition-all cursor-pointer"
              >
                3. Error desde 127.0.0.1 (Whitelist)
              </button>

              <button
                onClick={() => {
                  const line = `Aug 26 15:40:25 edge-gw sshd[32115]: Invalid user postgres from 185.220.101.40 port 49120`;
                  setTestLogInput(line);
                  handleTestCustomLog(line);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                4. Usuario inválido (postgres)
              </button>
            </div>

            {/* Input Box and Button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={testLogInput}
                onChange={(e) => setTestLogInput(e.target.value)}
                placeholder="Pegue aquí una línea de syslog de SSH..."
                className="flex-1 bg-black border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-400 transition-colors"
              />
              <button
                onClick={() => handleTestCustomLog()}
                className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-mono font-bold text-xs hover:bg-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all cursor-pointer whitespace-nowrap"
              >
                Evaluar con el Motor
              </button>
            </div>

            {/* Result Box */}
            {testLogResult?.event && testLogResult.event.verification && (
              <div className="p-4 rounded-xl bg-black border border-emerald-500/30 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-white font-bold">Dictamen del Motor para este Evento:</span>
                  </div>
                  <div>
                    {testLogResult.event.verification.actionTaken === 'IGNORED_WHITELIST' && (
                      <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                        🛡️ PERDONADO (LISTA BLANCA)
                      </span>
                    )}
                    {testLogResult.event.verification.actionTaken === 'LOGGED_SUCCESS' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        ✅ ACCESO VÁLIDO
                      </span>
                    )}
                    {testLogResult.event.verification.actionTaken === 'RECORDED_FAILURE_PENDING' && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        ⚠️ FALLO COMPUTADO ({testLogResult.event.verification.failuresInWindowAfter}/{config.max_retries})
                      </span>
                    )}
                    {testLogResult.event.verification.actionTaken === 'THRESHOLD_EXCEEDED_BANNED' && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold animate-pulse">
                        🔥 BLOQUEO INMEDIATO EN FIREWALL
                      </span>
                    )}
                  </div>
                </div>

                {/* Explicación en lenguaje directo */}
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-slate-200 font-sans leading-relaxed text-xs">
                  <span className="font-bold text-emerald-300 block mb-1">¿Qué determinó el motor?</span>
                  {testLogResult.event.verification.decisionSummary}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block">Usuario detectado:</span>
                    <span className="text-white font-bold">{testLogResult.event.user}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">IP y Puerto:</span>
                    <span className="text-white font-bold">{testLogResult.event.ip}:{testLogResult.event.port}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">¿Es de confianza?:</span>
                    <span className={testLogResult.event.verification.isWhitelisted ? 'text-teal-400 font-bold' : 'text-slate-400'}>
                      {testLogResult.event.verification.isWhitelisted ? 'SÍ (Lista Blanca)' : 'NO (Monitoreada)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reloj Findtime:</span>
                    <span className="text-slate-300 font-bold">Ventana de {config.findtime_min}m</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Table of Recent Verified Events */}
          <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0f0f0f] shadow-xl space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  Auditoría de Eventos SSH Verificados Recientemente
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Haz click en "Verificar" en cualquier evento para examinar su explicación detallada.
                </p>
              </div>
              <button
                onClick={() => setSubView('console')}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
              >
                Abrir Visor de Logs Completo →
              </button>
            </div>

            <div className="divide-y divide-white/5 font-mono text-xs">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px]">{log.timestamp}</span>
                      <span className="text-white font-bold">{log.ip}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-300">{log.user}</span>
                      <span className="text-[10px] text-slate-500">Puerto {log.port}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      {log.verification?.decisionSummary || 'Analizado por el motor.'}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedVerifiedLog(log)}
                    className="px-3 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-mono flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verificar Dictamen</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* Verification Modal / Drawer for Single Log Event (Auditoría Detallada)    */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedVerifiedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Informe de Verificación del Evento SSH</h3>
                    <span className="text-[11px] text-slate-400">Auditoría del Lector de Logs (Backend B)</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVerifiedLog(null)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕ Cerrar
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                
                {/* Decision Banner in Human-friendly Spanish */}
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Veredicto del Motor de Seguridad:
                    </span>
                    <div>
                      {selectedVerifiedLog.verification?.actionTaken === 'IGNORED_WHITELIST' && (
                        <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                          🛡️ PERDONADO (LISTA BLANCA)
                        </span>
                      )}
                      {selectedVerifiedLog.verification?.actionTaken === 'LOGGED_SUCCESS' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          ✅ ACCESO VÁLIDO
                        </span>
                      )}
                      {selectedVerifiedLog.verification?.actionTaken === 'RECORDED_FAILURE_PENDING' && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          ⚠️ FALLO COMPUTADO ({selectedVerifiedLog.verification.failuresInWindowAfter}/{config.max_retries})
                        </span>
                      )}
                      {selectedVerifiedLog.verification?.actionTaken === 'THRESHOLD_EXCEEDED_BANNED' && (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold animate-pulse">
                          🔥 BLOQUEADO EN FIREWALL
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-200 font-sans text-xs leading-relaxed">
                    {selectedVerifiedLog.verification?.decisionSummary || 'Evento analizado y verificado contra las políticas de mitigación en Redis.'}
                  </p>
                </div>

                {/* Raw Log Line */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Registro Original Leído de /var/log/auth.log:</label>
                  <div className="p-3 rounded-lg bg-black border border-white/5 text-[11px] text-slate-300 break-all select-all font-mono">
                    {selectedVerifiedLog.rawLog}
                  </div>
                </div>

                {/* Structured Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  
                  {/* Identification Card */}
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 space-y-2">
                    <span className="text-slate-400 text-[11px] font-bold block border-b border-white/5 pb-1">
                      1. Identificación Extraída (Regex)
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Usuario:</span>
                        <span className="text-white font-bold">{selectedVerifiedLog.user}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dirección IP:</span>
                        <span className="text-emerald-400 font-bold">{selectedVerifiedLog.ip}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Puerto Origen:</span>
                        <span className="text-slate-300">{selectedVerifiedLog.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tipo de Evento:</span>
                        <span className="text-amber-300">{selectedVerifiedLog.eventType}</span>
                      </div>
                    </div>
                  </div>

                  {/* Whitelist & Tolerance Card */}
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 space-y-2">
                    <span className="text-slate-400 text-[11px] font-bold block border-b border-white/5 pb-1">
                      2. Políticas Evaluadas
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">¿Es de confianza?:</span>
                        <span className={whitelist.includes(selectedVerifiedLog.ip) ? 'text-teal-400 font-bold' : 'text-slate-400'}>
                          {whitelist.includes(selectedVerifiedLog.ip) ? 'SÍ (En Lista Blanca)' : 'NO (Externa)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ventana Findtime:</span>
                        <span className="text-slate-300">{config.findtime_min} minutos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Límite para bloqueo:</span>
                        <span className="text-amber-400 font-bold">{config.max_retries} fallos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Errores viejos borrados:</span>
                        <span className="text-slate-300">{selectedVerifiedLog.verification?.expiredFailuresDiscarded || 0}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Helpful Tip */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-[11px] text-slate-400 font-sans">
                  💡 <strong>¿Por qué es importante esta verificación?</strong> Cumple con la Issue #7 al auditar paso a paso cómo el motor algorítmico extrae los datos, consulta la Whitelist en Redis y evalúa la ventana temporal antes de tomar cualquier acción punitiva.
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-black/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!whitelist.includes(selectedVerifiedLog.ip) && (
                    <button
                      onClick={() => {
                        securityEngine.addToWhitelist(selectedVerifiedLog.ip);
                        setSelectedVerifiedLog(null);
                      }}
                      className="px-3 py-1.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 text-xs font-mono font-semibold cursor-pointer"
                    >
                      + Proteger en Lista Blanca
                    </button>
                  )}
                  {bannedIps.some(b => b.ip === selectedVerifiedLog.ip) && (
                    <button
                      onClick={() => {
                        securityEngine.unbanIp(selectedVerifiedLog.ip);
                        setSelectedVerifiedLog(null);
                      }}
                      className="px-3 py-1.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-mono font-semibold cursor-pointer"
                    >
                      Desbanear en Firewall
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedVerifiedLog(null)}
                  className="px-4 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-semibold cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
