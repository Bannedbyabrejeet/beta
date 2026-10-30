/**
 * Cliente HTTP hacia los microservicios reales.
 *
 *  - API_A -> Backend A (FastAPI, Python)  : gestión de auth, config y estado
 *  - API_B -> Backend B (Express, Node.js) : motor de seguridad SSH + UFW
 *
 * En desarrollo, Vite hace de proxy (ver vite.config.ts) para que ambas rutas
 * sean same-origin y no haya problemas de CORS:
 *   /api/v1/*       -> Backend A
 *   /api/security/* -> Backend B
 */

import {
  BannedIp,
  LogVerificationDetails,
  IpFailureRecord,
  PubSubMessage,
  SshLogEvent,
  SystemConfig,
  UfwRuleEntry
} from '../types';
import {
  RawBannedIp,
  RawFailure,
  RawFail2banStatus,
  RawLogEvent,
  RawPubSubMessage,
  RawSecurityState,
  RawSimulateLogResponse,
  RawUfwRulesResponse,
  RawUnbanResponse
} from './apiTypes';

export const API_A = '/api/v1';
export const API_B = '/api/security';

export class ApiError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const ERROR_KEYS = ['detail', 'error', 'message'] as const;

/** Extrae el mensaje de error de un body desconocido. */
function extractErrorDetail(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  for (const key of ERROR_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...init
    });
  } catch {
    throw new ApiError(
      'No hay conexión con el backend. Verificá que Redis, el Backend A y el Backend B estén levantados.',
      0
    );
  }

  const raw = await response.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const detail = extractErrorDetail(data) ?? `Error HTTP ${response.status}`;
    throw new ApiError(detail, response.status);
  }
  return data as T;
}

const post = <T>(url: string, body: unknown) =>
  request<T>(url, { method: 'POST', body: JSON.stringify(body) });

const put = <T>(url: string, body: unknown) =>
  request<T>(url, { method: 'PUT', body: JSON.stringify(body) });

const del = <T>(url: string) => request<T>(url, { method: 'DELETE' });

// =========================================================================
// Backend A - FastAPI (Abrego)
// =========================================================================
export const backendA = {
  health: () =>
    request<{ status: string; redis_connected: boolean; redis_target: string }>(`${API_A}/health`),

  getSettings: () => request<SystemConfig>(`${API_A}/config/settings`),

  updateSettings: (settings: Partial<SystemConfig>) =>
    put<{ message: string; data: SystemConfig }>(`${API_A}/config/settings`, settings),

  getWhitelist: () => request<{ whitelist: string[] }>(`${API_A}/config/whitelist`),

  addToWhitelist: (ip: string) =>
    post<{ message: string }>(`${API_A}/config/whitelist`, { ip }),

  removeFromWhitelist: (ip: string) =>
    del<{ message: string }>(`${API_A}/config/whitelist/${encodeURIComponent(ip)}`),

  authStatus: () =>
    request<{ is_initialized: boolean; username?: string; email?: string }>(`${API_A}/auth/status`),

  setupAdmin: (username: string, email: string, password: string) =>
    post<{ message: string }>(`${API_A}/auth/setup`, { username, email, password }),

  login: (username: string, password: string) =>
    post<{ access_token: string; token_type: string; expires_in: number; message: string }>(
      `${API_A}/auth/login`,
      { username, password }
    ),

  forgotPassword: (email: string) =>
    post<{ status: string; message: string; reset_token: string; expires_in_seconds: number }>(
      `${API_A}/auth/forgot-password`,
      { email }
    ),

  resetPassword: (token: string, new_password: string) =>
    post<{ message: string }>(`${API_A}/auth/reset-password`, { token, new_password }),

  triggerUnban: (ip: string, reason?: string) =>
    post<{ message: string; subscribers_notified: number }>(`${API_A}/security/unban`, {
      ip,
      reason: reason || 'Manual unban authorized via Admin Dashboard'
    }),

  getSecurityState: () => request<RawSecurityState>(`${API_A}/security/state`)
};

// =========================================================================
// Backend B - Express (Mulet)
// =========================================================================
export const backendB = {
  health: () =>
    request<{ status: string; service: string; log_path: string }>(`${API_B}/health`),

  simulateLog: (log_line: string) =>
    post<RawSimulateLogResponse>(`${API_B}/simulate-log`, { log_line }),

  getLogs: () => request<{ logs: RawLogEvent[]; total: number }>(`${API_B}/logs`),

  getBanned: () => request<{ banned: RawBannedIp[]; total: number }>(`${API_B}/banned`),

  getFailures: () => request<{ failures: RawFailure[]; total: number }>(`${API_B}/failures`),

  getPubSub: () => request<{ messages: RawPubSubMessage[]; total: number }>(`${API_B}/pubsub`),

  getUfwRules: () => request<RawUfwRulesResponse>(`${API_B}/ufw-rules`),

  getStats: () =>
    request<{
      banned: number;
      logs: number;
      pubsub: number;
      activeFailures: number;
      timestamp: string;
    }>(`${API_B}/stats`),

  unban: (ip: string) => post<RawUnbanResponse>(`${API_B}/unban`, { ip }),

  getFail2ban: () => request<RawFail2banStatus>(`${API_B}/fail2ban`),

  unbanFail2ban: (ip: string) => post<RawUnbanResponse>(`${API_B}/fail2ban/unban`, { ip })
};

// =========================================================================
// Mapeos: respuesta cruda de Redis/servidor -> tipos del Frontend
// =========================================================================
export function mapBannedIp(raw: RawBannedIp, config: SystemConfig): BannedIp {
  const bannedAt = Number(raw.banned_at ?? raw.bannedAt ?? Date.now());
  const expiresAt = Number(
    raw.expires_at ?? raw.expiresAt ?? bannedAt + config.ban_time_min * 60000
  );

  return {
    ip: raw.ip,
    bannedAt,
    expiresAt,
    banTimeMin: config.ban_time_min,
    attemptsCount: Number(raw.attempts ?? raw.attemptsCount ?? 0),
    reason: raw.reason || 'Bloqueo aplicado por el motor de seguridad',
    lastUser: raw.last_user || raw.lastUser || 'desconocido',
    ufwRule: `ufw insert 1 deny from ${raw.ip} to any port 22 comment 'bannedbyabrejeet:ssh'`,
    status: 'banned',
    country: raw.country,
    flag: raw.flag
  };
}

export function mapFailureRecord(raw: RawFailure): IpFailureRecord {
  const timestamps = Array.isArray(raw.timestamps) ? raw.timestamps.map(Number) : [];

  return {
    ip: raw.ip,
    timestamps,
    firstSeen: Number(raw.firstSeen ?? 0),
    lastSeen: Number(raw.lastSeen ?? 0),
    totalAttempts: Number(raw.totalAttempts ?? timestamps.length),
    targetedUsers: raw.targetedUsers ?? []
  };
}

export function mapPubSubMessage(raw: RawPubSubMessage): PubSubMessage {
  return {
    id: raw.id || `pubsub-${Date.now()}`,
    channel: raw.channel || 'channel:unban_events',
    sender: raw.sender || 'Express_Security_Engine',
    payload: {
      action: raw.payload?.action || 'LOG_ALERT',
      ip: raw.payload?.ip,
      timestamp: Number(raw.payload?.timestamp ?? Date.now()),
      reason: raw.payload?.reason
    }
  };
}

/** Deduce la acción tomada cuando el backend no la informa. */
function inferActionTaken(raw: RawLogEvent) {
  if (raw.actionTaken) return raw.actionTaken;
  if (raw.eventType === 'ACCEPTED_KEY') return 'LOGGED_SUCCESS';
  if (raw.eventType === 'INVALID_USER' || raw.eventType === 'FAILED_PASSWORD') {
    return 'RECORDED_FAILURE_PENDING';
  }
  return 'DISCARDED_INFO';
}

/** Arma el detalle de verificación que consume la UI. */
function buildVerification(
  raw: RawLogEvent,
  event: SshLogEvent,
  config: SystemConfig
): LogVerificationDetails {
  return {
    parsedUser: event.user,
    parsedIp: event.ip,
    parsedPort: event.port,
    isWhitelisted: !!raw.isWhitelisted,
    actionTaken: inferActionTaken(raw),
    decisionSummary: raw.decisionSummary || '',
    failuresInWindowBefore: Number(raw.failuresInWindowBefore ?? 0),
    failuresInWindowAfter: Number(raw.failuresInWindowAfter ?? 0),
    expiredFailuresDiscarded: Number(raw.expiredFailuresDiscarded ?? 0),
    windowMinutes: Number(raw.windowMinutes ?? config.findtime_min),
    maxRetriesAllowed: Number(raw.maxRetriesAllowed ?? config.max_retries),
    triggeredBan: !!raw.triggeredBan,
    verifiedAt: Number(raw.verifiedAt ?? event.epoch)
  };
}

export function mapLogEvent(
  raw: RawLogEvent,
  config: SystemConfig,
  geoResolver?: (ip: string) => SshLogEvent['geo']
): SshLogEvent {
  const event: SshLogEvent = {
    id: raw.id || `log-${Date.now()}`,
    timestamp: raw.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
    epoch: Number(raw.epoch ?? Date.now()),
    ip: raw.ip,
    user: raw.user || 'unknown',
    port: Number(raw.port ?? 22),
    eventType: raw.eventType || 'FAILED_PASSWORD',
    service: raw.service || 'sshd',
    rawLog: raw.rawLog || '',
    geo: geoResolver ? geoResolver(raw.ip) : undefined
  };

  event.verification = buildVerification(raw, event, config);
  return event;
}

// =========================================================================
// Helpers de colecciones (evitan lógica repetida en el engine)
// =========================================================================
export function toBannedMap(raw: RawBannedIp[], config: SystemConfig): Map<string, BannedIp> {
  return new Map(
    raw.map(item => {
      const banned = mapBannedIp(item, config);
      return [banned.ip, banned];
    })
  );
}

export function toFailuresMap(raw: RawFailure[]): Map<string, IpFailureRecord> {
  return new Map(
    raw.map(item => {
      const failure = mapFailureRecord(item);
      return [failure.ip, failure];
    })
  );
}

/** Normaliza las reglas de UFW al tipo del frontend. */
export function toUfwRules(raw: RawUfwRulesResponse['rules']): UfwRuleEntry[] {
  return raw.map((rule, index) => ({
    id: Number(rule.id ?? index + 1),
    action: rule.action === 'ALLOW' ? 'ALLOW' : 'DENY',
    fromIp: rule.fromIp || rule.from_ip || '0.0.0.0/0',
    toPort: Number(rule.toPort || rule.to_port || 22),
    comment: rule.comment || 'bannedbyabrejeet:ssh',
    active: rule.active !== false,
    addedAt: Number(rule.addedAt || Date.now())
  }));
}
