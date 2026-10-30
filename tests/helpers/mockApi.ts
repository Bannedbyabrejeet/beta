import { vi } from 'vitest';

/**
 * Respuestas por defecto de la API para los tests.
 * La clave es "METODO /ruta" (o solo "/ruta" para cualquier método).
 * Se elige la coincidencia más específica.
 */
export const DEFAULT_RESPONSES: Record<string, unknown> = {
  // --- Backend A: lectura ---
  'GET /api/v1/health': { status: 'healthy', redis_connected: true, redis_target: '127.0.0.1:6379' },
  'GET /api/v1/config/settings': {
    max_retries: 5,
    ban_time_min: 60,
    findtime_min: 10,
    auto_unban_enabled: true,
    ufw_enabled: true,
    log_source: '/var/log/auth.log',
    ssh_port: 22
  },
  'GET /api/v1/config/whitelist': { whitelist: ['127.0.0.1', '::1'] },
  'GET /api/v1/auth/status': {
    is_initialized: true,
    username: 'admin',
    email: 'admin@bannedbyabrejeet.io'
  },
  'GET /api/v1/security/state': {
    banned: [],
    failures: [],
    logs: [],
    pubsub: [],
    ufw_ops: []
  },

  // --- Backend A: escritura ---
  'PUT /api/v1/config/settings': { message: 'Settings updated' },
  'POST /api/v1/config/whitelist': { message: 'IP added to whitelist' },
  'DELETE /api/v1/config/whitelist': { message: 'IP removed from whitelist' },
  'POST /api/v1/auth/login': {
    access_token: 'jwt_session_test',
    token_type: 'bearer',
    expires_in: 86400,
    message: 'Inicio de sesión exitoso'
  },
  'POST /api/v1/auth/setup': { message: 'Cuenta creada' },
  'POST /api/v1/auth/forgot-password': {
    status: 'success',
    message: 'Correo enviado',
    reset_token: 'rst_test_token',
    expires_in_seconds: 900
  },
  'POST /api/v1/auth/reset-password': { message: 'Contraseña actualizada correctamente' },
  'POST /api/v1/security/unban': {
    message: 'Unban order published',
    subscribers_notified: 1
  },

  // --- Backend B ---
  'GET /api/security/health': { status: 'healthy', service: 'engine', log_path: '/var/log/auth.log' },
  'GET /api/security/ufw-rules': { active: true, rules: [], raw: '', total: 0 },
  'GET /api/security/fail2ban': { installed: false, active: false, banned: [] },
  'POST /api/security/fail2ban/unban': { message: 'liberada', result: { released: true } },
  'GET /api/security/logs': { logs: [], total: 0 },
  'GET /api/security/banned': { banned: [], total: 0 },
  'GET /api/security/failures': { failures: [], total: 0 },
  'GET /api/security/pubsub': { messages: [], total: 0 },
  'GET /api/security/stats': { banned: 0, logs: 0, pubsub: 0, activeFailures: 0, timestamp: '' },
  'POST /api/security/simulate-log': {
    message: 'procesado',
    log: 'linea',
    event: null,
    banTriggered: false,
    failureCount: 1
  },
  'POST /api/security/unban': {
    message: 'desbaneada',
    result: { ok: true, removed: 1, remaining: 0 }
  }
};

export interface MockOptions {
  /** Hace que `fetch` lance un error (simula backend caído). */
  failAll?: boolean;
  /** Fuerza un status HTTP para una clave ("METODO /ruta"). */
  statuses?: Record<string, number>;
}

function matchKey(url: string, method: string, keys: string[]): string | undefined {
  return keys.find(candidate => {
    const hasMethod = candidate.includes(' ');
    if (hasMethod) {
      const [candidateMethod, path] = candidate.split(' ');
      return candidateMethod === method && url.includes(path);
    }
    return url.includes(candidate);
  });
}

/**
 * Instala un `fetch` falso. Devuelve la lista de llamadas registradas.
 */
export function mockApi(
  overrides: Record<string, unknown> = {},
  options: MockOptions = {}
): Array<{ url: string; init?: RequestInit }> {
  const table = { ...DEFAULT_RESPONSES, ...overrides };
  const keysBySpecificity = Object.keys(table).sort((a, b) => b.length - a.length);
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = vi.fn(async (input: any, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || 'GET').toUpperCase();
    calls.push({ url, init });

    if (options.failAll) {
      throw new Error('network down');
    }

    const key = matchKey(url, method, keysBySpecificity);
    if (!key) {
      return new Response(JSON.stringify({ detail: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const status = options.statuses?.[key] ?? 200;
    return new Response(JSON.stringify(table[key]), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;

  return calls;
}

/** Espera real (los métodos del engine tienen pausas de verificación). */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
