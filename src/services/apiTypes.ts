/**
 * Formas "crudas" de las respuestas de la API (tal como llegan por HTTP).
 *
 * Se declaran aparte de los tipos del dominio (`types.ts`) porque el backend
 * usa nombres en snake_case y algunos campos son opcionales. Los mappers de
 * `api.ts` convierten estos tipos a los del dominio.
 */

import { EventType, LogVerificationDetails, PubSubMessage } from '../types';

export interface RawBannedIp {
  ip: string;
  banned_at?: number | string;
  bannedAt?: number;
  expires_at?: number | string;
  expiresAt?: number;
  attempts?: number | string;
  attemptsCount?: number;
  last_user?: string;
  lastUser?: string;
  reason?: string;
  country?: string;
  flag?: string;
}

export interface RawFailure {
  ip: string;
  timestamps?: Array<number | string>;
  firstSeen?: number | string;
  lastSeen?: number | string;
  totalAttempts?: number | string;
  targetedUsers?: string[];
  ttlSeconds?: number;
}

export interface RawPubSubMessage {
  id?: string;
  channel?: string;
  sender?: PubSubMessage['sender'];
  payload?: {
    action?: PubSubMessage['payload']['action'];
    ip?: string;
    timestamp?: number | string;
    reason?: string;
  };
}

export interface RawLogEvent {
  id?: string;
  timestamp?: string;
  epoch?: number | string;
  ip: string;
  user?: string;
  port?: number | string;
  eventType?: EventType;
  service?: string;
  rawLog?: string;
  actionTaken?: LogVerificationDetails['actionTaken'];
  decisionSummary?: string;
  isWhitelisted?: boolean;
  failuresInWindowBefore?: number;
  failuresInWindowAfter?: number;
  expiredFailuresDiscarded?: number;
  windowMinutes?: number;
  maxRetriesAllowed?: number;
  triggeredBan?: boolean;
  verifiedAt?: number;
}

export interface RawUfwRule {
  id?: number;
  action?: string;
  fromIp?: string;
  from_ip?: string;
  toPort?: number;
  to_port?: number;
  comment?: string;
  active?: boolean;
  addedAt?: number;
}

export interface RawUfwRulesResponse {
  active: boolean;
  rules: RawUfwRule[];
  raw: string;
  total: number;
}

export interface RawUfwOperation {
  action: 'BAN' | 'UNBAN' | 'UNBAN_DIRECT';
  ip: string;
  ok: boolean;
  skipped?: boolean;
  removed?: number;
  remaining?: number;
  error?: string | null;
  timestamp: number;
  operator?: string;
}

export interface RawSecurityState {
  banned: RawBannedIp[];
  failures: RawFailure[];
  logs: RawLogEvent[];
  pubsub: RawPubSubMessage[];
  ufw_ops: RawUfwOperation[];
  timestamp?: string;
}

export interface RawFail2banStatus {
  installed: boolean;
  active: boolean;
  jails?: Record<string, string[]>;
  banned: string[];
  error?: string;
}

export interface RawUnbanResult {
  ok: boolean;
  removed?: number;
  remaining?: number;
  error?: string | null;
  alreadyFree?: boolean;
  rules?: number;
}

export interface RawUnbanResponse {
  message: string;
  result: RawUnbanResult;
}

export interface RawSimulateLogResponse {
  message: string;
  log: string;
  event: RawLogEvent | null;
  banTriggered: boolean;
  failureCount: number;
}
