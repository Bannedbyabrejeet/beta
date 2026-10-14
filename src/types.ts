export type EventType = 'FAILED_PASSWORD' | 'INVALID_USER' | 'ACCEPTED_KEY' | 'PREAUTH_DISCONNECT';

export interface LogVerificationDetails {
  parsedUser: string;
  parsedIp: string;
  parsedPort: number;
  isWhitelisted: boolean;
  actionTaken: 'IGNORED_WHITELIST' | 'LOGGED_SUCCESS' | 'RECORDED_FAILURE_PENDING' | 'THRESHOLD_EXCEEDED_BANNED' | 'DISCARDED_INFO';
  decisionSummary: string; // Explicación en lenguaje directo y claro
  failuresInWindowBefore: number;
  failuresInWindowAfter: number;
  expiredFailuresDiscarded: number;
  windowMinutes: number;
  maxRetriesAllowed: number;
  triggeredBan: boolean;
  verifiedAt: number;
}

export interface Issue7TestResult {
  id: string;
  testNumber: number;
  title: string;
  criteria: string;
  status: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  explanation: string;
  consoleOutput: string[];
  executionTimeMs?: number;
}

export interface SshLogEvent {
  id: string;
  timestamp: string;
  epoch: number;
  ip: string;
  user: string;
  port: number;
  eventType: EventType;
  service: string;
  rawLog: string;
  verification?: LogVerificationDetails;
  geo?: {
    country: string;
    countryCode: string;
    city: string;
    flag: string;
  };
}

export interface BannedIp {
  ip: string;
  bannedAt: number; // timestamp in ms
  expiresAt: number; // timestamp in ms
  banTimeMin: number;
  attemptsCount: number;
  reason: string;
  lastUser: string;
  ufwRule: string;
  status: 'banned' | 'unbanning' | 'unbanned' | 'expired';
  country?: string;
  flag?: string;
}

export interface SystemConfig {
  max_retries: number;
  ban_time_min: number;
  findtime_min: number;
  auto_unban_enabled: boolean;
  ufw_enabled: boolean;
  log_source: string;
  ssh_port: number;
}

export interface IpFailureRecord {
  ip: string;
  timestamps: number[];
  firstSeen: number;
  lastSeen: number;
  totalAttempts: number;
  targetedUsers: string[];
}

export interface RedisKeyItem {
  key: string;
  type: 'hash' | 'set' | 'list' | 'string';
  ttl: number | string; // -1 for persistent, or seconds
  value: any;
}

export interface AdminUser {
  username: string;
  email: string;
  password?: string;
  passwordHash?: string;
  isConfigured: boolean;
  isAuthenticated: boolean;
  token?: string;
  tokenExpiry?: number;
  tempResetToken?: string;
  tempResetExpiry?: number;
}

export interface TransactionalEmail {
  id: string;
  to: string;
  from: string;
  subject: string;
  token: string;
  resetUrl: string;
  expiresAt: number;
  sentAt: number;
  content: string;
}

export interface PubSubMessage {
  id: string;
  channel: string;
  sender: 'FastAPI_Service_1' | 'Express_Security_Engine' | 'Dashboard_UI';
  payload: {
    action: 'UNBAN' | 'BAN' | 'CONFIG_UPDATE' | 'LOG_ALERT';
    ip?: string;
    timestamp: number;
    reason?: string;
  };
}

export interface UfwRuleEntry {
  id: number;
  action: 'DENY' | 'ALLOW';
  fromIp: string;
  toPort: number;
  comment: string;
  active: boolean;
  addedAt: number;
}
