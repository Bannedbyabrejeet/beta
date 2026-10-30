import React from 'react';
import { StreamFeed } from './StreamFeed';
import { AdminUser, BannedIp, IpFailureRecord, PubSubMessage, SystemConfig } from '../../types';

export interface RedisKeyItem {
  key: string;
  type: string;
  ttl: string;
  count: number;
}

export interface RedisSnapshot {
  config: SystemConfig;
  whitelist: string[];
  bannedIps: BannedIp[];
  failures: IpFailureRecord[];
  pubSubLogs: PubSubMessage[];
  adminUser: AdminUser;
}

interface KeysExplorerProps {
  keys: RedisKeyItem[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  snapshot: RedisSnapshot;
}

const TYPE_CLASS: Record<string, string> = {
  Hash: 'bg-purple-500/20 text-purple-300',
  Set: 'bg-teal-500/20 text-teal-300'
};

/** Pestaña "Explorador": árbol de claves + valor + feed de eventos. */
export const KeysExplorer: React.FC<KeysExplorerProps> = ({
  keys,
  selectedKey,
  onSelectKey,
  snapshot
}) => {
  const { config, whitelist, bannedIps, failures, pubSubLogs, adminUser } = snapshot;

  const keyValue = (): unknown => {
    if (selectedKey === 'config:settings') return config;
    if (selectedKey === 'config:whitelist') {
      return { type: 'Redis Set', members: whitelist, immutable_rule: '127.0.0.1' };
    }
    if (selectedKey === 'ip:banned') return bannedIps;
    if (selectedKey === 'auth:admin') {
      return {
        username: adminUser.username,
        email: adminUser.email,
        password_hash: '<bcrypt_hash_protegido>',
        isConfigured: adminUser.isConfigured,
        temp_reset_token: adminUser.tempResetToken || null
      };
    }
    if (selectedKey.startsWith('ip:failures:')) {
      return (
        failures.find(f => `ip:failures:${f.ip}` === selectedKey) || { status: 'Expired or deleted' }
      );
    }
    return {};
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Keys list */}
      <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider pb-2 border-b border-white/5">
          <span>Claves en Redis (KEYS *)</span>
          <span>{keys.length} Claves</span>
        </div>

        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
          {keys.map(k => {
            const isSelected = selectedKey === k.key;
            return (
              <button
                key={k.key}
                onClick={() => onSelectKey(k.key)}
                className={`w-full text-left p-3 rounded-md font-mono text-xs transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shadow-sm'
                    : 'bg-black text-slate-300 hover:bg-white/5 border border-white/10'
                }`}
              >
                <div className="truncate">
                  <div className="truncate text-white font-semibold">{k.key}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">TTL: {k.ttl}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    TYPE_CLASS[k.type] ?? 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {k.type} ({k.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail + stream */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 font-mono text-xs">
            <div>
              <span className="text-slate-400">Inspeccionando Clave: </span>
              <strong className="text-amber-400 text-sm">{selectedKey}</strong>
            </div>
          </div>

          <div className="font-mono text-xs bg-black p-4 rounded-xl border border-white/10 overflow-x-auto text-emerald-400 leading-relaxed">
            <pre>{JSON.stringify(keyValue(), null, 2)}</pre>
          </div>
        </div>

        <StreamFeed messages={pubSubLogs} />
      </div>
    </div>
  );
};
