/**
 * Bannedbyabrejeet - Servicio 2: Motor de Seguridad & UFW Firewall Driver
 * Autores: Santiago Mulet & Manuel Abrego
 * Framework: Express / Node.js + Redis Pub/Sub + Linux UFW
 * Ejecutado por: MULET (IP: 192.168.220.127)
 *
 * Los eventos procesados se persisten en Redis para que el Frontend (Abrego)
 * pueda leer el estado REAL del sistema via /api/security/*
 */

const express = require('express');
const { exec } = require('child_process');
const redis = require('redis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const app = express();
const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const LOG_PATH = process.env.SSH_LOG_PATH || '/var/log/auth.log';
const UNBAN_CHANNEL = 'channel:unban_events';

// Claves Redis donde se publica el estado que consume el Frontend
const K_LOGS = 'security:logs';
const K_PUBSUB = 'security:pubsub';
const K_BANNED = 'ip:banned';
const K_FAILURES_PREFIX = 'ip:failures:';
const MAX_HISTORY = 200;

app.use(express.json());

// Clientes de Redis (Cliente general + Subscriptor Pub/Sub)
const redisClient = redis.createClient({ url: REDIS_URL });
const subClient = redisClient.duplicate();

redisClient.on('error', (err) => console.error('[REDIS CLIENT ERROR]', err.message));
subClient.on('error', (err) => console.error('[REDIS SUB ERROR]', err.message));

// Regex optimizada para SSH Auth logs (OpenSSH Syslog)
// IMPORTANTE: en Ubuntu 24.04+ el proceso de sesión se llama "sshd-session[PID]",
// mientras que en versiones anteriores era "sshd[PID]". Se aceptan ambas variantes.
const SSH_FAILED_REGEX = /sshd(?:-session)?\[\d+\]: Failed password for (invalid user )?(\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/;
const SSH_INVALID_REGEX = /sshd(?:-session)?\[\d+\]: Invalid user (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/;
const SSH_ACCEPTED_REGEX = /sshd(?:-session)?\[\d+\]: Accepted (password|publickey) for (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/;

// =========================================================================
// 0. CORS (por si el Frontend llama directo sin pasar por Nginx/Vite proxy)
// =========================================================================
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// =========================================================================
// 1. Ejecutor de Reglas UFW Firewall
// =========================================================================
/**
 * Ejecuta un comando y devuelve {code, stdout, stderr}.
 */
function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      resolve({
        code: err ? (err.code ?? 1) : 0,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim()
      });
    });
  });
}

class UfwFirewallManager {
  /**
   * BANEAR una IP.
   * - No duplica reglas si la IP ya está bloqueada.
   * - Si 'ufw insert 1' falla por posición inválida (ruleset vacío), cae a 'ufw deny'.
   * - Verifica el resultado y devuelve el detalle (se publica en Redis).
   */
  static async banIp(ip, reason = 'bannedbyabrejeet') {
    const existing = await UfwFirewallManager.findRulesForIp(ip);
    if (existing.length > 0) {
      console.log(`⚠️ [UFW] La IP ${ip} ya tiene ${existing.length} regla(s) activa(s). No se duplica.`);
      return { ok: true, skipped: true, rules: existing.length, removed: 0 };
    }

    let res = await runCommand(
      `ufw insert 1 deny from ${ip} to any port 22 comment 'bannedbyabrejeet:${reason}'`
    );

    // Si no hay reglas previas, la posición 1 no existe -> ufw appendea al final
    if (res.code !== 0 && /invalid position/i.test(`${res.stderr} ${res.stdout}`)) {
      console.log(`⚠️ [UFW] No hay posición 1 libre -> se usa 'ufw deny' (regla al final).`);
      res = await runCommand(
        `ufw deny from ${ip} to any port 22 comment 'bannedbyabrejeet:${reason}'`
      );
    }

    if (res.code !== 0) {
      const detalle = `${res.stderr || res.stdout}`.trim();
      console.error(`❌ [UFW ERROR] No se pudo banear ${ip} (¿tienes permisos sudo?):`, detalle);
      return { ok: false, error: detalle, removed: 0 };
    }

    // Verificación: la regla tiene que existir de verdad
    const after = await UfwFirewallManager.findRulesForIp(ip);
    if (after.length === 0) {
      console.error(`❌ [UFW VERIFY] El comando terminó bien, pero la regla de ${ip} NO aparece en 'ufw status'.`);
      return { ok: false, error: 'La regla no aparece en ufw status después de insertarla', removed: 0 };
    }

    console.log(`✅ [UFW ÉXITO] IP ${ip} BLOQUEADA en el puerto 22. Regla añadida al kernel.`);
    return { ok: true, skipped: false, rules: after.length, removed: 0 };
  }

  /**
   * DESBANEAR una IP.
   * Borra TODAS las reglas de esa IP (por posición, de mayor a menor) y
   * VERIFICA que la IP quedo libre. Esto evita el bug clasico de ufw, donde
   * un delete por especificacion no matchea la regla insertada con comment
   * y la IP sigue bloqueada.
   */
  static async unbanIp(ip) {
    const rules = await UfwFirewallManager.findRulesForIp(ip);

    if (rules.length === 0) {
      console.log(`ℹ️ [UFW] La IP ${ip} no tiene ninguna regla activa: ya estaba libre.`);
      // Igual intentamos el delete por especificación (por si el parser se perdió algo)
      await runCommand(`ufw delete deny from ${ip} to any port 22`);
      return { ok: true, alreadyFree: true, removed: 0, remaining: 0 };
    }

    console.log(`🔓 [UFW EXEC UNBAN] ${rules.length} regla(s) encontrada(s) para ${ip}`);

    // Estrategia 1: delete por especificacion (funciona en el ufw real Y en el shim)
    const specRes = await runCommand(`ufw delete deny from ${ip} to any port 22`);
    let removed = specRes.code === 0 ? 1 : 0;
    if (specRes.code === 0) {
      console.log(`   ↳ regla eliminada por especificación`);
    }

    // ⚠️ CRÍTICO: al borrar una regla, las DEMÁS se renumeran.
    // Por eso hay que VOLVER A LEER la lista antes de borrar por posición,
    // y sólo borrar reglas que sigan perteneciendo a esta IP.
    // (Un bug anterior usaba las posiciones viejas y borraba la regla ALLOW 22/tcp.)
    const pendientes = await UfwFirewallManager.findRulesForIp(ip);

    // De mayor a menor: al borrar, las posiciones inferiores no se mueven
    const ordered = [...pendientes].sort((a, b) => b.id - a.id);
    for (const rule of ordered) {
      // Guarda extra: nunca borrar una regla ALLOW (podría ser el acceso SSH legítimo)
      if (rule.action !== 'DENY' && rule.action !== 'REJECT') {
        console.warn(
          `⚠️ [UFW SAFETY] Se omite la regla [${rule.id}] (${rule.action} ${rule.fromIp}): ` +
          `sólo se borran reglas DENY/REJECT de la IP sancionada.`
        );
        continue;
      }
      const res = await runCommand(`ufw --force delete ${rule.id}`);
      if (res.code === 0) {
        removed++;
        console.log(`   ↳ regla [${rule.id}] eliminada por posición`);
      } else {
        const detalle = `${res.stderr || res.stdout}`.trim();
        // "non-existent" es normal (ya se borró por especificación)
        if (!/non-existent|could not find rule/i.test(detalle)) {
          console.error(`❌ [UFW ERROR] No se pudo eliminar la regla [${rule.id}] de ${ip}:`, detalle);
        }
      }
    }

    // Estrategia 3: delete por posicion SIN --force (compatibilidad con versiones viejas de ufw)
    for (const rule of ordered) {
      const res = await runCommand(`ufw delete ${rule.id}`);
      if (res.code === 0) removed++;
    }

    // fail2ban: puede estar baneando la MISMA IP por su cuenta (nftables/iptables).
    // Si no se libera también ahí, la conexión sigue rechazada aunque ufw esté limpio.
    const f2b = await UfwFirewallManager.unbanFail2ban(ip);

    // Verificación final
    const after = await UfwFirewallManager.findRulesForIp(ip);
    const remaining = after.length;

    if (remaining === 0) {
      console.log(
        `✅ [UFW ÉXITO] Regla de bloqueo para IP ${ip} eliminada de UFW (${removed} borrada(s))` +
        `${f2b.released ? ' + liberada en fail2ban ✅' : ''}.`
      );
      return { ok: true, alreadyFree: false, removed, remaining: 0, fail2ban: f2b };
    }

    console.error(`❌ [UFW VERIFY] La IP ${ip} SIGUE bloqueada: quedan ${remaining} regla(s).`);
    return {
      ok: false,
      removed,
      remaining,
      error: `Persisten ${remaining} regla(s) de UFW para ${ip}`
    };
  }

  /**
   * Lee el estado real de UFW y lo devuelve ya parseado.
   * Funciona igual con UFW activo o inactivo (en inactivo igual lista las reglas).
   */
  static async listRules() {
    const res = await runCommand('ufw status numbered');
    const raw = res.stdout || '';
    const active = /Status:\s*active/i.test(raw);
    const rules = [];

    // Ej: "[ 1] 22                         DENY IN     203.0.113.77   # bannedbyabrejeet:ssh"
    const ruleRegex = /^\[\s*(\d+)\]\s+(\S+)\s+(DENY|ALLOW|REJECT|LIMIT)(?:\s+(?:IN|OUT))?\s+(.*)$/;

    raw.split('\n').forEach((line) => {
      const m = line.match(ruleRegex);
      if (!m) return;

      let rest = m[4].trim();
      // El comentario de ufw viene al final tras '#'
      let comment = '';
      const hashIndex = rest.indexOf('#');
      if (hashIndex !== -1) {
        comment = rest.slice(hashIndex + 1).trim();
        rest = rest.slice(0, hashIndex).trim();
      }

      const from = rest.trim();
      const port = m[2].split('/')[0];

      rules.push({
        id: parseInt(m[1], 10),
        action: m[3],
        fromIp: from === 'Anywhere' ? '0.0.0.0/0' : from,
        toPort: parseInt(port, 10) || 22,
        comment,
        active: true
      });
    });

    return { active, rules, raw };
  }

  /**
   * Todas las reglas que bloquean a una IP concreta.
   */
  static async findRulesForIp(ip) {
    try {
      const { rules } = await UfwFirewallManager.listRules();
      return rules.filter((r) => r.fromIp === ip);
    } catch (err) {
      console.error('[UFW LIST ERROR]', err.message);
      return [];
    }
  }

  /**
   * fail2ban puede estar bloqueando la MISMA IP en paralelo (nftables o iptables),
   * por fuera de ufw. Si no se libera ahí también, la conexión sigue rechazada
   * aunque 'ufw status' se vea limpio.
   * Best-effort: si fail2ban no está instalado, no hace nada.
   */
  static async unbanFail2ban(ip) {
    const result = { installed: false, released: false, jails: [], error: null };

    const which = await runCommand('command -v fail2ban-client');
    if (which.code !== 0) return result;
    result.installed = true;

    let jails = ['sshd'];
    const status = await runCommand('fail2ban-client status');
    if (status.code === 0) {
      const m = status.stdout.match(/Jail list:\s*(.+)/i);
      if (m) jails = m[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
    }

    for (const jail of jails) {
      const res = await runCommand(`fail2ban-client set ${jail} unbanip ${ip}`);
      const out = `${res.stdout} ${res.stderr}`.trim();
      if (res.code === 0) {
        result.jails.push(jail);
        // fail2ban devuelve "1" si desbaneó, "0" si la IP no estaba en ese jail
        if (out === '1') {
          result.released = true;
          console.log(`   ↳ fail2ban: IP ${ip} liberada del jail '${jail}' ✅`);
        }
      } else if (!/not found|invalid|no such|Failed to access socket/i.test(out)) {
        console.error(`❌ [FAIL2BAN ERROR] jail '${jail}':`, out);
      }
    }

    return result;
  }

  /**
   * Estado de fail2ban (para diagnóstico desde el Dashboard).
   */
  static async fail2banStatus() {
    const which = await runCommand('command -v fail2ban-client');
    if (which.code !== 0) {
      return { installed: false, active: false, jails: {}, banned: [] };
    }

    const out = { installed: true, active: false, jails: {}, banned: [] };
    const status = await runCommand('fail2ban-client status');
    if (status.code !== 0) {
      out.error = `${status.stderr || status.stdout}`.trim();
      return out;
    }
    out.active = true;

    const m = status.stdout.match(/Jail list:\s*(.+)/i);
    const jails = m ? m[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean) : [];

    for (const jail of jails) {
      const j = await runCommand(`fail2ban-client status ${jail}`);
      if (j.code !== 0) continue;
      const bannedMatch = j.stdout.match(/Banned IP list:\s*(.*)/i);
      const banned = bannedMatch
        ? bannedMatch[1].split(/\s+/).map((s) => s.trim()).filter(Boolean)
        : [];
      out.jails[jail] = banned;
      out.banned.push(...banned);
    }
    out.banned = [...new Set(out.banned)];
    return out;
  }
}

// =========================================================================
// 2. Persistencia de eventos en Redis (para que el Frontend los muestre)
// =========================================================================
async function recordLogEvent(event) {
  try {
    await redisClient.lPush(K_LOGS, JSON.stringify(event));
    await redisClient.lTrim(K_LOGS, 0, MAX_HISTORY - 1);
  } catch (err) {
    console.error('[REDIS WRITE ERROR logs]', err.message);
  }
}

async function recordUfwOperation(op) {
  try {
    await redisClient.lPush('security:ufw_ops', JSON.stringify(op));
    await redisClient.lTrim('security:ufw_ops', 0, 49);
  } catch (err) {
    console.error('[REDIS WRITE ERROR ufw_ops]', err.message);
  }
}

async function recordPubSubMessage(message) {
  try {
    await redisClient.lPush(K_PUBSUB, JSON.stringify(message));
    await redisClient.lTrim(K_PUBSUB, 0, MAX_HISTORY - 1);
  } catch (err) {
    console.error('[REDIS WRITE ERROR pubsub]', err.message);
  }
}

/**
 * Parsea una linea de auth.log al mismo formato que usa el Frontend.
 * Devuelve null si la linea no es relevante para la seguridad SSH.
 */
function parseSshLogLine(line) {
  if (!line || !line.trim()) return null;

  let eventType = null;
  let user = null;
  let ip = null;
  let port = 22;

  const acceptMatch = line.match(SSH_ACCEPTED_REGEX);
  if (acceptMatch) {
    eventType = 'ACCEPTED_KEY';
    user = acceptMatch[2];
    ip = acceptMatch[3];
    port = parseInt(acceptMatch[4], 10);
  } else {
    const failMatch = line.match(SSH_FAILED_REGEX);
    const invMatch = line.match(SSH_INVALID_REGEX);
    if (failMatch) {
      eventType = 'FAILED_PASSWORD';
      user = failMatch[2] || 'desconocido';
      ip = failMatch[3];
      port = parseInt(failMatch[4], 10);
    } else if (invMatch) {
      eventType = 'INVALID_USER';
      user = invMatch[1];
      ip = invMatch[2];
      port = parseInt(invMatch[3], 10);
    }
  }

  if (!ip) return null;

  const epoch = Date.now();
  return {
    id: `log-${epoch}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date(epoch).toISOString().replace('T', ' ').substring(0, 19),
    epoch,
    ip,
    user: user || 'unknown',
    port,
    eventType,
    service: 'sshd',
    rawLog: line.trim()
  };
}

// =========================================================================
// 3. Evaluador de Ataques y Reglas de Fallo (Issue #7 Core)
// =========================================================================
async function processSshLogLine(line) {
  if (!line || !line.trim()) return null;

  const event = parseSshLogLine(line);

  // 1. ¿Es login aceptado?
  if (event && event.eventType === 'ACCEPTED_KEY') {
    console.log(`🔑 [LOGIN VÁLIDO] Usuario '${event.user}' autenticado exitosamente desde ${event.ip}. (Sin penalización)`);
    event.actionTaken = 'LOGGED_SUCCESS';
    event.decisionSummary = `Acceso concedido exitosamente para '${event.user}'. No se suma ninguna infracción.`;
    await recordLogEvent(event);
    return { event, banTriggered: false, failureCount: 0 };
  }

  // Linea no relacionada con SSH auth
  if (!event) return null;

  // 2. Verificar Whitelist
  const isWhitelisted = await redisClient.sIsMember('config:whitelist', event.ip);
  if (isWhitelisted) {
    console.log(`🛡️ [WHITELIST] Intento fallido de IP protegida ${event.ip} (Usuario: ${event.user}). Ignorado sin sanción.`);
    event.actionTaken = 'IGNORED_WHITELIST';
    event.decisionSummary = `La IP ${event.ip} está en la Lista Blanca. El fallo fue perdonado e ignorado.`;
    event.isWhitelisted = true;
    await recordLogEvent(event);
    return { event, banTriggered: false, failureCount: 0 };
  }

  // 3. Verificar si ya está baneada
  const isBanned = await redisClient.hExists(K_BANNED, event.ip);
  if (isBanned) {
    console.log(`⚠️ [IP YA BANEADA] ${event.ip} sigue intentando ingresar.`);
    event.actionTaken = 'THRESHOLD_EXCEEDED_BANNED';
    event.decisionSummary = `La IP ${event.ip} ya está bloqueada en el Firewall.`;
    event.triggeredBan = true;
    await recordLogEvent(event);
    return { event, banTriggered: false, failureCount: 0, alreadyBanned: true };
  }

  // 4. Consultar configuración en Redis
  const settings = await redisClient.hGetAll('config:settings');
  const maxRetries = parseInt(settings.max_retries || '5', 10);
  const findTimeMin = parseInt(settings.findtime_min || '10', 10);
  const banTimeMin = parseInt(settings.ban_time_min || '60', 10);

  const key = `${K_FAILURES_PREFIX}${event.ip}`;
  const now = Date.now();

  // Guardar timestamp del fallo con TTL de ventana (Findtime)
  await redisClient.rPush(key, now.toString());
  await redisClient.expire(key, findTimeMin * 60);

  // Contar fallos dentro de la ventana de tolerancia
  const attempts = await redisClient.lRange(key, 0, -1);
  const validAttempts = attempts.filter((t) => now - parseInt(t, 10) <= findTimeMin * 60 * 1000);

  console.log(`⚠️ [FALLO COMPUTADO] IP: ${event.ip} | Faltas: ${validAttempts.length}/${maxRetries} | User: ${event.user}`);

  event.failuresInWindowBefore = Math.max(0, validAttempts.length - 1);
  event.failuresInWindowAfter = validAttempts.length;
  event.maxRetriesAllowed = maxRetries;
  event.windowMinutes = findTimeMin;

  // 5. ¿Superó el umbral de reintentos?
  let banTriggered = false;
  if (validAttempts.length >= maxRetries) {
    console.warn(`\n🔥 [AMENAZA CONFIRMADA] IP ${event.ip} superó ${maxRetries} intentos en ${findTimeMin}m. ¡APLICANDO BAN!`);

    const banRecord = {
      ip: event.ip,
      banned_at: now,
      expires_at: now + banTimeMin * 60 * 1000,
      attempts: validAttempts.length,
      last_user: event.user,
      reason: `Superó el límite de ${maxRetries} reintentos en ${findTimeMin} minutos`
    };

    // Guardar registro de baneo en Redis
    await redisClient.hSet(K_BANNED, event.ip, JSON.stringify(banRecord));

    // Ejecutar bloqueo en el cortafuegos de Linux
    const ufwResult = await UfwFirewallManager.banIp(event.ip, 'ssh_bruteforce');
    await recordUfwOperation({
      action: 'BAN',
      ip: event.ip,
      ok: !!ufwResult.ok,
      skipped: !!ufwResult.skipped,
      removed: ufwResult.removed || 0,
      remaining: ufwResult.rules || 0,
      error: ufwResult.error || null,
      timestamp: now
    });

    // Limpiar historial de fallos de la IP
    await redisClient.del(key);

    banTriggered = true;
    event.actionTaken = 'THRESHOLD_EXCEEDED_BANNED';
    event.triggeredBan = true;
    event.decisionSummary = `Se superó el límite de seguridad (${validAttempts.length} de ${maxRetries} fallos dentro de la ventana de ${findTimeMin} min). El motor bloqueó la IP de inmediato en el Firewall.`;

    // Publicar el evento de baneo para que aparezca en el Dashboard
    await recordPubSubMessage({
      id: `pubsub-${now}`,
      channel: 'channel:unban_events',
      sender: 'Express_Security_Engine',
      payload: {
        action: 'BAN',
        ip: event.ip,
        timestamp: now,
        reason: banRecord.reason
      }
    });
  } else {
    event.actionTaken = 'RECORDED_FAILURE_PENDING';
    const remaining = Math.max(0, maxRetries - validAttempts.length);
    event.decisionSummary = `Intento fallido registrado (${validAttempts.length} de ${maxRetries} tolerados en ${findTimeMin} min). Le quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'} antes de ser bloqueado.`;
  }

  await recordLogEvent(event);
  return { event, banTriggered, failureCount: validAttempts.length };
}

// =========================================================================
// 4. Lector continuo de /var/log/auth.log (Syslog Tail)
// =========================================================================
function startLogWatcher() {
  if (!fs.existsSync(LOG_PATH)) {
    console.warn(`[AVISO LOG] Archivo ${LOG_PATH} no encontrado aún. El endpoint de simulación HTTP está activo para pruebas.`);
    return;
  }

  try {
    fs.statSync(LOG_PATH);
  } catch (err) {
    console.warn(`[AVISO LOG] Sin permisos de lectura sobre ${LOG_PATH} (${err.code}). El endpoint de simulación HTTP está activo para pruebas.`);
    return;
  }

  console.log(`👁️ [MONITOR ACTIVO] Siguiendo registros en tiempo real de: ${LOG_PATH}`);
  let fileSize = fs.statSync(LOG_PATH).size;

  fs.watchFile(LOG_PATH, { interval: 500 }, (curr, prev) => {
    if (curr.size > prev.size) {
      const stream = fs.createReadStream(LOG_PATH, {
        start: prev.size,
        end: curr.size
      });
      const rl = readline.createInterface({ input: stream });
      rl.on('line', (line) => {
        processSshLogLine(line).catch(console.error);
      });
    }
  });
}

// =========================================================================
// 5. Suscriptor Redis Pub/Sub para Desbaneo Desacoplado
// =========================================================================
async function initPubSub() {
  await subClient.connect();
  await subClient.subscribe(UNBAN_CHANNEL, async (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`\n📬 [REDIS PUBSUB] Mensaje recibido en '${UNBAN_CHANNEL}':`, data);
      if (data.action === 'UNBAN' && data.ip) {
        console.log(`⚡ Ejecutando orden de desbaneo para: ${data.ip} (Solicitado por: ${data.operator || 'Admin'})`);
        const ufwResult = await UfwFirewallManager.unbanIp(data.ip);
        await recordUfwOperation({
          action: 'UNBAN',
          ip: data.ip,
          ok: !!ufwResult.ok,
          skipped: !!ufwResult.alreadyFree,
          removed: ufwResult.removed || 0,
          remaining: ufwResult.remaining || 0,
          error: ufwResult.error || null,
          timestamp: Date.now(),
          operator: data.operator || 'Admin'
        });
      }
    } catch (e) {
      console.error('[REDIS PUBSUB ERROR]', e);
    }
  });
  console.log(`📡 [REDIS PUBSUB] Suscrito y escuchando eventos en '${UNBAN_CHANNEL}'`);
}

// =========================================================================
// 6. Endpoints HTTP del Backend B (Estado real para el Frontend)
// =========================================================================
app.get('/api/security/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Security Engine & UFW Driver (Framework B - Mulet)',
    log_path: LOG_PATH,
    timestamp: new Date().toISOString()
  });
});

// Desbaneo directo (bypass de Pub/Sub): util para diagnostico y para cuando
// el canal de Redis no llega al Backend B. Ejecuta el 'ufw delete' de inmediato.
app.post('/api/security/unban', async (req, res) => {
  const ip = (req.body && req.body.ip) || '';
  if (!ip) {
    return res.status(400).json({ error: 'Falta campo ip' });
  }
  try {
    const result = await UfwFirewallManager.unbanIp(ip);
    await recordUfwOperation({
      action: 'UNBAN_DIRECT',
      ip,
      ok: !!result.ok,
      skipped: !!result.alreadyFree,
      removed: result.removed || 0,
      remaining: result.remaining || 0,
      error: result.error || null,
      timestamp: Date.now(),
      operator: 'Direct (Backend B)'
    });
    return res.json({
      message: result.ok
        ? `IP ${ip} desbaneada. ${result.removed} regla(s) eliminada(s), ${result.remaining} restante(s).`
        : `No se pudo desbanear ${ip}: ${result.error || 'error desconocido'}`,
      result
    });
  } catch (err) {
    console.error('[UNBAN DIRECT ERROR]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint para probar líneas de log directamente desde la interfaz web o curl
app.post('/api/security/simulate-log', async (req, res) => {
  const { log_line } = req.body;
  if (!log_line) {
    return res.status(400).json({ error: 'Falta campo log_line' });
  }
  try {
    const result = await processSshLogLine(log_line);
    res.json({
      message: 'Log procesado por el motor de seguridad',
      log: log_line,
      event: result ? result.event : null,
      banTriggered: result ? result.banTriggered : false,
      failureCount: result ? result.failureCount : 0
    });
  } catch (err) {
    console.error('[SIMULATE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Lectura del estado real (lo consume el Frontend) ---

app.get('/api/security/logs', async (req, res) => {
  try {
    const raw = await redisClient.lRange(K_LOGS, 0, MAX_HISTORY - 1);
    const logs = raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
    res.json({ logs, total: logs.length });
  } catch (err) {
    res.status(503).json({ error: err.message, logs: [] });
  }
});

app.get('/api/security/banned', async (req, res) => {
  try {
    const raw = await redisClient.hGetAll(K_BANNED);
    const banned = Object.entries(raw).map(([ip, value]) => {
      let record = {};
      try { record = JSON.parse(value); } catch { record = { reason: value }; }
      return { ip, ...record };
    });
    res.json({ banned, total: banned.length });
  } catch (err) {
    res.status(503).json({ error: err.message, banned: [] });
  }
});

app.get('/api/security/failures', async (req, res) => {
  try {
    const keys = await redisClient.keys(`${K_FAILURES_PREFIX}*`);
    const failures = [];
    for (const key of keys) {
      const ip = key.slice(K_FAILURES_PREFIX.length);
      const timestamps = (await redisClient.lRange(key, 0, -1)).map((t) => parseInt(t, 10));
      const ttl = await redisClient.ttl(key);
      failures.push({
        ip,
        timestamps,
        firstSeen: timestamps.length ? Math.min(...timestamps) : Date.now(),
        lastSeen: timestamps.length ? Math.max(...timestamps) : Date.now(),
        totalAttempts: timestamps.length,
        ttlSeconds: ttl,
        targetedUsers: []
      });
    }
    res.json({ failures, total: failures.length });
  } catch (err) {
    res.status(503).json({ error: err.message, failures: [] });
  }
});

app.get('/api/security/pubsub', async (req, res) => {
  try {
    const raw = await redisClient.lRange(K_PUBSUB, 0, MAX_HISTORY - 1);
    const messages = raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
    res.json({ messages, total: messages.length });
  } catch (err) {
    res.status(503).json({ error: err.message, messages: [] });
  }
});

app.get('/api/security/ufw-ops', async (req, res) => {
  try {
    const raw = await redisClient.lRange('security:ufw_ops', 0, 49);
    const operations = raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
    res.json({ operations, total: operations.length });
  } catch (err) {
    res.status(503).json({ error: err.message, operations: [] });
  }
});

app.get('/api/security/ufw-rules', async (req, res) => {
  const { active, rules, raw } = await UfwFirewallManager.listRules();
  res.json({ active, rules, raw, total: rules.length });
});

// Estado de fail2ban: puede estar bloqueando IPs en paralelo a ufw
app.get('/api/security/fail2ban', async (req, res) => {
  try {
    const status = await UfwFirewallManager.fail2banStatus();
    res.json(status);
  } catch (err) {
    res.status(503).json({ error: err.message, installed: false, active: false, banned: [] });
  }
});

// Liberar una IP en fail2ban (sin tocar ufw)
app.post('/api/security/fail2ban/unban', async (req, res) => {
  const ip = (req.body && req.body.ip) || '';
  if (!ip) return res.status(400).json({ error: 'Falta campo ip' });
  const result = await UfwFirewallManager.unbanFail2ban(ip);
  res.json({ message: `fail2ban: ${result.released ? 'IP liberada' : 'la IP no estaba baneada o fail2ban no está instalado'}`, result });
});

app.get('/api/security/stats', async (req, res) => {
  try {
    const [bannedRaw, logCount, pubCount] = await Promise.all([
      redisClient.hLen(K_BANNED),
      redisClient.lLen(K_LOGS),
      redisClient.lLen(K_PUBSUB)
    ]);
    const failureKeys = await redisClient.keys(`${K_FAILURES_PREFIX}*`);
    res.json({
      banned: bannedRaw,
      logs: logCount,
      pubsub: pubCount,
      activeFailures: failureKeys.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// =========================================================================
// 7. Arranque del Servidor
// =========================================================================
async function bootstrap() {
  try {
    await redisClient.connect();
    console.log(`🟢 Conexión con Redis establecida en ${REDIS_URL}`);
  } catch (err) {
    console.error('🔴 Error conectando con Redis:', err.message);
  }

  await initPubSub();
  startLogWatcher();

  // Chequeo de seguridad: si UFW está activo y no hay una regla ALLOW para el
  // puerto 22, el acceso SSH quedaría bloqueado por la política por defecto.
  try {
    const { active, rules } = await UfwFirewallManager.listRules();
    const sshAllowed = rules.some(
      (r) => r.action === 'ALLOW' && (r.toPort === 22 || r.toPort === 0)
    );
    if (active && !sshAllowed) {
      console.warn('');
      console.warn('⚠️  [UFW SAFETY] UFW está ACTIVO y no hay regla ALLOW para el puerto 22.');
      console.warn('    Con la política por defecto (deny incoming) el acceso SSH queda bloqueado.');
      console.warn('    Ejecutá:  sudo ufw allow 22/tcp');
      console.warn('');
    }

    // Aviso: fail2ban puede estar baneando en paralelo (nftables/iptables).
    const f2b = await UfwFirewallManager.fail2banStatus();
    if (f2b.installed && f2b.active) {
      console.log('');
      console.log('ℹ️  [FAIL2BAN] Detectado y activo. También puede banear IPs por su cuenta');
      console.log('    (bantime por defecto: 10 min). El desbaneo del Dashboard ahora');
      console.log('    libera la IP en ufw Y en fail2ban.');
      if (f2b.banned.length > 0) {
        console.log(`    IPs actualmente bloqueadas por fail2ban: ${f2b.banned.join(', ')}`);
      }
      console.log('');
    }
  } catch (err) {
    console.error('[SAFETY CHECK]', err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==========================================================`);
    console.log(`⚡ Bannedbyabrejeet Security Engine (Mulet) en puerto ${PORT}`);
    console.log(`🛡️ Control UFW: Activado`);
    console.log(`==========================================================\n`);
  });
}

bootstrap().catch(console.error);
