import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Mock con estado: permite simular que la regla de UFW desaparece después del
 * desbaneo directo, y que fail2ban libera la IP.
 */
function mockSecurityFlow(options: {
  rulePersistsAfterPubSub?: boolean;
  ruleClearedAfterDirect?: boolean;
  fail2banBanned?: boolean;
} = {}) {
  const state = {
    ufwRules: ['203.0.113.5'],
    fail2ban: options.fail2banBanned ? ['203.0.113.5'] : ([] as string[])
  };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  globalThis.fetch = vi.fn(async (input: any) => {
    const url = String(input);

    if (url.includes('/api/v1/security/unban')) {
      // Pub/Sub: la regla queda si el escenario lo pide
      if (!options.rulePersistsAfterPubSub) state.ufwRules = [];
      return json({ message: 'unban publicado', subscribers_notified: 1 });
    }

    if (url.includes('/api/security/unban')) {
      if (options.ruleClearedAfterDirect !== false) state.ufwRules = [];
      return json({ message: 'desbaneada', result: { ok: true, removed: 1, remaining: 0 } });
    }

    if (url.includes('/api/security/fail2ban/unban')) {
      state.fail2ban = [];
      return json({ message: 'liberada', result: { released: true } });
    }

    if (url.includes('/api/security/fail2ban')) {
      return json({
        installed: true,
        active: true,
        banned: state.fail2ban
      });
    }

    if (url.includes('/api/security/ufw-rules')) {
      return json({
        active: true,
        rules: state.ufwRules.map((ip, index) => ({
          id: index + 1,
          action: 'DENY',
          fromIp: ip,
          toPort: 22,
          comment: 'bannedbyabrejeet:ssh',
          active: true
        })),
        raw: '',
        total: state.ufwRules.length
      });
    }

    if (url.includes('/api/v1/security/state')) {
      return json({ banned: [], failures: [], logs: [], pubsub: [], ufw_ops: [] });
    }

    if (url.includes('/api/v1/config/settings')) {
      return json({ max_retries: 5, ban_time_min: 60, findtime_min: 10 });
    }

    if (url.includes('/api/v1/config/whitelist')) {
      return json({ whitelist: ['127.0.0.1'] });
    }

    if (url.includes('/api/v1/auth/status')) {
      return json({ is_initialized: true });
    }

    if (url.includes('/api/security/simulate-log')) {
      return json({
        message: 'procesado',
        log: '',
        event: {
          id: 'evt-1',
          epoch: Date.now(),
          ip: '203.0.113.5',
          user: 'root',
          port: 5000,
          eventType: 'FAILED_PASSWORD',
          actionTaken: 'RECORDED_FAILURE_PENDING',
          decisionSummary: 'registrado',
          failuresInWindowAfter: 1
        },
        banTriggered: false,
        failureCount: 1
      });
    }

    return json({});
  }) as typeof fetch;

  return state;
}

async function freshEngine() {
  vi.resetModules();
  const mod = await import('../src/services/securityEngine');
  return mod.securityEngine;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('unbanIp', () => {
  it('desbanea por Pub/Sub y verifica contra ufw', async () => {
    mockSecurityFlow();
    const engine = await freshEngine();
    await engine.refresh();

    const promise = engine.unbanIp('203.0.113.5', 'manual');
    await vi.advanceTimersByTimeAsync(5000);
    const res = await promise;

    expect(res.success).toBe(true);
    expect(res.message).toContain('eliminada y verificada');
    expect(engine.getUfwRules()).toHaveLength(0);
  });

  it('si la regla persiste, reintenta con el desbaneo directo', async () => {
    mockSecurityFlow({ rulePersistsAfterPubSub: true });
    const engine = await freshEngine();
    await engine.refresh();

    const promise = engine.unbanIp('203.0.113.5');
    await vi.advanceTimersByTimeAsync(8000);
    const res = await promise;

    expect(res.success).toBe(true);
    expect(res.message).toContain('DIRECTO');
  });

  it('informa si la IP sigue bloqueada en ufw', async () => {
    mockSecurityFlow({ rulePersistsAfterPubSub: true, ruleClearedAfterDirect: false });
    const engine = await freshEngine();
    await engine.refresh();

    const promise = engine.unbanIp('203.0.113.5');
    await vi.advanceTimersByTimeAsync(8000);
    const res = await promise;

    expect(res.success).toBe(false);
    expect(res.message).toContain('SIGUE bloqueada');
  });

  it('libera la IP también en fail2ban', async () => {
    mockSecurityFlow({ fail2banBanned: true });
    const engine = await freshEngine();
    await engine.refresh();

    expect(engine.getFail2banStatus().banned).toContain('203.0.113.5');

    const promise = engine.unbanIp('203.0.113.5');
    await vi.advanceTimersByTimeAsync(8000);
    const res = await promise;

    expect(res.success).toBe(true);
    expect(res.message).toContain('fail2ban');
    expect(engine.getFail2banStatus().banned).not.toContain('203.0.113.5');
  });

  it('informa el error si el backend rechaza la orden', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ detail: 'IP inválida' }), { status: 400 })
    ) as typeof fetch;
    const engine = await freshEngine();

    const res = await engine.unbanIp('203.0.113.5');

    expect(res.success).toBe(false);
    expect(res.message).toBe('IP inválida');
  });
});

describe('ingestSshLog', () => {
  it('devuelve el evento mapeado por el motor', async () => {
    mockSecurityFlow();
    const engine = await freshEngine();

    const res = await engine.ingestSshLog('Oct 30 sshd[1]: Failed password ...');

    expect(res.event).not.toBeNull();
    expect(res.event?.ip).toBe('203.0.113.5');
    expect(res.event?.verification?.actionTaken).toBe('RECORDED_FAILURE_PENDING');
  });

  it('devuelve null si la línea no es relevante', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ event: null, banTriggered: false }), { status: 200 })
    ) as typeof fetch;
    const engine = await freshEngine();

    const res = await engine.ingestSshLog('línea irrelevante');

    expect(res.event).toBeNull();
    expect(res.banTriggered).toBe(false);
  });

  it('devuelve null si el backend falla', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('sin conexión');
    }) as typeof fetch;
    const engine = await freshEngine();

    const res = await engine.ingestSshLog('línea');

    expect(res.event).toBeNull();
    expect(engine.getLastError()).toBeTruthy();
  });
});

describe('simulateAttack', () => {
  it('envía los intentos al motor real', async () => {
    mockSecurityFlow();
    const engine = await freshEngine();

    const promise = engine.simulateAttack({ ip: '203.0.113.5', attempts: 1, delayMs: 0 });
    await vi.advanceTimersByTimeAsync(1000);
    const res = await promise;

    expect(res.success).toBe(true);
    expect(res.message).toContain('203.0.113.5');
  });

  it('reporta cuando la simulación dispara el ban', async () => {
    mockSecurityFlow();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: any) => {
      const url = String(input);
      if (url.includes('/api/security/simulate-log')) {
        return new Response(
          JSON.stringify({
            message: 'procesado',
            event: { ip: '203.0.113.5', eventType: 'FAILED_PASSWORD' },
            banTriggered: true,
            failureCount: 5
          }),
          { status: 200 }
        );
      }
      return originalFetch(input);
    }) as typeof fetch;
    const engine = await freshEngine();

    const promise = engine.simulateAttack({ ip: '203.0.113.5', attempts: 1, delayMs: 0 });
    await vi.advanceTimersByTimeAsync(1000);
    const res = await promise;

    expect(res.message).toContain('bloqueada');
  });
});
