import React from 'react';
import { ChevronDown, ChevronRight, Play, Copy, Check } from 'lucide-react';
import { ApiEndpoint } from '../../data/openApiSpec';
import { EndpointRunner } from '../../hooks/useEndpointRunner';
import { ResponsePanel } from './ResponsePanel';
import { methodBadgeClass } from './methodBadge';

interface EndpointCardProps {
  endpoint: ApiEndpoint;
  isExpanded: boolean;
  onToggle: () => void;
  runner: EndpointRunner;
  copied: boolean;
  onCopyCurl: (endpoint: ApiEndpoint) => void;
}

/** Endpoint del acordeón: resumen + playground expandido. */
export const EndpointCard: React.FC<EndpointCardProps> = ({
  endpoint,
  isExpanded,
  onToggle,
  runner,
  copied,
  onCopyCurl
}) => {
  const response = runner.responses[endpoint.id];

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isExpanded
          ? 'border-white/20 bg-[#0f0f0f] shadow-xl'
          : 'border-white/10 bg-[#0f0f0f]/60 hover:border-white/20'
      }`}
    >
      <div
        onClick={onToggle}
        className="p-4 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${methodBadgeClass(endpoint.method)}`}>
            {endpoint.method}
          </span>
          <span className="font-mono text-xs sm:text-sm font-semibold text-white">
            {endpoint.path}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">— {endpoint.summary}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
            {endpoint.service}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 border-t border-white/5 bg-black/40 space-y-6">
          <div>
            <h4 className="text-xs font-mono uppercase text-slate-400 mb-1">Descripción:</h4>
            <p className="text-xs text-slate-300">{endpoint.description}</p>
          </div>

          {endpoint.parameters && (
            <div>
              <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Parámetros:</h4>
              <div className="space-y-2">
                {endpoint.parameters.map(param => (
                  <div
                    key={param.name}
                    className="flex items-center gap-3 bg-black p-2.5 rounded-lg border border-white/10 text-xs font-mono"
                  >
                    <span className="text-amber-400 font-bold">{param.name}</span>
                    <span className="text-[10px] text-slate-500">({param.in})</span>
                    <input
                      type="text"
                      value={runner.pathParams[endpoint.id]?.[param.name] || ''}
                      onChange={e => runner.setPathParam(endpoint.id, param.name, e.target.value)}
                      className="bg-[#0f0f0f] border border-white/10 rounded px-2 py-1 text-white flex-1 focus:outline-none focus:border-cyan-500"
                      placeholder={param.description}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.requestBody && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-mono uppercase text-slate-400">Request Body (JSON):</h4>
                <span className="text-[10px] font-mono text-slate-500">
                  {endpoint.requestBody.contentType}
                </span>
              </div>
              <textarea
                rows={5}
                value={
                  runner.requestBodies[endpoint.id] ||
                  JSON.stringify(endpoint.requestBody.example, null, 2)
                }
                onChange={e => runner.setRequestBody(endpoint.id, e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => runner.execute(endpoint)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ejecutar Petición (Try it out)</span>
            </button>

            <button
              onClick={() => onCopyCurl(endpoint)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copiado' : 'Copiar cURL'}</span>
            </button>
          </div>

          {response && <ResponsePanel response={response} />}
        </div>
      )}
    </div>
  );
};
