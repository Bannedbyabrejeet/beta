import React from 'react';
import { EventType } from '../../types';
import { AttackParams } from './presets';

interface AttackParamsFormProps {
  params: AttackParams;
  onChange: (params: AttackParams) => void;
}

const FIELD_CLASS =
  'w-full bg-black border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-rose-500';

/** Formulario de parámetros del ataque simulado. */
export const AttackParamsForm: React.FC<AttackParamsFormProps> = ({ params, onChange }) => {
  const patch = (partial: Partial<AttackParams>) => onChange({ ...params, ...partial });

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-slate-300 block mb-1">IP de Origen Simulada:</label>
          <input
            type="text"
            value={params.ip}
            onChange={e => patch({ ip: e.target.value })}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label className="text-slate-300 block mb-1">Usuario Objetivo:</label>
          <input
            type="text"
            value={params.user}
            onChange={e => patch({ user: e.target.value })}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-slate-300 block mb-1">
            Cantidad de Intentos: ({params.attempts})
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={params.attempts}
            onChange={e => patch({ attempts: parseInt(e.target.value, 10) })}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>

        <div>
          <label className="text-slate-300 block mb-1">Tipo de Evento Syslog:</label>
          <select
            value={params.type}
            onChange={e => patch({ type: e.target.value as EventType })}
            className={FIELD_CLASS}
          >
            <option value="FAILED_PASSWORD">FAILED_PASSWORD</option>
            <option value="INVALID_USER">INVALID_USER</option>
            <option value="ACCEPTED_KEY">ACCEPTED_KEY</option>
            <option value="PREAUTH_DISCONNECT">PREAUTH_DISCONNECT</option>
          </select>
        </div>
      </div>
    </div>
  );
};
