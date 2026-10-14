import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Cpu, 
  Lock, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Server, 
  Radio, 
  Flame,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onNavigateToDashboard: () => void;
  onNavigateToSwagger: () => void;
  onNavigateToArchitecture: () => void;
  onOpenAttackModal: () => void;
  isAuthenticated?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToDashboard,
  onNavigateToSwagger,
  onNavigateToArchitecture,
  onOpenAttackModal,
  isAuthenticated = false
}) => {
  // Live Threat Monitor simulation
  const [terminalStep, setTerminalStep] = useState<number>(0);
  const [isTerminalRunning, setIsTerminalRunning] = useState<boolean>(true);

  const monitorEvents = [
    { type: 'info', text: '[SECURITY FEED] Monitoreo perimetral activo en interfaces de red expuestas' },
    { type: 'info', text: '[TELEMETRY] Sensor de análisis de comportamiento inicializado' },
    { type: 'warn', text: '[ALERT] Detección de múltiples intentos fallidos de autenticación (origen externo)' },
    { type: 'metric', text: '⚡ [HEURÍSTICA] Patrón anómalo de fuerza bruta identificado: umbral superado' },
    { type: 'alert', text: '🚨 [AMENAZA CRÍTICA] Ataque de diccionario en curso bloqueado por regla perimetral' },
    { type: 'exec', text: '>>> [MITIGACIÓN KERNEL] Filtrado a nivel de paquetes activado en 0.18ms' },
    { type: 'success', text: '✔ [ESTADO DE DEFENSA] Tráfico malicioso descartado automáticamente (DROP silencioso)' },
    { type: 'redis', text: '📦 [CLUSTER SYNC] Penalización temporal registrada con expiración automática (TTL)' }
  ];

  useEffect(() => {
    if (!isTerminalRunning) return;
    const timer = setInterval(() => {
      setTerminalStep(prev => (prev < monitorEvents.length - 1 ? prev + 1 : 0));
    }, 1500);
    return () => clearInterval(timer);
  }, [isTerminalRunning, monitorEvents.length]);

  const restartTerminal = () => {
    setTerminalStep(0);
    setIsTerminalRunning(true);
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('features-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] overflow-hidden text-slate-200 pb-20">
      
      {/* Background Cyber Grid and Glowing Accent */}
      <div className="absolute inset-0 bg-grid-cyber pointer-events-none opacity-40" />
      <div className="absolute -top-12 -right-12 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. Hero Section */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-16 md:pt-16 md:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* Engineering Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-6 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Autonomous SSH Shield • Enterprise Perimeter Defense</span>
          </motion.div>

          {/* High Impact Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight mb-6"
          >
            Enterprise <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Edge Defense</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-normal"
          >
            Protección perimetral autónoma contra intrusiones no autorizadas. Mitigación en tiempo real de ataques de fuerza bruta en milisegundos con lógica adaptativa y arquitectura Zero-Trust.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-3 mb-14"
          >
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                id="hero-cta-dashboard"
                onClick={onNavigateToDashboard}
                className="flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-black bg-emerald-500 hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] active:translate-y-0 active:scale-[0.98] transition-all duration-150 cursor-pointer text-sm group"
              >
                <Lock className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                <span>{isAuthenticated ? 'Acceder al Dashboard' : 'Iniciar Sesión / Acceso Administrador'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                id="hero-cta-features"
                onClick={scrollToFeatures}
                className="flex items-center gap-2 px-5 py-3 rounded-md font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/40 hover:text-white hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150 cursor-pointer text-sm group"
              >
                <Activity className="w-4 h-4 text-cyan-400 group-hover:scale-110 group-hover:text-cyan-300 transition-all" />
                <span>Conocer Capacidades</span>
              </button>
            </div>

            {!isAuthenticated && (
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 bg-white/[0.03] px-3 py-1 rounded-full border border-white/5 mt-1 hover:border-white/20 hover:text-slate-300 transition-colors cursor-default">
                <Lock className="w-3 h-3 text-emerald-400" />
                Portal público • Inicie sesión con su cuenta de administrador para acceder a las opciones de gestión.
              </span>
            )}
          </motion.div>

          {/* Key Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            <div className="group p-4 bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/20 rounded-xl text-center transition-all duration-200 cursor-default">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400 group-hover:scale-105 transition-transform duration-200">&lt;0.2ms</div>
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mt-1 group-hover:text-slate-400 transition-colors">Tiempo de Respuesta</div>
            </div>
            <div className="group p-4 bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-950/20 rounded-xl text-center transition-all duration-200 cursor-default">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-cyan-400 group-hover:scale-105 transition-transform duration-200">100%</div>
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mt-1 group-hover:text-slate-400 transition-colors">Filtrado a Nivel Kernel</div>
            </div>
            <div className="group p-4 bg-white/[0.03] border border-white/10 hover:border-white/30 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-950/20 rounded-xl text-center transition-all duration-200 cursor-default">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-white group-hover:scale-105 transition-transform duration-200">Zero-Overhead</div>
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mt-1 group-hover:text-slate-400 transition-colors">Motor Asíncrono</div>
            </div>
            <div className="group p-4 bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/20 rounded-xl text-center transition-all duration-200 cursor-default">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400 group-hover:scale-105 transition-transform duration-200">Zero-Trust</div>
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mt-1 group-hover:text-slate-400 transition-colors">Protección Anti-Lockout</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SOC Live Threat Monitor (Enfoque Enterprise SIEM) */}
        {/* ========================================================================= */}
        <div className="mt-14 max-w-4xl mx-auto" id="interactive-terminal-mockup">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
            
            {/* Window Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                </div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  SOC Telemetry Feed • Live Activity
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20 transition-colors cursor-default">
                  DEFENSE: ARMED
                </div>
                <button
                  onClick={() => setIsTerminalRunning(!isTerminalRunning)}
                  className="px-2.5 py-1 text-[11px] font-mono rounded bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white text-slate-300 flex items-center gap-1 border border-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-3 h-3 text-emerald-400" />
                  {isTerminalRunning ? 'Pausar' : 'Reanudar'}
                </button>
                <button
                  onClick={restartTerminal}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-white/10 rounded border border-transparent hover:border-white/10 transition-all active:scale-95 cursor-pointer"
                  title="Reiniciar flujo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Live Stats inside Monitor */}
            <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="group bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-0.5 p-3.5 rounded-lg border border-white/5 transition-all duration-150 cursor-default">
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 uppercase tracking-tighter font-mono transition-colors">Amenazas Mitigadas</div>
                <div className="text-2xl font-mono font-bold text-white group-hover:text-emerald-300 mt-0.5 transition-colors">1,248</div>
              </div>
              <div className="group bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-0.5 p-3.5 rounded-lg border border-white/5 transition-all duration-150 cursor-default">
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 uppercase tracking-tighter font-mono transition-colors">Intentos Bloqueados</div>
                <div className="text-2xl font-mono font-bold text-red-400 group-hover:text-red-300 mt-0.5 transition-colors">14.2k</div>
              </div>
              <div className="group bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-0.5 p-3.5 rounded-lg border border-white/5 transition-all duration-150 cursor-default">
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 uppercase tracking-tighter font-mono transition-colors">Disponibilidad del Servicio</div>
                <div className="text-2xl font-mono font-bold text-emerald-400 group-hover:text-emerald-300 mt-0.5 transition-colors">99.99%</div>
              </div>
              <div className="group bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-0.5 p-3.5 rounded-lg border border-white/5 transition-all duration-150 cursor-default">
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 uppercase tracking-tighter font-mono transition-colors">Latencia de Reacción</div>
                <div className="text-2xl font-mono font-bold text-white group-hover:text-cyan-300 mt-0.5 transition-colors">&lt; 0.2ms</div>
              </div>
            </div>

            {/* Terminal Screen Content */}
            <div className="p-6 pt-3">
              <div className="bg-black rounded-lg border border-white/10 overflow-hidden">
                <div className="bg-white/5 px-4 py-2 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">ACTIVIDAD DE EVENTOS EN TIEMPO REAL</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    CONEXIÓN SEGURA
                  </span>
                </div>
                <div className="p-4 font-mono text-xs sm:text-[13px] leading-relaxed space-y-1 h-[230px] overflow-y-auto bg-black text-emerald-500/90 select-none">
                  {monitorEvents.slice(0, terminalStep + 1).map((step, idx) => {
                    let colorClass = 'text-slate-300';
                    if (step.type === 'info') colorClass = 'text-cyan-400 opacity-80';
                    if (step.type === 'warn') colorClass = 'text-yellow-400';
                    if (step.type === 'metric') colorClass = 'text-emerald-400';
                    if (step.type === 'alert') colorClass = 'text-red-400 font-bold bg-red-500/10 px-1 py-0.5 rounded inline-block';
                    if (step.type === 'exec') colorClass = 'text-red-400 font-medium';
                    if (step.type === 'success') colorClass = 'text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded inline-block font-semibold';
                    if (step.type === 'redis') colorClass = 'text-slate-400';

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`${colorClass} hover:bg-white/[0.06] hover:pl-2 rounded px-1.5 py-0.5 transition-all duration-150 cursor-pointer`}
                      >
                        {step.text}
                      </motion.div>
                    );
                  })}
                  <div className="flex items-center gap-1 text-slate-400 pt-1">
                    <span className="text-xs text-emerald-400 font-bold">[ESCUDO ACTIVO]</span>
                    <span className="text-xs">Inspeccionando tráfico perimetral...</span>
                    <span className="w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
                  </div>
                </div>
              </div>

              {/* Status footer inside screen */}
              <div className="mt-4 flex gap-4 items-center px-3 py-1.5 bg-white/5 rounded-full border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full rounded-full"></div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 whitespace-nowrap font-medium">PROTECCIÓN: 100% OPERATIVA</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
            </div>

            {/* Clean Status bar */}
            <div className="px-6 py-3.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Mitigación automática activa sin intervención manual
              </span>
              <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors cursor-default">
                Kernel Packet Drop
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. Bento Box Feature Grid */}
      {/* ========================================================================= */}
      <section id="features-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Capacidades de Seguridad Perimetral
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Diseñado para erradicar ataques de fuerza bruta en servidores empresariales mediante detección temprana y mitigación sin impacto en la CPU.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Bento Item 1: Detección Temprana */}
          <div className="md:col-span-2 p-6 sm:p-8 bg-white/[0.03] border border-white/10 rounded-xl relative overflow-hidden group hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/20 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-200">
                <Cpu className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 group-hover:border-emerald-500/30 group-hover:text-emerald-300 transition-colors">
                Alta Disponibilidad
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
              Detección de Amenazas y Bloqueo en Tiempo Real
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Separación arquitectónica de responsabilidades. El plano de datos procesa flujos de conexión con latencia sub-milisegundo, mientras el plano de control centraliza la auditoría, control de accesos y métricas de seguridad.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
              <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all">
                <div className="text-emerald-400 font-semibold mb-1">Plano de Control y Gestión</div>
                <div className="text-slate-400">• Control de acceso de administradores</div>
                <div className="text-slate-400">• Recuperación de credenciales con caducidad</div>
                <div className="text-slate-400">• Métricas en vivo y auditoría de eventos</div>
              </div>
              <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all">
                <div className="text-cyan-400 font-semibold mb-1">Motor de Mitigación Perimetral</div>
                <div className="text-slate-400">• Análisis heurístico de tráfico continuo</div>
                <div className="text-slate-400">• Bloqueo de intrusión en menos de 0.2ms</div>
                <div className="text-slate-400">• Sincronización instantánea de sanciones</div>
              </div>
            </div>
          </div>

          {/* Bento Item 2: Prevención de Auto-bloqueo */}
          <div className="p-6 sm:p-8 bg-white/[0.03] border border-white/10 rounded-xl group hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-950/20 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40 transition-all duration-200">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                Zero-Trust &amp; Whitelist
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Protección inmutable para interfaces de loopback local y soporte para rangos CIDR corporativos, garantizando inmunidad total contra auto-bloqueos accidentales.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-mono hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-colors">
              ✔ Protección permanente para Loopback<br />
              ✔ Soporte de subredes corporativas y VPN<br />
              ✔ Garantía total contra desconexión involuntaria
            </div>
          </div>

          {/* Bento Item 3: Protección Adaptativa */}
          <div className="p-6 sm:p-8 bg-white/[0.03] border border-white/10 rounded-xl group hover:border-yellow-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-950/20 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-yellow-500/20 group-hover:border-yellow-500/40 transition-all duration-200">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">
                Políticas de Castigo Adaptativo
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Calibración dinámica de umbrales máximos de intentos, ventanas de observación y tiempos de penalización con liberación automática de recursos.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="p-2 rounded bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 hover:bg-white/[0.05] transition-all">
                <div className="text-yellow-400 font-bold">5</div>
                <div className="text-[10px] text-slate-500">Max Retries</div>
              </div>
              <div className="p-2 rounded bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 hover:bg-white/[0.05] transition-all">
                <div className="text-yellow-400 font-bold">10m</div>
                <div className="text-[10px] text-slate-500">Ventana</div>
              </div>
              <div className="p-2 rounded bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 hover:bg-white/[0.05] transition-all">
                <div className="text-yellow-400 font-bold">60m</div>
                <div className="text-[10px] text-slate-500">Auto-Desbloqueo</div>
              </div>
            </div>
          </div>

          {/* Bento Item 4: Filtrado a Nivel de Red */}
          <div className="md:col-span-2 p-6 sm:p-8 bg-white/[0.03] border border-white/10 rounded-xl group hover:border-red-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-950/20 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-red-500/20 group-hover:border-red-500/40 transition-all duration-200">
                <Flame className="w-5 h-5 text-red-400" />
              </div>
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 group-hover:border-red-500/30 group-hover:text-red-300 transition-colors">
                Aislamiento Perimetral
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-red-300 transition-colors">
              Filtrado de Paquetes en Capa de Red
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              A diferencia de herramientas que consumen memoria y sockets manteniendo conexiones abiertas, las reglas perimetrales descartan el tráfico malicioso inmediatamente, previniendo saturación y ataques de denegación de servicio.
            </p>
            <div className="p-3 bg-black rounded-lg border border-white/10 font-mono text-xs text-slate-300 flex items-center justify-between hover:border-white/20 transition-colors">
              <span className="text-emerald-400 font-medium">Regla de descarte activa: Tráfico hostil neutralizado en el perímetro</span>
              <span className="text-emerald-400 font-semibold">&lt; 0.2ms</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. Creators Section */}
      {/* ========================================================================= */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5">
        <div className="bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 p-8 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-200">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs mb-2 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>SISTEMA AUTÓNOMO DE PROTECCIÓN PERIMETRAL SSH</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              Bannedbyabrejeet Perimeter Engine
            </h3>
            <p className="text-slate-400 text-sm">
              Diseñado e implementado por <strong className="text-slate-200">Santiago Mulet</strong> y <strong className="text-slate-200">Manuel Abrego</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToDashboard}
              className="px-6 py-2.5 rounded-md font-semibold bg-emerald-500 text-black hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] active:translate-y-0 active:scale-[0.98] transition-all text-xs font-mono cursor-pointer duration-150"
            >
              {isAuthenticated ? 'Acceder al Dashboard' : 'Iniciar Sesión'}
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

