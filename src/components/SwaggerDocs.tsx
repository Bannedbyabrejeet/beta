import React, { useState } from 'react';
import { 
  FileCode2, 
  Send, 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronRight, 
  Play, 
  Server, 
  Lock, 
  Sliders, 
  ShieldCheck, 
  Flame, 
  ExternalLink 
} from 'lucide-react';
import { OPENAPI_ENDPOINTS, ApiEndpoint } from '../data/openApiSpec';
import { securityEngine } from '../services/securityEngine';

export const SwaggerDocs: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string>('get-settings');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [requestBodies, setRequestBodies] = useState<Record<string, string>>({
    'put-settings': JSON.stringify({ max_retries: 5, ban_time_min: 120, findtime_min: 15 }, null, 2),
    'post-whitelist': JSON.stringify({ ip: '192.168.1.150' }, null, 2),
    'post-unban': JSON.stringify({ ip: '198.51.100.42', reason: 'Operator manual unban via Swagger' }, null, 2),
    'post-login': JSON.stringify({ username: 'admin', password: 'admin123' }, null, 2),
    'post-setup-admin': JSON.stringify({ username: 'admin', email: 'admin@bannedbyabrejeet.io', password: 'admin123' }, null, 2),
    'post-reset-token': JSON.stringify({ email: 'admin@bannedbyabrejeet.io' }, null, 2),
    'post-reset-confirm': JSON.stringify({ token: 'rst_example_token_123', new_password: 'new_secure_password_2026' }, null, 2),
    'post-ingest-log': JSON.stringify({ raw_log: 'Aug 26 14:45:00 edge-node sshd[23100]: Failed password for root from 185.220.101.5 port 49120 ssh2' }, null, 2)
  });
  const [pathParams, setPathParams] = useState<Record<string, Record<string, string>>>({
    'delete-whitelist': { ip: '192.168.1.150' }
  });
  const [responses, setResponses] = useState<Record<string, { status: number; durationMs: number; data: any }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tags = ['ALL', 'System Health', 'Authentication', 'Configuration', 'Whitelist', 'Security Engine Bridge', 'Security Engine'];

  const filteredEndpoints = selectedTag === 'ALL'
    ? OPENAPI_ENDPOINTS
    : OPENAPI_ENDPOINTS.filter(e => e.tags.includes(selectedTag));

  const handleExecute = (endpoint: ApiEndpoint) => {
    const startTime = performance.now();
    let resultStatus = 200;
    let resultData: any = {};

    try {
      if (endpoint.id === 'get-health') {
        resultData = {
          status: 'healthy',
          service: 'FastAPI Management Service (Framework A)',
          redis_connected: true,
          timestamp: new Date().toISOString()
        };
      } else if (endpoint.id === 'get-settings') {
        resultData = securityEngine.getConfig();
      } else if (endpoint.id === 'put-settings') {
        const body = JSON.parse(requestBodies['put-settings'] || '{}');
        securityEngine.updateConfig(body);
        resultData = { message: 'Settings updated in Redis config:settings', data: securityEngine.getConfig() };
      } else if (endpoint.id === 'get-whitelist') {
        resultData = {
          whitelist: securityEngine.getWhitelist(),
          immutable_safeguard: '127.0.0.1'
        };
      } else if (endpoint.id === 'post-whitelist') {
        const body = JSON.parse(requestBodies['post-whitelist'] || '{}');
        const res = securityEngine.addToWhitelist(body.ip);
        resultStatus = res.success ? 200 : 400;
        resultData = { message: res.message };
      } else if (endpoint.id === 'delete-whitelist') {
        const ip = pathParams['delete-whitelist']?.ip || '192.168.1.150';
        const res = securityEngine.removeFromWhitelist(ip);
        resultStatus = res.success ? 200 : 403;
        resultData = res.success ? { message: res.message } : { detail: res.message };
      } else if (endpoint.id === 'post-unban') {
        const body = JSON.parse(requestBodies['post-unban'] || '{}');
        const res = securityEngine.unbanIp(body.ip, body.reason);
        resultData = {
          message: res.message,
          subscribers_notified: 1,
          redis_pubsub_channel: 'channel:unban_events'
        };
      } else if (endpoint.id === 'get-banned-ips') {
        const banned = securityEngine.getBannedIps();
        resultData = {
          banned_count: banned.length,
          banned_ips: banned
        };
      } else if (endpoint.id === 'post-ingest-log') {
        const body = JSON.parse(requestBodies['post-ingest-log'] || '{}');
        const res = securityEngine.ingestSshLog(body.raw_log);
        resultData = {
          parsed: !!res.event,
          event: res.event,
          ban_triggered: res.banTriggered
        };
      } else if (endpoint.id === 'post-login') {
        const body = JSON.parse(requestBodies['post-login'] || '{}');
        const res = securityEngine.login(body.username || '', body.password || '');
        resultStatus = res.success ? 200 : 401;
        resultData = res.success 
          ? { access_token: res.token, token_type: 'bearer', expires_in: 86400, message: res.message }
          : { detail: res.message }; // "Credenciales inválidas"
      } else if (endpoint.id === 'post-setup-admin') {
        const body = JSON.parse(requestBodies['post-setup-admin'] || '{}');
        const res = securityEngine.registerInitialAdmin(body.username || '', body.email || '', body.password || '');
        resultStatus = res.success ? 201 : 400;
        resultData = res.success ? { message: res.message } : { detail: res.message };
      } else if (endpoint.id === 'post-reset-token') {
        const body = JSON.parse(requestBodies['post-reset-token'] || '{}');
        const res = securityEngine.requestPasswordReset(body.email || '');
        resultStatus = res.success ? 200 : 404;
        resultData = res.success ? {
          status: 'success',
          message: res.message,
          reset_token: res.token,
          expires_in_seconds: res.ttlSeconds,
          redis_key: `auth:reset_token:${res.token}`
        } : { detail: res.message };
      } else if (endpoint.id === 'post-reset-confirm') {
        const body = JSON.parse(requestBodies['post-reset-confirm'] || '{}');
        const res = securityEngine.completePasswordReset(body.token || '', body.new_password || '');
        resultStatus = res.success ? 200 : 400;
        resultData = res.success ? { message: res.message } : { detail: res.message };
      } else {
        resultData = endpoint.responses['200']?.example || { ok: true };
      }
    } catch (e: any) {
      resultStatus = 400;
      resultData = { error: e.message || 'Bad Request JSON Payload' };
    }

    const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
    setResponses(prev => ({
      ...prev,
      [endpoint.id]: {
        status: resultStatus,
        durationMs: Math.max(0.2, durationMs),
        data: resultData
      }
    }));
  };

  const copyCurl = (endpoint: ApiEndpoint) => {
    let curl = `curl -X ${endpoint.method} "https://api.bannedbyabrejeet.io${endpoint.path}"`;
    if (endpoint.requestBody && requestBodies[endpoint.id]) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBodies[endpoint.id].replace(/\n/g, '')}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopiedId(endpoint.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      case 'POST': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'PUT': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'DELETE': return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-200">
      
      {/* Swagger Explorer Header */}
      <div className="bg-[#0f0f0f] p-6 rounded-2xl border border-white/10 shadow-xl mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                OpenAPI 3.0.3
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Bannedbyabrejeet API Documentation
              </h1>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm">
              Especificación OpenAPI interactiva generada por FastAPI (Servicio 1) y el Motor de Seguridad (Servicio 2). Pruebe endpoints en vivo contra el estado de Redis.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-black p-2.5 rounded-md border border-white/10">
            <span className="text-emerald-400 font-semibold">Base URL:</span>
            <span>http://localhost/api/v1</span>
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex flex-wrap gap-1.5 mt-6 pt-4 border-t border-white/5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                selectedTag === tag
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
                  : 'bg-black text-slate-400 hover:text-slate-200 border border-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints Accordion List */}
      <div className="space-y-3.5">
        {filteredEndpoints.map((ep) => {
          const isExpanded = expandedId === ep.id;
          const response = responses[ep.id];

          return (
            <div
              key={ep.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'border-white/20 bg-[#0f0f0f] shadow-xl'
                  : 'border-white/10 bg-[#0f0f0f]/60 hover:border-white/20'
              }`}
            >
              {/* Endpoint Summary Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? '' : ep.id)}
                className="p-4 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${getMethodBadge(ep.method)}`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-semibold text-white">
                    {ep.path}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    — {ep.summary}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
                    {ep.service}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Interactive Playground */}
              {isExpanded && (
                <div className="p-4 sm:p-6 border-t border-white/5 bg-black/40 space-y-6">
                  
                  <div>
                    <h4 className="text-xs font-mono uppercase text-slate-400 mb-1">Descripción:</h4>
                    <p className="text-xs text-slate-300">{ep.description}</p>
                  </div>

                  {/* Path / Query Parameters */}
                  {ep.parameters && (
                    <div>
                      <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Parámetros:</h4>
                      <div className="space-y-2">
                        {ep.parameters.map((param) => (
                          <div key={param.name} className="flex items-center gap-3 bg-black p-2.5 rounded-lg border border-white/10 text-xs font-mono">
                            <span className="text-amber-400 font-bold">{param.name}</span>
                            <span className="text-[10px] text-slate-500">({param.in})</span>
                            <input
                              type="text"
                              value={pathParams[ep.id]?.[param.name] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPathParams(prev => ({
                                  ...prev,
                                  [ep.id]: { ...(prev[ep.id] || {}), [param.name]: val }
                                }));
                              }}
                              className="bg-[#0f0f0f] border border-white/10 rounded px-2 py-1 text-white flex-1 focus:outline-none focus:border-cyan-500"
                              placeholder={param.description}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Body Editor */}
                  {ep.requestBody && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-xs font-mono uppercase text-slate-400">Request Body (JSON):</h4>
                        <span className="text-[10px] font-mono text-slate-500">{ep.requestBody.contentType}</span>
                      </div>
                      <textarea
                        rows={5}
                        value={requestBodies[ep.id] || JSON.stringify(ep.requestBody.example, null, 2)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRequestBodies(prev => ({ ...prev, [ep.id]: val }));
                        }}
                        className="w-full bg-black border border-white/10 rounded-lg p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-cyan-500 leading-relaxed"
                      />
                    </div>
                  )}

                  {/* Action Buttons: Execute & Copy cURL */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => handleExecute(ep)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Ejecutar Petición (Try it out)</span>
                    </button>

                    <button
                      onClick={() => copyCurl(ep)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300"
                    >
                      {copiedId === ep.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === ep.id ? 'Copiado' : 'Copiar cURL'}</span>
                    </button>
                  </div>

                  {/* Live Response Panel */}
                  {response && (
                    <div className="mt-4 p-4 rounded-xl bg-black border border-white/10 space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">HTTP Status:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            response.status >= 200 && response.status < 300 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
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
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
