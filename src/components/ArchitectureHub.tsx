import React from 'react';
import { Layers } from 'lucide-react';
import { TopologyDiagram } from './architecture/TopologyDiagram';
import { FileExplorer } from './architecture/FileExplorer';

/** Hub de arquitectura: blueprint Docker, topología y archivos del proyecto. */
export const ArchitectureHub: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-200">
    <div className="bg-[#0f0f0f] p-6 rounded-2xl border border-white/10 shadow-xl mb-8">
      <div className="flex items-center gap-2.5 mb-2">
        <Layers className="w-6 h-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Arquitectura de Contenedores &amp; Blueprint Docker
        </h1>
      </div>
      <p className="text-slate-400 text-xs sm:text-sm">
        Especificación de ingeniería para despliegue productivo. Topología multiservicio desacoplada con
        Nginx, FastAPI, Express con privilegios{' '}
        <code className="text-emerald-400 font-mono">CAP_NET_ADMIN</code> y Redis Pub/Sub.
      </p>
    </div>

    <TopologyDiagram />
    <FileExplorer />
  </div>
);
