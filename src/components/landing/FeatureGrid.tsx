import React, { useState, useEffect } from 'react';
import { ShieldAlert, Cpu, Zap, Flame } from 'lucide-react';
import { motion } from 'motion/react';

/** Grilla "bento" de capacidades del producto. */
export const FeatureGrid: React.FC = () => (
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
);
