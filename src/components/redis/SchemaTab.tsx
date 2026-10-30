import React from 'react';
import { Layers } from 'lucide-react';
import { SCHEMA_ITEMS } from './data';

/** Pestaña "Esquema": tabla del contrato de datos entre servicios. */
export const SchemaTab: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Esquema Centralizado de Datos Acordado (Inter-Servicios)
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Definición formal de espacios de nombres, tipos nativos de Redis, TTLs y contratos de
            propiedad para el Servicio 1 y Servicio 2.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 bg-black/50">
              <th className="py-3 px-4">Espacio de Nombres (Key)</th>
              <th className="py-3 px-4">Tipo Redis</th>
              <th className="py-3 px-4">Propietario</th>
              <th className="py-3 px-4">TTL / Expiración</th>
              <th className="py-3 px-4">Propósito</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {SCHEMA_ITEMS.map(item => (
              <tr key={item.namespace} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3 px-4 font-bold text-amber-400">{item.namespace}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-slate-300">
                    {item.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-300">{item.owner}</td>
                <td className="py-3 px-4 text-emerald-400">{item.ttl}</td>
                <td className="py-3 px-4 text-slate-300 max-w-xs font-sans text-xs">
                  {item.desc}
                  <div className="font-mono text-[10px] text-slate-500 mt-1 bg-black/60 px-2 py-1 rounded">
                    {item.example}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
