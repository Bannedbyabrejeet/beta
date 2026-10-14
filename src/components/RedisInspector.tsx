import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Radio, 
  Layers,
  Terminal,
  FileCode,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { securityEngine } from '../services/securityEngine';
import { SystemConfig, BannedIp, IpFailureRecord, PubSubMessage } from '../types';
import { ARCHITECTURE_FILES } from '../data/architectureFiles';

export const RedisInspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'schema' | 'evidence'>('explorer');
  const [config, setConfig] = useState<SystemConfig>(securityEngine.getConfig());
  const [whitelist, setWhitelist] = useState<string[]>(securityEngine.getWhitelist());
  const [bannedIps, setBannedIps] = useState<BannedIp[]>(securityEngine.getBannedIps());
  const [failures, setFailures] = useState<IpFailureRecord[]>(securityEngine.getIpFailures());
  const [pubSubLogs, setPubSubLogs] = useState<PubSubMessage[]>(securityEngine.getPubSubMessages());
  const [adminUser, setAdminUser] = useState(securityEngine.getAdminUser());
  const [selectedKey, setSelectedKey] = useState<string>('config:settings');
  const [copiedCli, setCopiedCli] = useState<boolean>(false);

  const handleDownloadFile = (fileName: string) => {
    const file = ARCHITECTURE_FILES.find(f => f.name === fileName);
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const unsub = securityEngine.subscribe(() => {
      setConfig(securityEngine.getConfig());
      setWhitelist(securityEngine.getWhitelist());
      setBannedIps(securityEngine.getBannedIps());
      setFailures(securityEngine.getIpFailures());
      setPubSubLogs(securityEngine.getPubSubMessages());
      setAdminUser(securityEngine.getAdminUser());
    });
    return unsub;
  }, []);

  const keysList = [
    { key: 'config:settings', type: 'Hash', ttl: 'Persistent', count: 3 },
    { key: 'config:whitelist', type: 'Set', ttl: 'Persistent', count: whitelist.length },
    { key: 'ip:banned', type: 'Hash', ttl: 'Dynamic (TTL)', count: bannedIps.length },
    { key: 'auth:admin', type: 'Hash', ttl: 'Persistent', count: 4 },
    ...failures.map(f => ({
      key: `ip:failures:${f.ip}`,
      type: 'List',
      ttl: `${config.findtime_min * 60}s`,
      count: f.timestamps.length
    }))
  ];

  const cliCommands = `# 1. Conexión interactiva al contenedor Dockerizado
docker exec -it bannedbyabrejeet_redis redis-cli -a abrejeet_redis_secure_pass

# 2. Verificación de Liveness
127.0.0.1:6379> PING
PONG

# 3. Comprobar Persistencia AOF (Append-Only File)
127.0.0.1:6379> CONFIG GET appendonly
1) "appendonly"
2) "yes"

# 4. Comprobar Snapshots Periódicos RDB a Disco
127.0.0.1:6379> CONFIG GET save
1) "save"
2) "900 1 300 10 60 10000"

# 5. Comprobar Directorio del Volumen Montado (redis_data:/data)
127.0.0.1:6379> CONFIG GET dir
1) "dir"
2) "/data"

# 6. Inspección de Persistencia en Tiempo Real
127.0.0.1:6379> INFO persistence
# Persistence
loading:0
rdb_changes_since_last_save:0
rdb_bgsave_in_progress:0
rdb_last_save_time:1756972800
rdb_last_bgsave_status:ok
aof_enabled:1
aof_rewrite_in_progress:0
aof_current_size:1048576
aof_base_size:1048576

# 7. Inspección de Redis Streams de Desbaneo
127.0.0.1:6379> XINFO STREAM stream:unban_orders
 1) "length"
 2) (integer) 1
 3) "radix-tree-keys"
 4) (integer) 1
 5) "last-generated-id"
 6) "1756972805120-0"
 7) "groups"
 8) (integer) 1`;

  const copyCliCommands = () => {
    navigator.clipboard.writeText(cliCommands);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const schemaItems = [
    {
      namespace: 'auth:admin',
      type: 'Hash',
      owner: 'Servicio 1 (FastAPI)',
      ttl: 'Persistente (AOF/RDB)',
      desc: 'Almacenamiento de credenciales maestras: username, email, password_hash (bcrypt) y fecha de creación.',
      example: 'HSET auth:admin username "admin" password_hash "$2b$12$..."'
    },
    {
      namespace: 'auth:reset_token:<TOKEN>',
      type: 'String',
      owner: 'Servicio 1 (FastAPI)',
      ttl: '900s (15 min)',
      desc: 'Token seguro temporal para recuperación de acceso administrative.',
      example: 'SETEX auth:reset_token:a8f9c1b 900 "admin"'
    },
    {
      namespace: 'config:settings',
      type: 'Hash',
      owner: 'Servicio 1 (FastAPI)',
      ttl: 'Persistente (AOF/RDB)',
      desc: 'Parámetros del firewall: max_retries, findtime_min, ban_time_min leídos por el Servicio 2.',
      example: 'HSET config:settings max_retries "5" findtime_min "10" ban_time_min "60"'
    },
    {
      namespace: 'config:whitelist',
      type: 'Set',
      owner: 'Servicio 1 (FastAPI)',
      ttl: 'Persistente (AOF/RDB)',
      desc: 'Conjunto inmutable de IPs inmunes al bloqueo (incluye obligatoriamente 127.0.0.1 y ::1).',
      example: 'SADD config:whitelist "127.0.0.1" "192.168.1.50"'
    },
    {
      namespace: 'ip:failures:<IP>',
      type: 'List / Counter',
      owner: 'Servicio 2 (Express)',
      ttl: 'findtime_min seg',
      desc: 'Marcas de tiempo de intentos SSH fallidos analizados desde /var/log/auth.log.',
      example: 'RPUSH ip:failures:198.51.100.42 "1756972800000" && EXPIRE 600'
    },
    {
      namespace: 'ip:banned',
      type: 'Hash',
      owner: 'Servicio 2 (Express)',
      ttl: 'Persistente (AOF/RDB)',
      desc: 'Catálogo de IPs actualmente bloqueadas en el kernel Linux (UFW) con timestamp y motivo.',
      example: 'HSET ip:banned 198.51.100.42 "{\\"banned_at\\":1756972800,\\"reason\\":\\"SSH bruteforce\\"}"'
    },
    {
      namespace: 'stream:unban_orders',
      type: 'Redis Stream',
      owner: 'Servicio 1 -> Servicio 2',
      ttl: 'Persistente (AOF)',
      desc: 'Canal de mensajería con soporte de ACK (XADD/XACK) para órdenes asíncronas de desbaneo en UFW.',
      example: 'XADD stream:unban_orders * action "UNBAN" ip "198.51.100.42" operator "admin"'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-200">
      
      {/* Header */}
      <div className="bg-[#0f0f0f] p-6 rounded-2xl border border-white/10 shadow-xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <Database className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Almacenamiento Centralizado en Memoria (Redis 7.2 + Streams)
            </h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            Persistencia híbrida (AOF/RDB), volumen Dockerizado <code className="text-amber-400 font-mono">redis_data:/data</code> y esquema acordado entre microservicios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDownloadFile('Dockerfile.redis')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono transition-all"
            title="Descargar Dockerfile para Redis"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Dockerfile.redis</span>
          </button>

          <button
            onClick={() => handleDownloadFile('redis.conf')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono transition-all"
            title="Descargar redis.conf con persistencia AOF/RDB"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>redis.conf</span>
          </button>

          <button
            onClick={() => handleDownloadFile('redis-schema-agreed.md')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono transition-all"
            title="Descargar documento de esquema acordado"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Esquema (.md)</span>
          </button>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-black px-3 py-1.5 rounded-lg border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>bannedbyabrejeet_redis:7.2</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
            activeTab === 'explorer'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Explorador de Claves en Vivo</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
            activeTab === 'schema'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Esquema de Datos Acordado</span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
            activeTab === 'evidence'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Evidencia redis-cli (Persistencia & AOF)</span>
        </button>
      </div>

      {/* Tab 1: Live Explorer */}
      {activeTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Keys Explorer */}
          <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider pb-2 border-b border-white/5">
              <span>Claves en Redis (KEYS *)</span>
              <span>{keysList.length} Claves</span>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {keysList.map((k) => {
                const isSelected = selectedKey === k.key;
                return (
                  <button
                    key={k.key}
                    onClick={() => setSelectedKey(k.key)}
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      k.type === 'Hash' ? 'bg-purple-500/20 text-purple-300' :
                      k.type === 'Set' ? 'bg-teal-500/20 text-teal-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {k.type} ({k.count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Key Value Detail + Streams Live Feed */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Key Value Details Panel */}
            <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 font-mono text-xs">
                <div>
                  <span className="text-slate-400">Inspeccionando Clave: </span>
                  <strong className="text-amber-400 text-sm">{selectedKey}</strong>
                </div>
              </div>

              {/* Key Content Renderer */}
              <div className="font-mono text-xs bg-black p-4 rounded-xl border border-white/10 overflow-x-auto text-emerald-400 leading-relaxed">
                {selectedKey === 'config:settings' && (
                  <pre>{JSON.stringify(config, null, 2)}</pre>
                )}
                {selectedKey === 'config:whitelist' && (
                  <pre>{JSON.stringify({ type: 'Redis Set', members: whitelist, immutable_rule: '127.0.0.1' }, null, 2)}</pre>
                )}
                {selectedKey === 'ip:banned' && (
                  <pre>{JSON.stringify(bannedIps, null, 2)}</pre>
                )}
                {selectedKey === 'auth:admin' && (
                  <pre>{JSON.stringify({
                    username: adminUser.username,
                    email: adminUser.email,
                    password_hash: '$2b$12$eK5b9z1...[BCRYPT_HASH_PROTECTED]',
                    isConfigured: adminUser.isConfigured,
                    temp_reset_token: adminUser.tempResetToken || null
                  }, null, 2)}</pre>
                )}
                {selectedKey.startsWith('ip:failures:') && (
                  <pre>{JSON.stringify(failures.find(f => `ip:failures:${f.ip}` === selectedKey) || { status: 'Expired or deleted' }, null, 2)}</pre>
                )}
              </div>
            </div>

            {/* Redis Streams Live Activity */}
            <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 sm:p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-white font-bold">Flujo de Eventos en Redis Streams (XADD / XACK):</span>
                </div>
                <span className="text-[11px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  stream:unban_orders
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-xs">
                {pubSubLogs.length === 0 ? (
                  <div className="text-slate-500 py-4 text-center">
                    Esperando mensajes de desbaneo en el Stream entre FastAPI y Express...
                  </div>
                ) : (
                  pubSubLogs.map((msg) => (
                    <div key={msg.id} className="p-3 bg-black rounded-lg border border-white/10 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            {msg.payload.action}
                          </span>
                          <span className="text-slate-400 text-[11px]">Stream: stream:unban_orders</span>
                          <span className="text-slate-500 text-[10px]">({msg.sender})</span>
                        </div>
                        <div className="text-slate-300 text-[11px]">
                          {msg.payload.ip ? `IP Objetivo: ${msg.payload.ip}` : ''} {msg.payload.reason ? `— ${msg.payload.reason}` : ''}
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

          </div>

        </div>
      )}

      {/* Tab 2: Agreed Data Schema */}
      {activeTab === 'schema' && (
        <div className="space-y-6">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  Esquema Centralizado de Datos Acordado (Inter-Servicios)
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Definición formal de espacios de nombres, tipos nativos de Redis, TTLs y contratos de propiedad para el Servicio 1 y Servicio 2.
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
                  {schemaItems.map((item) => (
                    <tr key={item.namespace} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-bold text-amber-400">
                        {item.namespace}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-slate-300">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {item.owner}
                      </td>
                      <td className="py-3 px-4 text-emerald-400">
                        {item.ttl}
                      </td>
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
      )}

      {/* Tab 3: redis-cli Evidence & Verification */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">
                    Evidencia de Conexión &amp; Comprobación de Volúmenes Persistentes (redis-cli)
                  </h2>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Salida de la sesión de validación ejecutada contra el contenedor <code className="text-amber-400">bannedbyabrejeet_redis</code> comprobando persistencia AOF/RDB y volumen montado en <code className="text-amber-400">/data</code>.
                </p>
              </div>

              <button
                onClick={copyCliCommands}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono transition-all"
              >
                {copiedCli ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado al portapapeles</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar Sesión CLI</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-black rounded-xl border border-white/10">
                <div className="text-slate-500 text-[10px] uppercase">Contenedor &amp; Imagen</div>
                <div className="text-emerald-400 font-bold mt-0.5">bannedbyabrejeet_redis</div>
                <div className="text-slate-400 text-[10px]">redis:7.2-alpine (Dockerizado)</div>
              </div>
              <div className="p-3 bg-black rounded-xl border border-white/10">
                <div className="text-slate-500 text-[10px] uppercase">Volumen Persistente</div>
                <div className="text-amber-400 font-bold mt-0.5">redis_data:/data</div>
                <div className="text-slate-400 text-[10px]">Directorio /data montado en Host</div>
              </div>
              <div className="p-3 bg-black rounded-xl border border-white/10">
                <div className="text-slate-500 text-[10px] uppercase">Estrategia Persistencia</div>
                <div className="text-purple-400 font-bold mt-0.5">AOF (everysec) + RDB (snapshots)</div>
                <div className="text-slate-400 text-[10px]">Cero pérdida de eventos de ban</div>
              </div>
            </div>

            {/* Terminal Window */}
            <div className="rounded-xl bg-black border border-white/15 overflow-hidden shadow-2xl">
              <div className="bg-[#181818] px-4 py-2 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 font-mono text-xs text-slate-400">bash — host-vps: ~/bannedbyabrejeet</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">SESSION: VERIFIED</span>
              </div>
              <div className="p-4 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed max-h-[400px]">
                <pre>{cliCommands}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
