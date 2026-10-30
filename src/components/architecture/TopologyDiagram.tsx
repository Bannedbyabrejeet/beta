import React from 'react';
import { Cpu, Radio } from 'lucide-react';
import { TOPOLOGY_NODES } from './topology';

/** Diagrama de flujo entre los 4 contenedores/servicios. */
export const TopologyDiagram: React.FC = () => (
  <div className="p-6 sm:p-8 rounded-2xl bg-[#0f0f0f] border border-white/10 mb-8">
    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
      <Cpu className="w-5 h-5 text-emerald-400" />
      Diagrama de Flujo &amp; Topología de Red
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative font-mono text-xs">
      {TOPOLOGY_NODES.map(({ badge, badgeClass, icon: Icon, iconClass, title, items, footer, footerClass, cardClass }) => (
        <div
          key={title}
          className={`p-4 rounded-xl bg-black flex flex-col justify-between relative group ${cardClass}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
              {badge}
            </span>
            <Icon className={`w-4 h-4 ${iconClass}`} />
          </div>
          <div className="font-bold text-white text-sm mb-1">{title}</div>
          <div className="text-[11px] text-slate-400 space-y-1 mb-3">
            {items.map(item => (
              <div key={item}>{item}</div>
            ))}
          </div>
          <div className={`p-2 bg-[#0f0f0f] rounded text-[10px] border border-white/5 ${footerClass}`}>
            {footer}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-6 p-4 rounded-xl bg-black border border-white/10 text-xs font-mono text-slate-300 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
        <span>
          <strong>Canal Desacoplado:</strong> FastAPI emite orden de desbaneo → Redis Pub/Sub (
          <code className="text-amber-400">channel:unban_events</code>) → Express con{' '}
          <code className="text-rose-400">CAP_NET_ADMIN</code> remueve la regla de Linux UFW en el kernel.
        </span>
      </div>
    </div>
  </div>
);
