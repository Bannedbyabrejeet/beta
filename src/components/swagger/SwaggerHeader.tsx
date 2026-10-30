import React from 'react';

interface SwaggerHeaderProps {
  tags: string[];
  selectedTag: string;
  onSelectTag: (tag: string) => void;
}

/** Encabezado de la documentación + filtros por tag. */
export const SwaggerHeader: React.FC<SwaggerHeaderProps> = ({ tags, selectedTag, onSelectTag }) => (
  <div className="bg-[#0f0f0f] p-6 rounded-2xl border border-white/10 shadow-xl mb-8">
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            OpenAPI 3.0.3
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Bannedbyabrejeet API Documentation
          </h1>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm">
          Especificación OpenAPI interactiva generada por FastAPI (Servicio 1) y el Motor de Seguridad
          (Servicio 2). Pruebe endpoints en vivo contra el estado de Redis.
        </p>
      </div>

      <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-black p-2.5 rounded-md border border-white/10">
        <span className="text-emerald-400 font-semibold">Base URL:</span>
        <span>http://localhost/api/v1</span>
      </div>
    </div>

    <div className="flex flex-wrap gap-1.5 mt-6 pt-4 border-t border-white/5">
      {tags.map(tag => (
        <button
          key={tag}
          onClick={() => onSelectTag(tag)}
          className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
            selectedTag === tag
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
              : 'bg-black text-slate-400 hover:text-slate-200 border border-white/10'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  </div>
);
