import React from 'react';
import { Radio } from 'lucide-react';
import { PubSubMessage } from '../../types';

interface StreamFeedProps {
  messages: PubSubMessage[];
}

/** Feed de eventos Pub/Sub recibidos (stream de desbaneo). */
export const StreamFeed: React.FC<StreamFeedProps> = ({ messages }) => (
  <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 sm:p-6 shadow-xl space-y-3">
    <div className="flex items-center justify-between pb-3 border-b border-white/5 font-mono text-xs">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
        <span className="text-white font-bold">
          Flujo de Eventos en Redis Streams (XADD / XACK):
        </span>
      </div>
      <span className="text-[11px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
        stream:unban_orders
      </span>
    </div>

    <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-xs">
      {messages.length === 0 ? (
        <div className="text-slate-500 py-4 text-center">
          Esperando mensajes de desbaneo en el Stream entre FastAPI y Express...
        </div>
      ) : (
        messages.map(msg => (
          <div
            key={msg.id}
            className="p-3 bg-black rounded-lg border border-white/10 flex items-start justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                  {msg.payload.action}
                </span>
                <span className="text-slate-400 text-[11px]">Stream: stream:unban_orders</span>
                <span className="text-slate-500 text-[10px]">({msg.sender})</span>
              </div>
              <div className="text-slate-300 text-[11px]">
                {msg.payload.ip ? `IP Objetivo: ${msg.payload.ip}` : ''}{' '}
                {msg.payload.reason ? `— ${msg.payload.reason}` : ''}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                ACKNOWLEDGED (XACK)
              </span>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {new Date(msg.payload.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);
