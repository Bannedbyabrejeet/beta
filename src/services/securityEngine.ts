/**
 * Bannedbyabrejeet - Capa de servicio del Frontend (Abrego)
 *
 * Esta clase es la ÚNICA fuente de verdad para los componentes de React.
 * A diferencia de la versión anterior (mock en memoria), TODO el estado
 * proviene de los microservicios reales:
 *
 *   - Backend A (FastAPI)  : auth, configuración, whitelist, ordenes de unbaneo
 *   - Backend B (Express)  : motor de seguridad SSH, reglas UFW, eventos
 *   - Redis                : estado compartido entre ambos servicios
 *
 * El estado se refresca por polling (startPolling) y de inmediato después
 * de cada mutación, de modo que un ataque SSH real detectado por Mulet
 * aparece en el Dashboard en menos de 2 segundos.
 */

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
  Issue7TestResult
} from '../types';
import { INITIAL_CONFIG, SAMPLE_GEO_MAP } from '../data/presetData';
import { runIssue7Suite } from './issue7';
import { RawFail2banStatus, RawSecurityState, RawUfwOperation, RawUfwRulesResponse } from './apiTypes';
import {
  backendA,
  backendB,
  ApiError,
  mapBannedIp,
  mapFailureRecord,
  mapLogEvent,
  mapPubSubMessage,
  toBannedMap,
  toFailuresMap,
  toUfwRules
} from './api';

type Listener = () => void;

const TOKEN_STORAGE_KEY = 'bbj_admin_token';
const ADMIN_STORAGE_KEY = 'bbj_admin_identity';

const DEFAULT_GEO = {
  country: 'Unknown Origin',
  countryCode: 'UN',
  city: 'External Network',
  flag: '🌐'
};

/**
 * Fábrica del servicio. El estado vive en el closure: sin clases,
 * cada operación es una función con una única responsabilidad.
 */
function createSecurityEngine() {
  let config: SystemConfig = { ...INITIAL_CONFIG };
  let whitelist: Set<string> = new Set();
  let logs: SshLogEvent[] = [];
  let bannedIps: Map<string, BannedIp> = new Map();
  let ipFailures: Map<string, IpFailureRecord> = new Map();
  let ufwRules: UfwRuleEntry[] = [];
  let pubSubMessages: PubSubMessage[] = [];
  let ufwOperations: RawUfwOperation[] = [];
  let fail2ban: { installed: boolean; active: boolean; banned: string[] } = {
    installed: false,
    active: false,
    banned: []
  };
  let lastFail2banFetch = 0;
  let transactionalEmails: TransactionalEmail[] = [];
  let adminUser: AdminUser = {
    username: 'admin',
    email: 'admin@bannedbyabrejeet.io',
    isConfigured: false,
    isAuthenticated: false
  };
  let listeners: Set<Listener> = new Set();
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let pendingTokens: Map<string, number> = new Map();
  let backendOnline = false;
  let lastError: string | null = null;

  restoreSession();

  // =========================================================================
  // Suscripción / notificación (React)
  // =========================================================================
  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify() {
    listeners.forEach(l => l());
  }

  // =========================================================================
  // Estado de conexión
  // =========================================================================
  function isOnline(): boolean {
    return backendOnline;
  }

  function getLastError(): string | null {
    return lastError;
  }

  // =========================================================================
  // Polling: mantiene el Dashboard sincronizado con el backend real
  // =========================================================================
  function startPolling(intervalMs: number = 2000): void {
    stopPolling();
    refresh();
    pollTimer = setInterval(() => refresh(), intervalMs);
  }

  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /**
  * Descarga el estado completo desde los backends y lo refleja en el store local.
  */
  interface Snapshot {
    settings: SystemConfig;
    whitelistResponse: { whitelist: string[] };
    authState: { is_initialized: boolean; username?: string; email?: string };
    securityState: RawSecurityState;
    ufw: RawUfwRulesResponse;
    f2bStatus: RawFail2banStatus | null;
  }

  async function fetchSnapshot(): Promise<Snapshot> {
    const f2bDue = Date.now() - lastFail2banFetch > 10000;
    if (f2bDue) lastFail2banFetch = Date.now();

    const [settings, whitelistResponse, authState, securityState, ufw, f2bStatus] =
      await Promise.all([
        backendA.getSettings(),
        backendA.getWhitelist(),
        backendA.authStatus(),
        backendA.getSecurityState(),
        backendB.getUfwRules(),
        f2bDue ? backendB.getFail2ban().catch(() => null) : Promise.resolve(null)
      ]);

    return { settings, whitelistResponse, authState, securityState, ufw, f2bStatus };
  }

  function applySnapshot(snapshot: Snapshot): void {
    const { settings, whitelistResponse, authState, securityState, ufw, f2bStatus } = snapshot;

    config = { ...INITIAL_CONFIG, ...settings };
    whitelist = new Set(whitelistResponse.whitelist || []);
    adminUser = {
      ...adminUser,
      isConfigured: !!authState.is_initialized,
      username: authState.username || adminUser.username,
      email: authState.email || adminUser.email
    };

    bannedIps = toBannedMap(securityState.banned || [], config);
    ipFailures = toFailuresMap(securityState.failures || []);
    logs = (securityState.logs || []).map(raw =>
      mapLogEvent(raw, config, ip => SAMPLE_GEO_MAP[ip] || DEFAULT_GEO)
    );
    pubSubMessages = (securityState.pubsub || []).map(mapPubSubMessage);
    ufwOperations = securityState.ufw_ops || [];
    ufwRules = toUfwRules(ufw.rules || []);

    if (f2bStatus) {
      fail2ban = {
        installed: !!f2bStatus.installed,
        active: !!f2bStatus.active,
        banned: f2bStatus.banned || []
      };
    }
  }

  async function refresh(): Promise<void> {
    try {
      applySnapshot(await fetchSnapshot());
      backendOnline = true;
      lastError = null;
    } catch (err) {
      backendOnline = false;
      lastError =
        err instanceof ApiError ? err.message : 'Error desconocido al consultar el backend';
    }
    notify();
  }

  // =========================================================================
  // Getters (síncronos: leen el último estado descargado)
  // =========================================================================
  function getConfig(): SystemConfig {
    return { ...config };
  }

  function getWhitelist(): string[] {
    return Array.from(whitelist);
  }

  function getLogs(): SshLogEvent[] {
    return [...logs];
  }

  function getBannedIps(): BannedIp[] {
    return Array.from(bannedIps.values());
  }

  function getIpFailures(): IpFailureRecord[] {
    return Array.from(ipFailures.values());
  }

  function getUfwRules(): UfwRuleEntry[] {
    return [...ufwRules];
  }

  function getPubSubMessages(): PubSubMessage[] {
    return [...pubSubMessages];
  }

  function getAdminUser(): AdminUser {
    return { ...adminUser };
  }

  function getEmails(): TransactionalEmail[] {
    return [...transactionalEmails];
  }

  function clearEmails(): void {
    transactionalEmails = [];
    notify();
  }

  // =========================================================================
  // Configuración (Backend A)
  // =========================================================================
  async function updateConfig(newConfig: Partial<SystemConfig>): Promise<{ success: boolean; message: string }> {
    try {
      await backendA.updateSettings({ ...config, ...newConfig });
      await refresh();
      return { success: true, message: 'Configuración actualizada en Redis (config:settings).' };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo actualizar la configuración';
      lastError = message;
      notify();
      return { success: false, message };
    }
  }

  // =========================================================================
  // Whitelist (Backend A)
  // =========================================================================
  async function addToWhitelist(ip: string): Promise<{ success: boolean; message: string }> {
    const cleanIp = ip.trim();
    if (!cleanIp) return { success: false, message: 'IP inválida' };
    try {
      await backendA.addToWhitelist(cleanIp);
      // Si estaba baneada, se libera de inmediato (mismo criterio que el backend)
      if (bannedIps.has(cleanIp)) {
        await unbanIp(cleanIp, 'Added to Whitelist');
      }
      await refresh();
      return { success: true, message: `IP ${cleanIp} agregada a la lista blanca exitosamente.` };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo agregar la IP a la whitelist';
      lastError = message;
      notify();
      return { success: false, message };
    }
  }

  async function removeFromWhitelist(ip: string): Promise<{ success: boolean; message: string }> {
    if (ip === '127.0.0.1' || ip === '::1') {
      return { success: false, message: 'CRÍTICO: No se puede eliminar 127.0.0.1 (Regla de Prevención de Auto-bloqueo)' };
    }
    try {
      await backendA.removeFromWhitelist(ip);
      await refresh();
      return { success: true, message: `IP ${ip} removida de la lista blanca.` };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo remover la IP de la whitelist';
      lastError = message;
      notify();
      return { success: false, message };
    }
  }

  // =========================================================================
  // Ingesta de logs SSH (Backend B - motor real)
  // =========================================================================
  async function ingestSshLog(rawLine: string): Promise<{ event: SshLogEvent | null; banTriggered: boolean }> {
    try {
      const response = await backendB.simulateLog(rawLine);
      await refresh();
      if (!response.event) {
        return { event: null, banTriggered: false };
      }
      const event = mapLogEvent(
        response.event,
        config,
        ip => SAMPLE_GEO_MAP[ip] || DEFAULT_GEO
      );
      return { event, banTriggered: !!response.banTriggered };
    } catch (err) {
      lastError = err instanceof ApiError ? err.message : 'No se pudo procesar la línea de log';
      notify();
      return { event: null, banTriggered: false };
    }
  }

  // =========================================================================
  // Simulador de ataques -> llama al motor real (Backend B)
  // =========================================================================
  /** Arma una línea de log con el formato que escribe sshd. */
  function buildAttackLogLine(
    type: EventType,
    user: string,
    ip: string,
    port: number,
    pid: number
  ): string {
    const stamp = new Date().toTimeString().split(' ')[0];
    const prefix = `${stamp} edge-gateway-01 sshd[${pid}]:`;

    switch (type) {
      case 'INVALID_USER':
        return `${prefix} Invalid user ${user} from ${ip} port ${port}`;
      case 'ACCEPTED_KEY':
        return `${prefix} Accepted publickey for ${user} from ${ip} port ${port} ssh2: RSA SHA256:KeyOk`;
      case 'PREAUTH_DISCONNECT':
        return `${prefix} Disconnected from authenticating user ${user} ${ip} port ${port} [preauth]`;
      default:
        return `${prefix} Failed password for ${user} from ${ip} port ${port} ssh2`;
    }
  }

  async function simulateAttack(options: {
    ip?: string;
    user?: string;
    attempts?: number;
    type?: EventType;
    delayMs?: number;
  }): Promise<{ success: boolean; message: string }> {
    const ip = options.ip || `185.220.101.${Math.floor(Math.random() * 200) + 10}`;
    const attempts = options.attempts || 1;
    const user = options.user || 'root';
    const type = options.type || 'FAILED_PASSWORD';
    const delayMs = options.delayMs || 400;

    let banTriggered = false;
    for (let i = 0; i < attempts; i++) {
      const port = Math.floor(Math.random() * 20000) + 40000;
      const pid = Math.floor(Math.random() * 5000) + 15000;
      const res = await ingestSshLog(buildAttackLogLine(type, user, ip, port, pid));
      if (res.banTriggered) banTriggered = true;
      if (i < attempts - 1) await settle(delayMs);
    }

    await refresh();
    return {
      success: true,
      message: banTriggered
        ? `Simulación completa: la IP ${ip} superó el umbral y fue bloqueada.`
        : `Simulación completa: ${attempts} intento(s) registrado(s) para ${ip}.`
    };
  }

  // =========================================================================
  // Desbaneo desacoplado (Backend A publica en Redis Pub/Sub -> Backend B ejecuta)
  // =========================================================================
  /** Espera de cortesía para que el Backend B aplique el cambio en UFW. */
  const settle = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const pendingRulesFor = (ip: string) => ufwRules.filter(r => r.fromIp === ip);

  /**
   * Fallback: desbaneo directo al Backend B (sin Pub/Sub).
   * Devuelve true si la IP quedó libre.
   */
  async function tryDirectUnban(ip: string): Promise<boolean> {
    try {
      await backendB.unban(ip);
      await settle(800);
      await refresh();
      return pendingRulesFor(ip).length === 0;
    } catch {
      return false;
    }
  }

  /** Libera la IP en fail2ban si ese servicio la tenía bloqueada. */
  async function releaseFail2ban(ip: string): Promise<boolean> {
    if (!fail2ban.installed || !fail2ban.banned.includes(ip)) return false;
    try {
      await backendB.unbanFail2ban(ip);
      await settle(600);
      lastFail2banFetch = 0;
      await refresh();
      return true;
    } catch {
      return false;
    }
  }

  function unbanSuccessMessage(ip: string, subscribers: number, f2bReleased: boolean): string {
    const base =
      subscribers > 0
        ? `Orden de unbaneo transmitida a través de Redis Pub/Sub para IP ${ip}. ` +
          `Servicio 2 notificado y la regla UFW fue eliminada y verificada.`
        : `Orden de unbaneo publicada en 'channel:unban_events' para IP ${ip}. ` +
          `Ningún servicio estaba suscrito en ese momento; no había regla UFW activa.`;
    return f2bReleased ? `${base} También se liberó la IP en fail2ban.` : base;
  }

  async function unbanIp(
    ip: string,
    reason: string = 'Manual unban requested'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await backendA.triggerUnban(ip, reason);
      await settle(1200);
      lastFail2banFetch = 0;
      await refresh();

      // 1) Si el Pub/Sub no la liberó, reintentar directo contra el Backend B
      if (pendingRulesFor(ip).length > 0 && (await tryDirectUnban(ip))) {
        return {
          success: true,
          message:
            `La orden Pub/Sub no eliminó la regla, pero el desbaneo DIRECTO al Backend B ` +
            `la eliminó. La IP ${ip} está libre.`
        };
      }

      // 2) Sigue bloqueada en UFW
      if (pendingRulesFor(ip).length > 0) {
        lastError = `La IP ${ip} sigue bloqueada en UFW (${pendingRulesFor(ip).length} regla/s).`;
        return {
          success: false,
          message:
            `La IP ${ip} SIGUE bloqueada en el firewall: ${pendingRulesFor(ip).length} regla(s) UFW activa(s). ` +
            `Revisá el log del Backend B y el estado de UFW (sudo ufw status numbered).`
        };
      }

      // 3) fail2ban puede mantenerla bloqueada por su cuenta
      const f2bReleased = await releaseFail2ban(ip);
      if (fail2ban.banned.includes(ip)) {
        return {
          success: false,
          message:
            `La regla de UFW se eliminó, pero la IP ${ip} SIGUE bloqueada por fail2ban ` +
            `(bantime por defecto 10 min). Ejecutá: sudo fail2ban-client set sshd unbanip ${ip}`
        };
      }

      return {
        success: true,
        message: unbanSuccessMessage(ip, response.subscribers_notified, f2bReleased)
      };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : `No se pudo desbanear la IP ${ip}`;
      lastError = message;
      notify();
      return { success: false, message };
    }
  }

  /**
  * Ultimas operaciones reales sobre el firewall (las reporta el Backend B).
  */
  function getUfwOperations(): RawUfwOperation[] {
    return [...ufwOperations];
  }

  /**
  * Estado de fail2ban (otro IDS que puede banear en paralelo a ufw).
  */
  function getFail2banStatus(): { installed: boolean; active: boolean; banned: string[] } {
    return { ...fail2ban, banned: [...fail2ban.banned] };
  }

  // =========================================================================
  // Autenticación (Backend A)
  // =========================================================================
  function restoreSession() {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const identity = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (identity) {
        const parsed = JSON.parse(identity);
        adminUser = { ...adminUser, ...parsed };
      }
      if (token) {
        adminUser.token = token;
        adminUser.isAuthenticated = true;
      }
    } catch {
      // localStorage no disponible (SSR / tests)
    }
  }

  function persistSession() {
    try {
      if (adminUser.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, adminUser.token);
        localStorage.setItem(
          ADMIN_STORAGE_KEY,
          JSON.stringify({ username: adminUser.username, email: adminUser.email })
        );
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  /**
  * US-01: Valida las credenciales contra Redis (auth:admin) vía Backend A.
  */
  async function login(identifier: string, password: string): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      const response = await backendA.login(identifier, password);
      adminUser = {
        ...adminUser,
        isConfigured: true,
        isAuthenticated: true,
        token: response.access_token,
        tokenExpiry: Date.now() + (response.expires_in || 86400) * 1000
      };
      persistSession();
      notify();
      return { success: true, message: 'Inicio de sesión exitoso', token: response.access_token };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Credenciales inválidas';
      notify();
      return { success: false, message: message || 'Credenciales inválidas' };
    }
  }

  function logout(): void {
    adminUser = { ...adminUser, isAuthenticated: false, token: undefined, tokenExpiry: undefined };
    persistSession();
    notify();
  }

  /**
  * US-01.2: Cuenta única de administrador persistida en Redis (auth:admin).
  */
  async function registerInitialAdmin(username: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      await backendA.setupAdmin(username.trim(), email.trim().toLowerCase(), password);
      adminUser = {
        ...adminUser,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        isConfigured: true,
        isAuthenticated: false
      };
      persistSession();
      await refresh();
      return { success: true, message: 'Cuenta de administrador única creada exitosamente en Redis.' };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo crear la cuenta de administrador';
      notify();
      return { success: false, message };
    }
  }

  /**
  * US-01.3 & US-10: Token temporal de reseteo persistido en Redis con EXPIRE 900.
  */
  async function requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
    token?: string;
    ttlSeconds?: number;
    emailItem?: TransactionalEmail;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const response = await backendA.forgotPassword(cleanEmail);
      const token = response.reset_token;
      const ttlSeconds = response.expires_in_seconds || 900;
      const expiresAt = Date.now() + ttlSeconds * 1000;

      pendingTokens.set(token, expiresAt);
      adminUser.tempResetToken = token;
      adminUser.tempResetExpiry = expiresAt;

      const emailItem: TransactionalEmail = {
        id: `mail_${Date.now()}`,
        to: cleanEmail,
        from: 'security-auth@bannedbyabrejeet.io',
        subject: 'Restauración de Contraseña de Administrador - Bannedbyabrejeet',
        token,
        resetUrl: `${window.location.origin}?action=reset-password&token=${token}`,
        expiresAt,
        sentAt: Date.now(),
        content: `Hola ${adminUser.username},\n\nSe ha solicitado la recuperación de credenciales de acceso al Dashboard de Bannedbyabrejeet.\n\nUtilice el siguiente enlace seguro temporal con expiración estricta de 15 minutos (Redis TTL): ${token}\n\nSi no realizó esta solicitud, verifique inmediatamente la actividad del servidor.`
      };

      transactionalEmails.unshift(emailItem);

      notify();
      return {
        success: true,
        message: response.message || 'Correo de recuperación enviado con éxito.',
        token,
        ttlSeconds,
        emailItem
      };
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'El correo electrónico ingresado no coincide con el Administrador registrado en el sistema.';
      notify();
      return { success: false, message };
    }
  }

  function checkResetTokenValid(token: string): { valid: boolean; message: string; ttlRemaining?: number } {
    const expiry = pendingTokens.get(token) ?? adminUser.tempResetExpiry;
    if (!expiry) {
      return { valid: false, message: 'El enlace de recuperación ha caducado o no es válido' };
    }
    if (Date.now() > expiry) {
      return { valid: false, message: 'El enlace de recuperación ha caducado o no es válido' };
    }
    return {
      valid: true,
      message: 'Token válido en Redis',
      ttlRemaining: Math.max(0, Math.floor((expiry - Date.now()) / 1000))
    };
  }

  function forceExpireResetToken(): void {
    if (adminUser.tempResetToken) {
      const expired = Date.now() - 5000;
      adminUser.tempResetExpiry = expired;
      pendingTokens.set(adminUser.tempResetToken, expired);
      notify();
    }
  }

  async function completePasswordReset(token: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const check = checkResetTokenValid(token);
    if (!check.valid) {
      return { success: false, message: check.message };
    }
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, message: 'La contraseña debe contener al menos 4 caracteres.' };
    }
    try {
      await backendA.resetPassword(token, newPass.trim());
      pendingTokens.delete(token);
      adminUser.tempResetToken = undefined;
      adminUser.tempResetExpiry = undefined;
      notify();
      return { success: true, message: 'Contraseña actualizada correctamente' };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo actualizar la contraseña';
      notify();
      return { success: false, message };
    }
  }

  function resetToUnconfigured(): void {
    adminUser = {
      username: '',
      email: '',
      isConfigured: false,
      isAuthenticated: false
    };
    notify();
  }

  async function generatePasswordResetToken(email: string): Promise<{ token: string; ttlSeconds: number }> {
    const res = await requestPasswordReset(email);
    return { token: res.token || '', ttlSeconds: res.ttlSeconds || 900 };
  }

  async function performInitialSetup(username: string, email: string): Promise<void> {
    await registerInitialAdmin(username, email, 'admin123');
  }

  // =========================================================================
  // ISSUE #7: Suite de pruebas de aceptación contra el backend REAL
  // =========================================================================
  async function runIssue7AcceptanceTests(
    onStepUpdate?: (tests: Issue7TestResult[]) => void
  ): Promise<Issue7TestResult[]> {
    return runIssue7Suite(
      { ingestSshLog, refresh, getWhitelist, getBannedIps, getConfig },
      onStepUpdate
    );
  }

  // API pública (se mantiene idéntica a la versión anterior con clase)
  return {
    subscribe,
    isOnline,
    getLastError,
    startPolling,
    stopPolling,
    refresh,
    getConfig,
    getWhitelist,
    getLogs,
    getBannedIps,
    getIpFailures,
    getUfwRules,
    getPubSubMessages,
    getAdminUser,
    getEmails,
    clearEmails,
    updateConfig,
    addToWhitelist,
    removeFromWhitelist,
    ingestSshLog,
    simulateAttack,
    unbanIp,
    getUfwOperations,
    getFail2banStatus,
    login,
    logout,
    registerInitialAdmin,
    requestPasswordReset,
    checkResetTokenValid,
    forceExpireResetToken,
    completePasswordReset,
    resetToUnconfigured,
    generatePasswordResetToken,
    performInitialSetup,
    runIssue7AcceptanceTests
  };
}

export const securityEngine = createSecurityEngine();
