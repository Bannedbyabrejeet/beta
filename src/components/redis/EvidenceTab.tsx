import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { CLI_COMMANDS } from './data';

/** Pestaña "Evidencia": sesión de redis-cli y datos de persistencia. */
export const EvidenceTab: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const copyCli = () => {
    navigator.clipboard.writeText(CLI_COMMANDS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">
                Evidencia de Conexión &amp; Comprobación de Volúmenes Persistentes (redis-cli)
              </h2>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Salida de la sesión de validación ejecutada contra el contenedor{' '}
              <code className="text-amber-400">beta-redis</code> comprobando persistencia AOF/RDB y
              volumen montado en <code className="text-amber-400">/data</code>.
            </p>
          </div>

          <button
            onClick={copyCli}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado al portapapeles</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Sesión CLI</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3 bg-black rounded-xl border border-white/10">
            <div className="text-slate-500 text-[10px] uppercase">Contenedor &amp; Imagen</div>
            <div className="text-emerald-400 font-bold mt-0.5">beta-redis</div>
            <div className="text-slate-400 text-[10px]">redis:7-alpine (Dockerizado)</div>
          </div>
          <div className="p-3 bg-black rounded-xl border border-white/10">
            <div className="text-slate-500 text-[10px] uppercase">Volumen Persistente</div>
            <div className="text-amber-400 font-bold mt-0.5">redis_data:/data</div>
            <div className="text-slate-400 text-[10px]">Directorio /data montado en Host</div>
          </div>
          <div className="p-3 bg-black rounded-xl border border-white/10">
            <div className="text-slate-500 text-[10px] uppercase">Estrategia Persistencia</div>
            <div className="text-purple-400 font-bold mt-0.5">AOF (everysec) + RDB (snapshots)</div>
            <div className="text-slate-400 text-[10px]">Cero pérdida de eventos de ban</div>
          </div>
        </div>

        <div className="rounded-xl bg-black border border-white/15 overflow-hidden shadow-2xl">
          <div className="bg-[#181818] px-4 py-2 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-xs text-slate-400">
                bash — host-vps: ~/beta
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">SESSION: VERIFIED</span>
          </div>
          <div className="p-4 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed max-h-[400px]">
            <pre>{CLI_COMMANDS}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
