import React from 'react';
import { EndpointResponse } from '../../hooks/useEndpointRunner';

interface ResponsePanelProps {
  response: EndpointResponse;
}

/** Panel con el resultado de "Try it out". */
export const ResponsePanel: React.FC<ResponsePanelProps> = ({ response }) => (
  <div className="mt-4 p-4 rounded-xl bg-black border border-white/10 space-y-2 font-mono text-xs">
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">HTTP Status:</span>
        <span
          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
            response.status >= 200 && response.status < 300
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          {response.status}
        </span>
      </div>
      <span className="text-slate-400 text-[11px]">
        Latencia: <strong className="text-emerald-400">{response.durationMs}ms</strong>
      </span>
    </div>

    <pre className="text-emerald-300 overflow-x-auto text-[11px] max-h-60 p-2 bg-[#0f0f0f] rounded border border-white/5">
      {JSON.stringify(response.data, null, 2)}
    </pre>
  </div>
);
