import React, { useState } from 'react';
import { 
  Layers, 
  Copy, 
  Check, 
  Download, 
  Server, 
  Terminal, 
  ShieldAlert, 
  Database, 
  Radio, 
  ArrowDown, 
  ArrowRight,
  Code2,
  FolderTree,
  Cpu,
  Flame
} from 'lucide-react';
import { ARCHITECTURE_FILES, ArchFile } from '../data/architectureFiles';

export const ArchitectureHub: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ArchFile>(ARCHITECTURE_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-200">
      
      {/* Header */}
      <div className="bg-[#0f0f0f] p-6 rounded-2xl border border-white/10 shadow-xl mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Layers className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Arquitectura de Contenedores & Blueprint Docker
          </h1>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm">
          Especificación de ingeniería para despliegue productivo. Topología multiservicio desacoplada con Nginx, FastAPI, Express con privilegios <code className="text-emerald-400 font-mono">CAP_NET_ADMIN</code> y Redis Pub/Sub.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 1. Visual Topology Diagram */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0f0f0f] border border-white/10 mb-8">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          Diagrama de Flujo & Topología de Red
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative font-mono text-xs">
          
          {/* Node 1: Ingress / Nginx Proxy */}
          <div className="p-4 rounded-xl bg-black border border-white/10 flex flex-col justify-between relative group hover:border-cyan-400/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Reverse Proxy
              </span>
              <Server className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="font-bold text-white text-sm mb-1">Nginx Proxy</div>
            <div className="text-[11px] text-slate-400 space-y-1 mb-3">
              <div>• :80 / :443 Ingress</div>
              <div>• Microfrontends A/B</div>
              <div>• Enrutador API REST</div>
            </div>
            <div className="p-2 bg-[#0f0f0f] rounded text-[10px] text-cyan-300 border border-white/5">
              bannedbyabrejeet_proxy
            </div>
          </div>

          {/* Node 2: Service 1 (FastAPI) */}
          <div className="p-4 rounded-xl bg-black border border-white/10 flex flex-col justify-between relative group hover:border-emerald-400/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Servicio 1 (REST API)
              </span>
              <Terminal className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-bold text-white text-sm mb-1">FastAPI Python</div>
            <div className="text-[11px] text-slate-400 space-y-1 mb-3">
              <div>• JWT Auth (Bcrypt)</div>
              <div>• Reset TTL Tokens</div>
              <div>• OpenAPI Swagger</div>
              <div>• Publicador Pub/Sub</div>
            </div>
            <div className="p-2 bg-[#0f0f0f] rounded text-[10px] text-emerald-300 border border-white/5">
              :8000 (FastAPI Service)
            </div>
          </div>

          {/* Node 3: Database & Message Broker (Redis) */}
          <div className="p-4 rounded-xl bg-black border border-amber-500/30 flex flex-col justify-between relative shadow-[0_0_20px_rgba(245,158,11,0.05)] group">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Database / PubSub
              </span>
              <Database className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-bold text-white text-sm mb-1">Redis 7.2 Alpine</div>
            <div className="text-[11px] text-slate-400 space-y-1 mb-3">
              <div>• Hash: config:settings</div>
              <div>• Set: config:whitelist</div>
              <div>• TTL: ip:failures:&lt;IP&gt;</div>
              <div>• PubSub: unban_events</div>
            </div>
            <div className="p-2 bg-[#0f0f0f] rounded text-[10px] text-amber-300 border border-white/5">
              :6379 (In-Memory Engine)
            </div>
          </div>

          {/* Node 4: Service 2 (Express + CAP_NET_ADMIN) */}
          <div className="p-4 rounded-xl bg-black border border-rose-500/30 flex flex-col justify-between relative shadow-[0_0_20px_rgba(239,68,68,0.05)] group">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                Servicio 2 (Engine)
              </span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="font-bold text-white text-sm mb-1">Express Security Engine</div>
            <div className="text-[11px] text-slate-400 space-y-1 mb-3">
              <div>• CAP_NET_ADMIN</div>
              <div>• /var/log/auth.log tail</div>
              <div>• ufw deny ejecutor</div>
              <div>• Suscriptor channel:unban</div>
            </div>
            <div className="p-2 bg-[#0f0f0f] rounded text-[10px] text-rose-300 border border-white/5">
              network_mode: host + UFW
            </div>
          </div>

        </div>

        {/* Inter-service Pub/Sub Flow Explanation */}
        <div className="mt-6 p-4 rounded-xl bg-black border border-white/10 text-xs font-mono text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span><strong>Canal Desacoplado:</strong> FastAPI emite orden de desbaneo → Redis Pub/Sub (<code className="text-amber-400">channel:unban_events</code>) → Express con <code className="text-rose-400">CAP_NET_ADMIN</code> remueve la regla de Linux UFW en el kernel.</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Production Files Inspector & Code Viewer */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* File Tree Selector */}
        <div className="lg:col-span-1 p-4 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
            <FolderTree className="w-4 h-4 text-emerald-400" />
            Archivos del Proyecto:
          </div>

          {ARCHITECTURE_FILES.map((file) => {
            const isSelected = selectedFile.name === file.name;
            return (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-xs font-mono transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="truncate">
                  <div className="truncate text-white">{file.name}</div>
                  <div className="text-[10px] text-slate-500">{file.path}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Code Viewer Panel */}
        <div className="lg:col-span-3 rounded-2xl border border-white/10 overflow-hidden bg-[#0f0f0f] shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="px-5 py-3.5 bg-black border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs font-bold text-white">{selectedFile.name}</span>
                <span className="text-[10px] font-mono text-slate-500">({selectedFile.language})</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 border border-white/10"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500 text-black font-bold hover:bg-emerald-400 text-xs font-mono transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar</span>
              </button>
            </div>
          </div>

          {/* Code Content */}
          <div className="p-4 sm:p-6 overflow-x-auto max-h-[500px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 bg-black">
            <pre>{selectedFile.content}</pre>
          </div>

        </div>

      </div>

    </div>
  );
};
