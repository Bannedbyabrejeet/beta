/**
 * Bannedbyabrejeet - Servicio 2: Motor de Seguridad & UFW Firewall Driver
 * Autores: Santiago Mulet & Manuel Abrego
 * Framework: Express / Node.js + Redis Pub/Sub + Linux UFW
 * Ejecutado por: MULET (IP: 192.168.220.127)
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

app.use(express.json());

// Clientes de Redis (Cliente general + Subscriptor Pub/Sub)
const redisClient = redis.createClient({ url: REDIS_URL });
const subClient = redisClient.duplicate();

redisClient.on('error', (err) => console.error('[REDIS CLIENT ERROR]', err.message));
subClient.on('error', (err) => console.error('[REDIS SUB ERROR]', err.message));

// Regex optimizada para SSH Auth logs (OpenSSH Syslog)
const SSH_FAILED_REGEX = /sshd\[\d+\]: Failed password for (invalid user )?(\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/;
const SSH_INVALID_REGEX = /sshd\[\d+\]: Invalid user (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/;
const SSH_ACCEPTED_REGEX = /sshd\[\d+\]: Accepted (password|publickey) for (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/;

// =========================================================================
// 1. Ejecutor de Reglas UFW Firewall
// =========================================================================
class UfwFirewallManager {
  static banIp(ip, reason = 'bannedbyabrejeet') {
    const cmd = `ufw insert 1 deny from ${ip} to any port 22 comment 'bannedbyabrejeet:${reason}'`;
    console.log(`\n🛡️ [UFW EXEC BAN] ${cmd}`);
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ [UFW ERROR] No se pudo banear ${ip} (¿tienes permisos sudo?):`, stderr.trim());
        return;
      }
      console.log(`✅ [UFW ÉXITO] IP ${ip} BLOQUEADA en el puerto 22. Regla añadida al kernel.`);
    });
  }

  static unbanIp(ip) {
    const cmd = `ufw delete deny from ${ip} to any port 22`;
    console.log(`\n🔓 [UFW EXEC UNBAN] ${cmd}`);
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ [UFW ERROR] No se pudo desbanear ${ip}:`, stderr.trim());
        return;
      }
      console.log(`✅ [UFW ÉXITO] Regla de bloqueo para IP ${ip} eliminada de UFW.`);
    });
  }
}

// =========================================================================
// 2. Evaluador de Ataques y Reglas de Fallo (Issue #7 Core)
// =========================================================================
async function processSshLogLine(line) {
  if (!line || !line.trim()) return;

  // 1. ¿Es login aceptado?
  const acceptMatch = line.match(SSH_ACCEPTED_REGEX);
  if (acceptMatch) {
    const user = acceptMatch[2];
    const ip = acceptMatch[3];
    console.log(`🔑 [LOGIN VÁLIDO] Usuario '${user}' autenticado exitosamente desde ${ip}. (Sin penalización)`);
    return;
  }

  // 2. ¿Es fallo de contraseña o usuario inválido?
  let ip = null;
  let user = null;

  const failMatch = line.match(SSH_FAILED_REGEX);
  if (failMatch) {
    user = failMatch[2] || 'desconocido';
    ip = failMatch[3];
  } else {
    const invMatch = line.match(SSH_INVALID_REGEX);
    if (invMatch) {
      user = invMatch[1];
      ip = invMatch[2];
    }
  }

  if (!ip) return; // Línea irrelevante para SSH auth

  // 3. Verificar Whitelist
  const isWhitelisted = await redisClient.sIsMember('config:whitelist', ip);
  if (isWhitelisted) {
    console.log(`🛡️ [WHITELIST] Intento fallido de IP protegida ${ip} (Usuario: ${user}). Ignorado sin sanción.`);
    return;
  }

  // 4. Verificar si ya está baneada
  const isBanned = await redisClient.hExists('ip:banned', ip);
  if (isBanned) {
    console.log(`⚠️ [IP YA BANEADA] ${ip} sigue intentando ingresar.`);
    return;
  }

  // 5. Consultar configuración en Redis
  const settings = await redisClient.hGetAll('config:settings');
  const maxRetries = parseInt(settings.max_retries || '5', 10);
  const findTimeMin = parseInt(settings.findtime_min || '10', 10);
  const banTimeMin = parseInt(settings.ban_time_min || '60', 10);

  const key = `ip:failures:${ip}`;
  const now = Date.now();

  // Guardar timestamp del fallo con TTL de ventana (Findtime)
  await redisClient.rPush(key, now.toString());
  await redisClient.expire(key, findTimeMin * 60);

  // Contar fallos dentro de la ventana de tolerancia
  const attempts = await redisClient.lRange(key, 0, -1);
  const validAttempts = attempts.filter((t) => now - parseInt(t, 10) <= findTimeMin * 60 * 1000);

  console.log(`⚠️ [FALLO COMPUTADO] IP: ${ip} | Faltas: ${validAttempts.length}/${maxRetries} | User: ${user}`);

  // 6. ¿Superó el umbral de reintentos?
  if (validAttempts.length >= maxRetries) {
    console.warn(`\n🔥 [AMENAZA CONFIRMADA] IP ${ip} superó ${maxRetries} intentos en ${findTimeMin}m. ¡APLICANDO BAN!`);

    const banRecord = {
      ip,
      banned_at: now,
      expires_at: now + banTimeMin * 60 * 1000,
      attempts: validAttempts.length,
      last_user: user,
      reason: `Superó el límite de ${maxRetries} reintentos en ${findTimeMin} minutos`
    };

    // Guardar registro de baneo en Redis
    await redisClient.hSet('ip:banned', ip, JSON.stringify(banRecord));

    // Ejecutar bloqueo en el cortafuegos de Linux
    UfwFirewallManager.banIp(ip, 'ssh_bruteforce');

    // Limpiar historial de fallos de la IP
    await redisClient.del(key);
  }
}

// =========================================================================
// 3. Lector continuo de /var/log/auth.log (Syslog Tail)
// =========================================================================
function startLogWatcher() {
  if (!fs.existsSync(LOG_PATH)) {
    console.warn(`[AVISO LOG] Archivo ${LOG_PATH} no encontrado aún. El endpoint de simulación HTTP está activo para pruebas.`);
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
// 4. Suscriptor Redis Pub/Sub para Desbaneo Desacoplado
// =========================================================================
async function initPubSub() {
  await subClient.connect();
  await subClient.subscribe(UNBAN_CHANNEL, (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`\n📬 [REDIS PUBSUB] Mensaje recibido en '${UNBAN_CHANNEL}':`, data);
      if (data.action === 'UNBAN' && data.ip) {
        console.log(`⚡ Ejecutando orden de desbaneo para: ${data.ip} (Solicitado por: ${data.operator || 'Admin'})`);
        UfwFirewallManager.unbanIp(data.ip);
      }
    } catch (e) {
      console.error('[REDIS PUBSUB ERROR]', e);
    }
  });
  console.log(`📡 [REDIS PUBSUB] Suscrito y escuchando eventos en '${UNBAN_CHANNEL}'`);
}

// =========================================================================
// 5. Endpoints HTTP del Backend B (Health & Simulador)
// =========================================================================
app.get('/api/security/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Security Engine & UFW Driver (Framework B - Mulet)',
    log_path: LOG_PATH,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para probar líneas de log directamente desde la interfaz web o curl
app.post('/api/security/simulate-log', async (req, res) => {
  const { log_line } = req.body;
  if (!log_line) {
    return res.status(400).json({ error: 'Falta campo log_line' });
  }
  await processSshLogLine(log_line);
  res.json({ message: 'Log procesado por el motor de seguridad', log: log_line });
});

// =========================================================================
// 6. Arranque del Servidor
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==========================================================`);
    console.log(`⚡ Bannedbyabrejeet Security Engine (Mulet) en puerto ${PORT}`);
    console.log(`🛡️ Control UFW: Activado`);
    console.log(`==========================================================\n`);
  });
}

bootstrap().catch(console.error);
