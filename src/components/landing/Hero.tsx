import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroProps {
  isAuthenticated: boolean;
  onNavigateToDashboard: () => void;
  onScrollToFeatures: () => void;
}

/** Encabezado principal con las llamadas a la acción. */
export const Hero: React.FC<HeroProps> = ({ isAuthenticated, onNavigateToDashboard, onScrollToFeatures }) => (
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
                onClick={onScrollToFeatures}
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
);
