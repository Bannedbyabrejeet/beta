import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockApi } from './helpers/mockApi';

async function freshEngine() {
  vi.resetModules();
  const mod = await import('../src/services/securityEngine');
  return mod.securityEngine;
}

beforeEach(() => {
  mockApi();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('refresh', () => {
  it('descarga el estado real y marca el backend como online', async () => {
    const engine = await freshEngine();
    await engine.refresh();

    expect(engine.isOnline()).toBe(true);
    expect(engine.getLastError()).toBeNull();
    expect(engine.getConfig().max_retries).toBe(5);
    expect(engine.getWhitelist()).toEqual(['127.0.0.1', '::1']);
  });

  it('mapea las reglas de ufw', async () => {
    mockApi({
      'GET /api/security/ufw-rules': {
        active: true,
        rules: [
          { id: 1, action: 'DENY', fromIp: '203.0.113.5', toPort: 22, comment: 'x', active: true }
        ],
        raw: '',
        total: 1
      }
    });
    const engine = await freshEngine();
    await engine.refresh();

    const rules = engine.getUfwRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].fromIp).toBe('203.0.113.5');
    expect(rules[0].action).toBe('DENY');
  });

  it('mapea acciones ALLOW y valores por defecto', async () => {
    mockApi({
      'GET /api/security/ufw-rules': {
        active: true,
        rules: [{ action: 'ALLOW', toPort: 22 }],
        raw: '',
        total: 1
      }
    });
    const engine = await freshEngine();
    await engine.refresh();

    const rule = engine.getUfwRules()[0];
    expect(rule.action).toBe('ALLOW');
    expect(rule.fromIp).toBe('0.0.0.0/0');
  });

  it('marca offline y guarda el error si falla la red', async () => {
    mockApi({}, { failAll: true });
    const engine = await freshEngine();
    await engine.refresh();

    expect(engine.isOnline()).toBe(false);
    expect(engine.getLastError()).toBeTruthy();
  });

  it('propaga el estado de autenticación', async () => {
    mockApi({ 'GET /api/v1/auth/status': { is_initialized: false } });
    const engine = await freshEngine();
    await engine.refresh();

    expect(engine.getAdminUser().isConfigured).toBe(false);
  });
});

describe('polling', () => {
  it('arranca y detiene el refresco periódico', async () => {
    vi.useFakeTimers();
    const engine = await freshEngine();

    engine.startPolling(1000);
    await vi.advanceTimersByTimeAsync(2500);
    engine.stopPolling();
    // no debe lanzar ni dejar timers colgados
    expect(engine.isOnline()).toBe(true);
  });
});

describe('updateConfig', () => {
  it('persiste la configuración y refresca', async () => {
    const engine = await freshEngine();

    const res = await engine.updateConfig({ max_retries: 8 });

    expect(res.success).toBe(true);
    expect(res.message).toContain('config:settings');
  });

  it('informa el error del backend', async () => {
    mockApi({ 'PUT /api/v1/config/settings': { detail: 'Valor inválido' } }, {
      statuses: { 'PUT /api/v1/config/settings': 422 }
    });
    const engine = await freshEngine();

    const res = await engine.updateConfig({ max_retries: 99 });

    expect(res.success).toBe(false);
    expect(res.message).toBe('Valor inválido');
  });
});

describe('whitelist', () => {
  it('agrega una IP', async () => {
    const engine = await freshEngine();

    const res = await engine.addToWhitelist('10.0.0.7');

    expect(res.success).toBe(true);
    expect(res.message).toContain('10.0.0.7');
  });

  it('rechaza una IP vacía', async () => {
    const engine = await freshEngine();
    const res = await engine.addToWhitelist('   ');

    expect(res.success).toBe(false);
    expect(res.message).toBe('IP inválida');
  });

  it('informa el error al agregar', async () => {
    mockApi({ 'POST /api/v1/config/whitelist': { detail: 'IP duplicada' } }, {
      statuses: { 'POST /api/v1/config/whitelist': 400 }
    });
    const engine = await freshEngine();

    const res = await engine.addToWhitelist('10.0.0.7');
    expect(res.success).toBe(false);
    expect(res.message).toBe('IP duplicada');
  });

  it('no permite quitar el loopback', async () => {
    const engine = await freshEngine();
    const res = await engine.removeFromWhitelist('127.0.0.1');

    expect(res.success).toBe(false);
    expect(res.message).toContain('Auto-bloqueo');
  });

  it('quita una IP y refresca', async () => {
    const engine = await freshEngine();
    const res = await engine.removeFromWhitelist('10.0.0.7');

    expect(res.success).toBe(true);
    expect(res.message).toContain('removida');
  });

  it('informa el error al quitar', async () => {
    mockApi({ 'DELETE /api/v1/config/whitelist': { detail: 'No existe' } }, {
      statuses: { 'DELETE /api/v1/config/whitelist': 404 }
    });
    const engine = await freshEngine();

    const res = await engine.removeFromWhitelist('10.0.0.7');
    expect(res.success).toBe(false);
  });

  it('si la IP estaba baneada, la desbanea al agregarla', async () => {
    mockApi({
      'GET /api/v1/security/state': {
        banned: [{ ip: '10.0.0.7', banned_at: 1, expires_at: 2, attempts: 5 }],
        failures: [],
        logs: [],
        pubsub: [],
        ufw_ops: []
      }
    });
    const engine = await freshEngine();
    await engine.refresh();

    const res = await engine.addToWhitelist('10.0.0.7');

    expect(res.success).toBe(true);
  });
});

describe('getters', () => {
  it('devuelven copias del estado', async () => {
    const engine = await freshEngine();
    await engine.refresh();

    const logs = engine.getLogs();
    const failures = engine.getIpFailures();
    const pubsub = engine.getPubSubMessages();
    const ops = engine.getUfwOperations();
    const admin = engine.getAdminUser();

    expect(Array.isArray(logs)).toBe(true);
    expect(Array.isArray(failures)).toBe(true);
    expect(Array.isArray(pubsub)).toBe(true);
    expect(Array.isArray(ops)).toBe(true);
    expect(admin.username).toBe('admin');
    expect(engine.getFail2banStatus().installed).toBe(false);
  });
});
