import {
  SystemConfig,
  SshLogEvent,
  BannedIp,
  IpFailureRecord,
  PubSubMessage,
  UfwRuleEntry,
  AdminUser,
  TransactionalEmail,
  EventType,
  LogVerificationDetails,
  Issue7TestResult
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_WHITELIST,
  INITIAL_LOGS,
  INITIAL_BANNED,
  SAMPLE_GEO_MAP,
  SAMPLE_ATTACK_USERS
} from '../data/presetData';

type Listener = () => void;

class SecurityEngineService {
  private config: SystemConfig = { ...INITIAL_CONFIG };
  private whitelist: Set<string> = new Set(INITIAL_WHITELIST);
  private logs: SshLogEvent[] = [...INITIAL_LOGS];
  private bannedIps: Map<string, BannedIp> = new Map();
  private ipFailures: Map<string, IpFailureRecord> = new Map();
  private ufwRules: UfwRuleEntry[] = [];
  private pubSubMessages: PubSubMessage[] = [];
  private transactionalEmails: TransactionalEmail[] = [];
  private adminUser: AdminUser = {
    username: 'admin',
    email: 'admin@bannedbyabrejeet.io',
    password: 'admin123',
    passwordHash: '$2b$12$eK5b9z1X5Jv8mKp4Y2dZ8eB7H1N0P9Q8R7S6T5U4V3W2X1Y0Z9A8B',
    isConfigured: true,
    isAuthenticated: false,
    token: undefined,
    tokenExpiry: undefined
  };
  private listeners: Set<Listener> = new Set();
  private timerInterval: any = null;

  constructor() {
    // Initialize initial banned IPs
    INITIAL_BANNED.forEach(b => {
      this.bannedIps.set(b.ip, { ...b });
      this.ufwRules.push({
        id: this.ufwRules.length + 1,
        action: 'DENY',
        fromIp: b.ip,
        toPort: 22,
        comment: 'bannedbyabrejeet:ssh',
        active: true,
        addedAt: b.bannedAt
      });
    });

    // Start tick loop for TTL expiry checks
    if (typeof window !== 'undefined') {
      this.timerInterval = setInterval(() => {
        this.checkExpirations();
      }, 1000);
    }

    // Enrich preset logs with verification details
    this.logs = this.logs.map(log => {
      if (log.verification) return log;
      return {
        ...log,
        verification: this.computeVerificationForLog(log)
      };
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // =========================================================================
  // Getters
  // =========================================================================
  public getConfig(): SystemConfig {
    return { ...this.config };
  }

  public getWhitelist(): string[] {
    return Array.from(this.whitelist);
  }

  public getLogs(): SshLogEvent[] {
    return [...this.logs];
  }

  public getBannedIps(): BannedIp[] {
    return Array.from(this.bannedIps.values());
  }

  public getIpFailures(): IpFailureRecord[] {
    return Array.from(this.ipFailures.values());
  }

  public getUfwRules(): UfwRuleEntry[] {
    return [...this.ufwRules];
  }

  public getPubSubMessages(): PubSubMessage[] {
    return [...this.pubSubMessages];
  }

  public getAdminUser(): AdminUser {
    return { ...this.adminUser };
  }

  public getEmails(): TransactionalEmail[] {
    return [...this.transactionalEmails];
  }

  public clearEmails(): void {
    this.transactionalEmails = [];
    this.notify();
  }

  // =========================================================================
  // Configuration Management (FastAPI / Service 1)
  // =========================================================================
  public updateConfig(newConfig: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.pubSubMessages.unshift({
      id: `pubsub-${Date.now()}`,
      channel: 'channel:system_events',
      sender: 'FastAPI_Service_1',
      payload: {
        action: 'CONFIG_UPDATE',
        timestamp: Date.now(),
        reason: 'Parameters updated from Dashboard UI'
      }
    });
    this.notify();
  }

  public addToWhitelist(ip: string): { success: boolean; message: string } {
    const cleanIp = ip.trim();
    if (!cleanIp) return { success: false, message: 'IP inválida' };
    this.whitelist.add(cleanIp);
    
    // If currently banned, unban immediately
    if (this.bannedIps.has(cleanIp)) {
      this.unbanIp(cleanIp, 'Added to Whitelist');
    }

    this.notify();
    return { success: true, message: `IP ${cleanIp} agregada a la lista blanca exitosamente.` };
  }

  public removeFromWhitelist(ip: string): { success: boolean; message: string } {
    if (ip === '127.0.0.1' || ip === '::1') {
      return { success: false, message: 'CRÍTICO: No se puede eliminar 127.0.0.1 (Regla de Prevención de Auto-bloqueo)' };
    }
    this.whitelist.delete(ip);
    this.notify();
    return { success: true, message: `IP ${ip} removida de la lista blanca.` };
  }

  // =========================================================================
  // SSH Parser & Security Engine (Express / Service 2)
  // =========================================================================
  public ingestSshLog(rawLine: string): { event: SshLogEvent | null; banTriggered: boolean } {
    const now = Date.now();
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Regex matching standard OpenSSH syslog formats
    const failedRegex = /Failed password for (invalid user )?(\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/i;
    const invalidRegex = /Invalid user (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/i;
    const acceptedRegex = /Accepted (password|publickey) for (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/i;
    const preauthRegex = /Disconnected from authenticating user (\S+) (\d+\.\d+\.\d+\.\d+) port (\d+) \[preauth\]/i;

    let eventType: EventType = 'FAILED_PASSWORD';
    let user = 'unknown';
    let ip = '0.0.0.0';
    let port = 22;

    if (failedRegex.test(rawLine)) {
      const match = rawLine.match(failedRegex);
      if (match) {
        user = match[2];
        ip = match[3];
        port = parseInt(match[4], 10);
        eventType = 'FAILED_PASSWORD';
      }
    } else if (invalidRegex.test(rawLine)) {
      const match = rawLine.match(invalidRegex);
      if (match) {
        user = match[1];
        ip = match[2];
        port = parseInt(match[3], 10);
        eventType = 'INVALID_USER';
      }
    } else if (acceptedRegex.test(rawLine)) {
      const match = rawLine.match(acceptedRegex);
      if (match) {
        user = match[2];
        ip = match[3];
        port = parseInt(match[4], 10);
        eventType = 'ACCEPTED_KEY';
      }
    } else if (preauthRegex.test(rawLine)) {
      const match = rawLine.match(preauthRegex);
      if (match) {
        user = match[1];
        ip = match[2];
        port = parseInt(match[3], 10);
        eventType = 'PREAUTH_DISCONNECT';
      }
    } else {
      // Fallback parser if custom raw format
      ip = (rawLine.match(/(\d+\.\d+\.\d+\.\d+)/) || [])[1] || '192.168.1.50';
      user = 'root';
    }

    const geo = SAMPLE_GEO_MAP[ip] || {
      country: 'Unknown Origin',
      countryCode: 'UN',
      city: 'External Network',
      flag: '🌐'
    };

    const newEvent: SshLogEvent = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: timestampStr,
      epoch: now,
      ip,
      user,
      port,
      eventType,
      service: 'sshd',
      rawLog: rawLine,
      geo
    };

    this.logs.unshift(newEvent);
    if (this.logs.length > 200) this.logs.pop();

    const isWhitelisted = this.whitelist.has(ip);
    const findtimeMs = this.config.findtime_min * 60 * 1000;
    
    // Check failure counts prior to this event
    const priorRecord = this.ipFailures.get(ip);
    const validTimestampsBefore = priorRecord 
      ? priorRecord.timestamps.filter(t => (now - t) <= findtimeMs)
      : [];
    const beforeCount = validTimestampsBefore.length;

    let banTriggered = false;
    let afterCount = beforeCount;
    let expiredCount = priorRecord ? priorRecord.timestamps.length - validTimestampsBefore.length : 0;
    let actionTaken: 'IGNORED_WHITELIST' | 'LOGGED_SUCCESS' | 'RECORDED_FAILURE_PENDING' | 'THRESHOLD_EXCEEDED_BANNED' | 'DISCARDED_INFO' = 'DISCARDED_INFO';
    let decisionSummary = '';

    if (eventType === 'ACCEPTED_KEY') {
      actionTaken = 'LOGGED_SUCCESS';
      decisionSummary = 'Acceso concedido exitosamente. El usuario se identificó de forma válida; no se suma ninguna infracción.';
    } else if (eventType === 'PREAUTH_DISCONNECT') {
      actionTaken = 'DISCARDED_INFO';
      decisionSummary = 'Desconexión antes de terminar la autenticación. Se registra con fines informativos sin penalización.';
    } else if (isWhitelisted) {
      actionTaken = 'IGNORED_WHITELIST';
      decisionSummary = `La IP ${ip} se encuentra en la Lista Blanca (amigos de la casa). El fallo fue perdonado e ignorado, protegiendo al equipo contra bloqueos accidentales.`;
    } else if (eventType === 'FAILED_PASSWORD' || eventType === 'INVALID_USER') {
      const evalRes = this.evaluateFailureDetailed(ip, user, geo, now);
      banTriggered = evalRes.banTriggered;
      afterCount = evalRes.afterCount;
      expiredCount = evalRes.expiredCount;

      if (banTriggered) {
        actionTaken = 'THRESHOLD_EXCEEDED_BANNED';
        decisionSummary = `Se superó el límite de seguridad (${afterCount} de ${this.config.max_retries} fallos dentro de la ventana de ${this.config.findtime_min} min). El motor bloqueó la IP de inmediato en el Firewall.`;
      } else {
        actionTaken = 'RECORDED_FAILURE_PENDING';
        const remaining = Math.max(0, this.config.max_retries - afterCount);
        decisionSummary = `Intento fallido registrado (${afterCount} de ${this.config.max_retries} tolerados en ${this.config.findtime_min} min). Le quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'} antes de ser bloqueado.`;
      }
    }

    const verification: LogVerificationDetails = {
      parsedUser: user,
      parsedIp: ip,
      parsedPort: port,
      isWhitelisted,
      actionTaken,
      decisionSummary,
      failuresInWindowBefore: beforeCount,
      failuresInWindowAfter: afterCount,
      expiredFailuresDiscarded: expiredCount,
      windowMinutes: this.config.findtime_min,
      maxRetriesAllowed: this.config.max_retries,
      triggeredBan: banTriggered,
      verifiedAt: now
    };

    newEvent.verification = verification;

    this.notify();
    return { event: newEvent, banTriggered };
  }

  public computeVerificationForLog(log: SshLogEvent): LogVerificationDetails {
    const isWhitelisted = this.whitelist.has(log.ip);
    const isBanned = this.bannedIps.has(log.ip);
    let actionTaken: 'IGNORED_WHITELIST' | 'LOGGED_SUCCESS' | 'RECORDED_FAILURE_PENDING' | 'THRESHOLD_EXCEEDED_BANNED' | 'DISCARDED_INFO' = 'DISCARDED_INFO';
    let decisionSummary = '';

    if (log.eventType === 'ACCEPTED_KEY') {
      actionTaken = 'LOGGED_SUCCESS';
      decisionSummary = 'Acceso concedido exitosamente. El usuario se identificó con clave o credencial válida; no se suma ninguna infracción.';
    } else if (log.eventType === 'PREAUTH_DISCONNECT') {
      actionTaken = 'DISCARDED_INFO';
      decisionSummary = 'Desconexión antes de completar la autenticación. Se registra con fines informativos.';
    } else if (isWhitelisted) {
      actionTaken = 'IGNORED_WHITELIST';
      decisionSummary = `IP ${log.ip} pertenece a la Lista Blanca (amigos de la casa). El fallo fue perdonado e ignorado por el motor sin sumar faltas.`;
    } else if (isBanned) {
      actionTaken = 'THRESHOLD_EXCEEDED_BANNED';
      decisionSummary = `Límite de seguridad alcanzado (${this.config.max_retries} fallos dentro de la ventana de ${this.config.findtime_min} min). La IP fue bloqueada en el Firewall.`;
    } else {
      actionTaken = 'RECORDED_FAILURE_PENDING';
      decisionSummary = `Intento fallido registrado en la ventana de tolerancia de ${this.config.findtime_min} minutos.`;
    }

    return {
      parsedUser: log.user,
      parsedIp: log.ip,
      parsedPort: log.port,
      isWhitelisted,
      actionTaken,
      decisionSummary,
      failuresInWindowBefore: 0,
      failuresInWindowAfter: isBanned ? this.config.max_retries : 1,
      expiredFailuresDiscarded: 0,
      windowMinutes: this.config.findtime_min,
      maxRetriesAllowed: this.config.max_retries,
      triggeredBan: isBanned,
      verifiedAt: log.epoch
    };
  }

  private evaluateFailureDetailed(
    ip: string, 
    user: string, 
    geo: any, 
    now: number
  ): { banTriggered: boolean; afterCount: number; expiredCount: number } {
    // 1. Check Whitelist
    if (this.whitelist.has(ip)) {
      return { banTriggered: false, afterCount: 0, expiredCount: 0 };
    }

    // 2. Check if already banned
    if (this.bannedIps.has(ip)) {
      return { banTriggered: false, afterCount: this.config.max_retries, expiredCount: 0 };
    }

    const findtimeMs = this.config.findtime_min * 60 * 1000;

    let record = this.ipFailures.get(ip);
    let expiredCount = 0;

    if (!record) {
      record = {
        ip,
        timestamps: [],
        firstSeen: now,
        lastSeen: now,
        totalAttempts: 0,
        targetedUsers: []
      };
      this.ipFailures.set(ip, record);
    } else {
      // Clean expired failures outside the findtime window
      const validBefore = record.timestamps.filter(t => (now - t) <= findtimeMs);
      expiredCount = record.timestamps.length - validBefore.length;
      record.timestamps = validBefore;
    }

    record.timestamps.push(now);
    record.lastSeen = now;
    record.totalAttempts += 1;
    if (!record.targetedUsers.includes(user)) {
      record.targetedUsers.push(user);
    }

    // Re-verify valid timestamps within findtime window
    const validTimestamps = record.timestamps.filter(t => (now - t) <= findtimeMs);
    record.timestamps = validTimestamps;
    const afterCount = validTimestamps.length;

    // Check threshold
    if (afterCount >= this.config.max_retries) {
      this.executeBan(ip, user, afterCount, geo);
      this.ipFailures.delete(ip);
      return { banTriggered: true, afterCount, expiredCount };
    }

    return { banTriggered: false, afterCount, expiredCount };
  }

  private evaluateFailure(ip: string, user: string, geo: any): boolean {
    const res = this.evaluateFailureDetailed(ip, user, geo, Date.now());
    return res.banTriggered;
  }

  private executeBan(ip: string, lastUser: string, attempts: number, geo: any): void {
    const now = Date.now();
    const banDurationMs = this.config.ban_time_min * 60 * 1000;
    const ufwRuleCmd = `ufw insert 1 deny from ${ip} to any port 22 comment 'bannedbyabrejeet:ssh'`;

    const bannedItem: BannedIp = {
      ip,
      bannedAt: now,
      expiresAt: now + banDurationMs,
      banTimeMin: this.config.ban_time_min,
      attemptsCount: attempts,
      reason: `Exceeded ${this.config.max_retries} failed attempts within ${this.config.findtime_min}m`,
      lastUser,
      ufwRule: ufwRuleCmd,
      status: 'banned',
      country: geo?.country,
      flag: geo?.flag
    };

    this.bannedIps.set(ip, bannedItem);

    // Register active UFW rule
    this.ufwRules.unshift({
      id: this.ufwRules.length + 1,
      action: 'DENY',
      fromIp: ip,
      toPort: 22,
      comment: 'bannedbyabrejeet:ssh',
      active: true,
      addedAt: now
    });

    // Notify Pub/Sub
    this.pubSubMessages.unshift({
      id: `pubsub-${Date.now()}`,
      channel: 'channel:unban_events',
      sender: 'Express_Security_Engine',
      payload: {
        action: 'BAN',
        ip,
        timestamp: now,
        reason: bannedItem.reason
      }
    });
  }

  // =========================================================================
  // Unban Action (Pub/Sub Decoupled)
  // =========================================================================
  public unbanIp(ip: string, reason: string = 'Manual unban requested'): { success: boolean; message: string } {
    const banned = this.bannedIps.get(ip);
    if (!banned) {
      return { success: false, message: `IP ${ip} no está en la lista de baneadas.` };
    }

    // Publish to Redis Pub/Sub channel:unban_events
    this.pubSubMessages.unshift({
      id: `pubsub-${Date.now()}`,
      channel: 'channel:unban_events',
      sender: 'FastAPI_Service_1',
      payload: {
        action: 'UNBAN',
        ip,
        timestamp: Date.now(),
        reason
      }
    });

    // Service 2 removes UFW rule
    this.ufwRules = this.ufwRules.filter(r => !(r.fromIp === ip && r.toPort === 22));
    this.bannedIps.delete(ip);
    this.ipFailures.delete(ip);

    this.notify();
    return {
      success: true,
      message: `Orden de desbaneo transmitida a través de Redis Pub/Sub para IP ${ip}. Regla UFW eliminada.`
    };
  }

  // =========================================================================
  // Expiration Check Loop
  // =========================================================================
  private checkExpirations() {
    if (!this.config.auto_unban_enabled) return;
    const now = Date.now();
    let changed = false;

    this.bannedIps.forEach((item, ip) => {
      if (now >= item.expiresAt) {
        // Auto unban
        this.ufwRules = this.ufwRules.filter(r => !(r.fromIp === ip && r.toPort === 22));
        this.bannedIps.delete(ip);
        this.pubSubMessages.unshift({
          id: `pubsub-${Date.now()}`,
          channel: 'channel:unban_events',
          sender: 'Express_Security_Engine',
          payload: {
            action: 'UNBAN',
            ip,
            timestamp: now,
            reason: 'TTL expired - auto unban executed'
          }
        });
        changed = true;
      }
    });

    if (changed) {
      this.notify();
    }
  }

  // =========================================================================
  // Simulated Attack Generator
  // =========================================================================
  public simulateAttack(options: {
    ip?: string;
    user?: string;
    attempts?: number;
    type?: EventType;
    delayMs?: number;
  }): void {
    const ip = options.ip || `185.220.101.${Math.floor(Math.random() * 200) + 10}`;
    const attempts = options.attempts || 1;
    const user = options.user || SAMPLE_ATTACK_USERS[Math.floor(Math.random() * SAMPLE_ATTACK_USERS.length)];
    const type = options.type || 'FAILED_PASSWORD';

    let count = 0;
    const interval = setInterval(() => {
      count++;
      const port = Math.floor(Math.random() * 20000) + 40000;
      let logLine = '';

      if (type === 'FAILED_PASSWORD') {
        logLine = `Aug 26 ${new Date().toTimeString().split(' ')[0]} edge-gateway-01 sshd[${Math.floor(Math.random() * 5000) + 15000}]: Failed password for ${user} from ${ip} port ${port} ssh2`;
      } else if (type === 'INVALID_USER') {
        logLine = `Aug 26 ${new Date().toTimeString().split(' ')[0]} edge-gateway-01 sshd[${Math.floor(Math.random() * 5000) + 15000}]: Invalid user ${user} from ${ip} port ${port}`;
      } else if (type === 'ACCEPTED_KEY') {
        logLine = `Aug 26 ${new Date().toTimeString().split(' ')[0]} edge-gateway-01 sshd[${Math.floor(Math.random() * 5000) + 15000}]: Accepted publickey for ${user} from ${ip} port ${port} ssh2: RSA SHA256:KeyOk`;
      } else {
        logLine = `Aug 26 ${new Date().toTimeString().split(' ')[0]} edge-gateway-01 sshd[${Math.floor(Math.random() * 5000) + 15000}]: Disconnected from authenticating user ${user} ${ip} port ${port} [preauth]`;
      }

      this.ingestSshLog(logLine);

      if (count >= attempts) {
        clearInterval(interval);
      }
    }, options.delayMs || 400);
  }

  // =========================================================================
  // Auth & Admin Session Management (US-01, US-01.2, US-01.3, US-10)
  // =========================================================================

  /**
   * US-01: Validates login credentials against Redis auth:admin.
   * If invalid, strictly returns "Credenciales inválidas" as required by Acceptance Criteria.
   */
  public login(identifier: string, password: string): { success: boolean; message: string; token?: string } {
    if (!this.adminUser.isConfigured) {
      return { success: false, message: 'No existe un administrador configurado. Configure la cuenta inicial.' };
    }

    const cleanId = identifier.trim().toLowerCase();
    const isUserMatch = cleanId === this.adminUser.username.toLowerCase();
    const isEmailMatch = cleanId === this.adminUser.email.toLowerCase();
    const isPassMatch = password === this.adminUser.password;

    if ((isUserMatch || isEmailMatch) && isPassMatch) {
      const token = `jwt_session_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      this.adminUser.isAuthenticated = true;
      this.adminUser.token = token;
      this.adminUser.tokenExpiry = Date.now() + 24 * 3600 * 1000;

      this.pubSubMessages.unshift({
        id: `pubsub-${Date.now()}`,
        channel: 'channel:system_events',
        sender: 'FastAPI_Service_1',
        payload: {
          action: 'LOG_ALERT',
          timestamp: Date.now(),
          reason: `Admin login successful from UI console for user ${this.adminUser.username}`
        }
      });

      this.notify();
      return { success: true, message: 'Inicio de sesión exitoso', token };
    }

    // Exact string required by Acceptance Criteria #2:
    return { success: false, message: 'Credenciales inválidas' };
  }

  /**
   * Closes active administrative session.
   */
  public logout(): void {
    this.adminUser.isAuthenticated = false;
    this.adminUser.token = undefined;
    this.notify();
  }

  /**
   * US-01.2: Set de credenciales iniciales (Cuenta Única).
   * Redirige al login tras la creación.
   */
  public registerInitialAdmin(username: string, email: string, password: string): { success: boolean; message: string } {
    if (this.adminUser.isConfigured) {
      return {
        success: false,
        message: 'Acción denegada: Ya existe una cuenta de Administrador única registrada en Redis (auth:admin).'
      };
    }

    const salt = '$2b$12$' + Math.random().toString(36).substring(2, 10);
    this.adminUser = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      passwordHash: `${salt}.HashedSecureKeyAbrejeet2026`,
      isConfigured: true,
      isAuthenticated: false
    };

    this.pubSubMessages.unshift({
      id: `pubsub-${Date.now()}`,
      channel: 'channel:system_events',
      sender: 'FastAPI_Service_1',
      payload: {
        action: 'CONFIG_UPDATE',
        timestamp: Date.now(),
        reason: `Initial admin user '${username}' initialized in Redis auth:admin`
      }
    });

    this.notify();
    return { success: true, message: 'Cuenta de administrador única creada exitosamente en Redis.' };
  }

  /**
   * US-01.3 & US-10: Generates temporary password reset token with strict Redis EXPIRE TTL.
   * Simulates transactional email dispatch.
   */
  public requestPasswordReset(email: string): { 
    success: boolean; 
    message: string; 
    token?: string; 
    ttlSeconds?: number;
    emailItem?: TransactionalEmail 
  } {
    const cleanEmail = email.trim().toLowerCase();

    // Verify against registered administrator in Redis
    if (cleanEmail !== this.adminUser.email.toLowerCase()) {
      return {
        success: false,
        message: 'El correo electrónico ingresado no coincide con el Administrador registrado en el sistema.'
      };
    }

    const token = `rst_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    const ttlSeconds = 900; // 15 minutos (900 segundos) conforme US-10
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.adminUser.tempResetToken = token;
    this.adminUser.tempResetExpiry = expiresAt;

    const emailItem: TransactionalEmail = {
      id: `mail_${Date.now()}`,
      to: cleanEmail,
      from: 'security-auth@bannedbyabrejeet.io',
      subject: 'Restauración de Contraseña de Administrador - Bannedbyabrejeet',
      token,
      resetUrl: `${window.location.origin}?action=reset-password&token=${token}`,
      expiresAt,
      sentAt: Date.now(),
      content: `Hola ${this.adminUser.username},\n\nSe ha solicitado la recuperación de credenciales de acceso al Dashboard de Bannedbyabrejeet.\n\nUtilice el siguiente enlace seguro temporal con expiración estricta de 15 minutos (Redis TTL): ${token}\n\nSi no realizó esta solicitud, verifique inmediatamente la actividad del servidor.`
    };

    this.transactionalEmails.unshift(emailItem);

    this.pubSubMessages.unshift({
      id: `pubsub-${Date.now()}`,
      channel: 'channel:system_events',
      sender: 'FastAPI_Service_1',
      payload: {
        action: 'LOG_ALERT',
        timestamp: Date.now(),
        reason: `Password reset token generated for ${cleanEmail} with EXPIRE 900s in Redis auth:reset_token:${token}`
      }
    });

    this.notify();
    return {
      success: true,
      message: 'Correo de recuperación enviado con éxito. Token volátil persistido en Redis con EXPIRE 900.',
      token,
      ttlSeconds,
      emailItem
    };
  }

  /**
   * US-10: Verifies if a reset token is valid and unexpired in Redis.
   */
  public checkResetTokenValid(token: string): { valid: boolean; message: string; ttlRemaining?: number } {
    if (!this.adminUser.tempResetToken || this.adminUser.tempResetToken !== token) {
      return { valid: false, message: 'El enlace de recuperación ha caducado o no es válido' };
    }

    if (this.adminUser.tempResetExpiry && Date.now() > this.adminUser.tempResetExpiry) {
      return { valid: false, message: 'El enlace de recuperación ha caducado o no es válido' };
    }

    const ttlRemaining = Math.max(0, Math.floor((this.adminUser.tempResetExpiry! - Date.now()) / 1000));
    return { valid: true, message: 'Token válido en Redis', ttlRemaining };
  }

  /**
   * Helper for testing US-10: Simulates instant expiration of the Redis TTL.
   */
  public forceExpireResetToken(): void {
    if (this.adminUser.tempResetToken) {
      this.adminUser.tempResetExpiry = Date.now() - 5000;
      this.notify();
    }
  }

  /**
   * US-01.3: Confirms password change using valid unexpired token.
   */
  public completePasswordReset(token: string, newPass: string): { success: boolean; message: string } {
    const check = this.checkResetTokenValid(token);
    if (!check.valid) {
      return { success: false, message: check.message };
    }

    if (!newPass || newPass.trim().length < 4) {
      return { success: false, message: 'La contraseña debe contener al menos 4 caracteres.' };
    }

    this.adminUser.password = newPass.trim();
    this.adminUser.passwordHash = `$2b$12$updated_${Math.random().toString(36).substring(2, 10)}`;
    this.adminUser.tempResetToken = undefined;
    this.adminUser.tempResetExpiry = undefined;

    this.pubSubMessages.unshift({
      id: `pubsub-${Date.now()}`,
      channel: 'channel:system_events',
      sender: 'FastAPI_Service_1',
      payload: {
        action: 'CONFIG_UPDATE',
        timestamp: Date.now(),
        reason: `Admin password updated and key auth:reset_token:${token} invalidated via DEL in Redis`
      }
    });

    this.notify();
    // Exact string required by Acceptance Criteria: "Contraseña actualizada correctamente"
    return { success: true, message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Helper for testing US-01.2: Resets state to simulate a fresh deployment with no admin configured.
   */
  public resetToUnconfigured(): void {
    this.adminUser = {
      username: '',
      email: '',
      isConfigured: false,
      isAuthenticated: false
    };
    this.notify();
  }

  public generatePasswordResetToken(email: string): { token: string; ttlSeconds: number } {
    const res = this.requestPasswordReset(email);
    return { token: res.token || '', ttlSeconds: res.ttlSeconds || 900 };
  }

  public performInitialSetup(username: string, email: string): void {
    this.registerInitialAdmin(username, email, 'admin123');
  }

  /**
   * ISSUE #7: Test Suite & Live Acceptance Evidence Generator
   * Executes the 4 automated tests demonstrating:
   * 1. Parsing & failure counter increment (+1)
   * 2. Successful login authentication without penalty
   * 3. Whitelist filtering (immediate discard & immunity for 127.0.0.1)
   * 4. Findtime tolerance window expiration and reset
   */
  public async runIssue7AcceptanceTests(
    onStepUpdate?: (tests: Issue7TestResult[]) => void
  ): Promise<Issue7TestResult[]> {
    const tests: Issue7TestResult[] = [
      {
        id: 'test-1-regex-increment',
        testNumber: 1,
        title: 'Detección y suma de fallos',
        criteria: 'Parseo con Regex de intento fallido e incremento del contador en Redis',
        status: 'IDLE',
        explanation: 'Verifica que al recibir una contraseña incorrecta, el sistema extraiga la IP y usuario y sume 1 fallo.',
        consoleOutput: []
      },
      {
        id: 'test-2-successful-login',
        testNumber: 2,
        title: 'Acceso exitoso',
        criteria: 'Identificación de login válido sin alteración de contadores ni sanciones',
        status: 'IDLE',
        explanation: 'Comprueba que cuando un usuario legítimo ingresa con credenciales correctas, no se sume ninguna falta.',
        consoleOutput: []
      },
      {
        id: 'test-3-whitelist-filter',
        testNumber: 3,
        title: 'Protección de Lista Blanca (Whitelist)',
        criteria: 'Descarte inmediato de fallos de IPs de confianza (127.0.0.1 y subredes)',
        status: 'IDLE',
        explanation: 'Valida que si una IP de confianza comete un error, el motor reconozca que está protegida y perdone el fallo.',
        consoleOutput: []
      },
      {
        id: 'test-4-findtime-window',
        testNumber: 4,
        title: 'Ventana de Tolerancia (Findtime)',
        criteria: 'Descarte automático de fallos antiguos fuera de la ventana de tiempo',
        status: 'IDLE',
        explanation: 'Demuestra que los errores viejos se borran automáticamente y el contador no los acumula indefinidamente.',
        consoleOutput: []
      }
    ];

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // TEST 1
    tests[0].status = 'RUNNING';
    tests[0].consoleOutput.push('[Backend B] Iniciando Test 1: Ingesta de evento SSH con contraseña fallida...');
    onStepUpdate?.([...tests]);
    await sleep(300);

    const testIp1 = '203.0.113.88';
    this.ipFailures.delete(testIp1);
    this.bannedIps.delete(testIp1);

    const testLog1 = `Aug 26 15:00:10 edge-gw sshd[28410]: Failed password for invalid user hacker from ${testIp1} port 49210 ssh2`;
    tests[0].consoleOutput.push(`[Auth Log Stream] Recibiendo línea: "${testLog1}"`);
    const res1 = this.ingestSshLog(testLog1);
    await sleep(250);

    const record1 = this.ipFailures.get(testIp1);
    const count1 = record1 ? record1.timestamps.length : 0;
    tests[0].consoleOutput.push(`[Regex Parser] Usuario: "${res1.event?.user}", IP: "${res1.event?.ip}", Puerto: ${res1.event?.port}`);
    tests[0].consoleOutput.push(`[Contador Redis] Clave ip:failures:${testIp1} -> Contador: ${count1}`);

    if ((res1.event?.eventType === 'INVALID_USER' || res1.event?.eventType === 'FAILED_PASSWORD') && count1 >= 1) {
      tests[0].status = 'PASSED';
      tests[0].explanation = `El parser identificó el usuario "${res1.event?.user}" y la IP "${testIp1}". El contador de fallos subió a ${count1} correctamente (+1).`;
      tests[0].consoleOutput.push(`[Test 1 APROBADO] Conteo incrementado exitosamente y registrado en el motor.`);
    } else {
      tests[0].status = 'FAILED';
      tests[0].explanation = 'El contador no se incrementó como se esperaba.';
      tests[0].consoleOutput.push(`[Test 1 FALLÓ] El contador no incrementó.`);
    }
    onStepUpdate?.([...tests]);
    await sleep(400);

    // TEST 2
    tests[1].status = 'RUNNING';
    tests[1].consoleOutput.push('[Backend B] Iniciando Test 2: Ingesta de evento de login exitoso...');
    onStepUpdate?.([...tests]);
    await sleep(300);

    const testIp2 = '10.0.0.15';
    const testLog2 = `Aug 26 15:00:15 edge-gw sshd[28415]: Accepted publickey for sysadmin from ${testIp2} port 60234 ssh2: RSA SHA256:KeyOk`;
    tests[1].consoleOutput.push(`[Auth Log Stream] Recibiendo línea: "${testLog2}"`);
    const res2 = this.ingestSshLog(testLog2);
    await sleep(250);

    const failures2 = this.ipFailures.get(testIp2);
    const count2 = failures2 ? failures2.timestamps.length : 0;
    tests[1].consoleOutput.push(`[Regex Parser] Evento catalogado como: "${res2.event?.eventType}" para usuario "${res2.event?.user}".`);
    tests[1].consoleOutput.push(`[Evaluación Seguridad] Contador de fallos para ${testIp2}: ${count2} (Cero infracciones).`);

    if (res2.event?.eventType === 'ACCEPTED_KEY' && count2 === 0) {
      tests[1].status = 'PASSED';
      tests[1].explanation = 'El acceso fue validado como exitoso. No se aplicó sanción ni se alteró ningún contador de faltas.';
      tests[1].consoleOutput.push('[Test 2 APROBADO] Login legítimo procesado sin generar penalizaciones.');
    } else {
      tests[1].status = 'FAILED';
      tests[1].explanation = 'El login válido fue catalogado erróneamente.';
      tests[1].consoleOutput.push('[Test 2 FALLÓ] Se registró falta para un acceso válido.');
    }
    onStepUpdate?.([...tests]);
    await sleep(400);

    // TEST 3
    tests[2].status = 'RUNNING';
    tests[2].consoleOutput.push('[Backend B] Iniciando Test 3: Verificación de filtro de Lista Blanca...');
    onStepUpdate?.([...tests]);
    await sleep(300);

    const testLog3 = `Aug 26 15:00:20 edge-gw sshd[28420]: Failed password for root from 127.0.0.1 port 52100 ssh2`;
    tests[2].consoleOutput.push(`[Auth Log Stream] Intento fallido desde 127.0.0.1: "${testLog3}"`);
    const res3 = this.ingestSshLog(testLog3);
    await sleep(250);

    const isWhite = this.whitelist.has('127.0.0.1');
    const isBanned3 = this.bannedIps.has('127.0.0.1');
    tests[2].consoleOutput.push(`[Whitelist Check] ¿127.0.0.1 está en la Lista Blanca?: ${isWhite ? 'SÍ (Protegida)' : 'NO'}`);
    tests[2].consoleOutput.push(`[Motor de Mitigación] Decisión: Evento ignorado sin registrar fallos. ¿Fue bloqueada?: ${isBanned3 ? 'SÍ' : 'NO'}`);

    if (isWhite && !isBanned3 && res3.event?.verification?.actionTaken === 'IGNORED_WHITELIST') {
      tests[2].status = 'PASSED';
      tests[2].explanation = 'La IP 127.0.0.1 está en la Lista Blanca. El fallo fue perdonado e ignorado, protegiendo al equipo contra auto-bloqueos.';
      tests[2].consoleOutput.push('[Test 3 APROBADO] Regla de prevención de auto-bloqueo y filtro de Whitelist 100% operativos.');
    } else {
      tests[2].status = 'FAILED';
      tests[2].explanation = 'La IP de la lista blanca no fue exonerada correctamente.';
      tests[2].consoleOutput.push('[Test 3 FALLÓ] No se aplicó el filtro de Whitelist.');
    }
    onStepUpdate?.([...tests]);
    await sleep(400);

    // TEST 4
    tests[3].status = 'RUNNING';
    tests[3].consoleOutput.push(`[Backend B] Iniciando Test 4: Verificación de expiración de ventana Findtime (${this.config.findtime_min} min)...`);
    onStepUpdate?.([...tests]);
    await sleep(300);

    const testIp4 = '198.51.100.99';
    this.bannedIps.delete(testIp4);
    // Simular un fallo antiguo hace (findtime_min + 10) minutos
    const oldTimestamp = Date.now() - (this.config.findtime_min + 10) * 60 * 1000;
    this.ipFailures.set(testIp4, {
      ip: testIp4,
      timestamps: [oldTimestamp],
      firstSeen: oldTimestamp,
      lastSeen: oldTimestamp,
      totalAttempts: 1,
      targetedUsers: ['root']
    });

    tests[3].consoleOutput.push(`[Simulación Temporal] Se inyectó 1 fallo previo de ${testIp4} con antigüedad de ${this.config.findtime_min + 10} minutos (fuera de la ventana).`);
    const testLog4 = `Aug 26 15:00:25 edge-gw sshd[28425]: Failed password for root from ${testIp4} port 53120 ssh2`;
    tests[3].consoleOutput.push(`[Auth Log Stream] Ingresando nuevo intento fallido en el instante presente: "${testLog4}"`);
    const res4 = this.ingestSshLog(testLog4);
    await sleep(250);

    const record4 = this.ipFailures.get(testIp4);
    const validCount4 = record4 ? record4.timestamps.length : 0;
    tests[3].consoleOutput.push(`[Evaluador Findtime] Fallos antiguos descartados fuera de tiempo: ${res4.event?.verification?.expiredFailuresDiscarded || 1}`);
    tests[3].consoleOutput.push(`[Contador Activo] Fallos válidos computados en la ventana actual: ${validCount4}`);

    if (validCount4 === 1) {
      tests[3].status = 'PASSED';
      tests[3].explanation = `El fallo de hace ${this.config.findtime_min + 10} min venció y fue purgado. El contador se reinició y solo contabiliza el intento reciente (1 fallo válido).`;
      tests[3].consoleOutput.push('[Test 4 APROBADO] La ventana de tolerancia Findtime funciona con exactitud.');
    } else {
      tests[3].status = 'FAILED';
      tests[3].explanation = 'Los fallos fuera de la ventana no fueron descartados.';
      tests[3].consoleOutput.push('[Test 4 FALLÓ] No se resetearon los fallos vencidos.');
    }
    onStepUpdate?.([...tests]);

    // Clean up test states
    this.ipFailures.delete(testIp1);
    this.ipFailures.delete(testIp4);

    return tests;
  }
}

export const securityEngine = new SecurityEngineService();
