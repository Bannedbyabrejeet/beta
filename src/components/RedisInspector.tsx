import React, { useState, useEffect } from 'react';
import { Database, Download } from 'lucide-react';
import { securityEngine } from '../services/securityEngine';
import { ARCHITECTURE_FILES } from '../data/architectureFiles';
import { downloadTextFile } from '../utils/download';
import { KeysExplorer, RedisKeyItem, RedisSnapshot } from './redis/KeysExplorer';
import { SchemaTab } from './redis/SchemaTab';
import { EvidenceTab } from './redis/EvidenceTab';

type RedisTab = 'explorer' | 'schema' | 'evidence';

const TABS: Array<{ id: RedisTab; label: string }> = [
  { id: 'explorer', label: 'Explorador de Claves en Vivo' },
  { id: 'schema', label: 'Esquema de Datos Acordado' },
  { id: 'evidence', label: 'Evidencia redis-cli (Persistencia & AOF)' }
];

const DOWNLOAD_FILES: Array<{ fileName: string; label: string; iconClass: string }> = [
  { fileName: 'Dockerfile.redis', label: 'Dockerfile.redis', iconClass: 'text-amber-400' },
  { fileName: 'redis.conf', label: 'redis.conf', iconClass: 'text-emerald-400' },
  { fileName: 'redis-schema-agreed.md', label: 'Esquema (.md)', iconClass: 'text-purple-400' }
];

function downloadFile(fileName: string) {
  const file = ARCHITECTURE_FILES.find(f => f.name === fileName);
  if (file) downloadTextFile(file.name, file.content);
}

/** Inspector del estado real de Redis (claves, esquema y evidencia). */
export const RedisInspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RedisTab>('explorer');
  const [selectedKey, setSelectedKey] = useState<string>('config:settings');
  const [snapshot, setSnapshot] = useState<RedisSnapshot>(() => ({
    config: securityEngine.getConfig(),
    whitelist: securityEngine.getWhitelist(),
    bannedIps: securityEngine.getBannedIps(),
    failures: securityEngine.getIpFailures(),
    pubSubLogs: securityEngine.getPubSubMessages(),
    adminUser: securityEngine.getAdminUser()
  }));

  useEffect(() => {
    const unsub = securityEngine.subscribe(() => {
      setSnapshot({
        config: securityEngine.getConfig(),
        whitelist: securityEngine.getWhitelist(),
        bannedIps: securityEngine.getBannedIps(),
        failures: securityEngine.getIpFailures(),
        pubSubLogs: securityEngine.getPubSubMessages(),
        adminUser: securityEngine.getAdminUser()
      });
    });
    return unsub;
  }, []);

  const keys: RedisKeyItem[] = [
    { key: 'config:settings', type: 'Hash', ttl: 'Persistent', count: 3 },
    { key: 'config:whitelist', type: 'Set', ttl: 'Persistent', count: snapshot.whitelist.length },
    { key: 'ip:banned', type: 'Hash', ttl: 'Dynamic (TTL)', count: snapshot.bannedIps.length },
    { key: 'auth:admin', type: 'Hash', ttl: 'Persistent', count: 4 },
    ...snapshot.failures.map(f => ({
      key: `ip:failures:${f.ip}`,
      type: 'List',
      ttl: `${snapshot.config.findtime_min * 60}s`,
      count: f.timestamps.length
    }))
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-200">
      <div className="bg-[#0f0f0f] p-6 rounded-2xl border border-white/10 shadow-xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <Database className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Almacenamiento Centralizado en Memoria (Redis 7 + Streams)
            </h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            Persistencia híbrida (AOF/RDB), volumen Dockerizado{' '}
            <code className="text-amber-400 font-mono">redis_data:/data</code> y esquema acordado
            entre microservicios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DOWNLOAD_FILES.map(({ fileName, label, iconClass }) => (
            <button
              key={fileName}
              onClick={() => downloadFile(fileName)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono transition-all"
              title={`Descargar ${fileName}`}
            >
              <Download className={`w-3.5 h-3.5 ${iconClass}`} />
              <span>{label}</span>
            </button>
          ))}

          <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-black px-3 py-1.5 rounded-lg border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>beta-redis:7-alpine</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === id
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'explorer' && (
        <KeysExplorer
          keys={keys}
          selectedKey={selectedKey}
          onSelectKey={setSelectedKey}
          snapshot={snapshot}
        />
      )}
      {activeTab === 'schema' && <SchemaTab />}
      {activeTab === 'evidence' && <EvidenceTab />}
    </div>
  );
};
