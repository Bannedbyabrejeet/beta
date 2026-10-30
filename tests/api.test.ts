import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { backendA, backendB, ApiError, API_A, API_B } from '../src/services/api';
import { mockApi } from './helpers/mockApi';

let calls: Array<{ url: string; init?: RequestInit }> = [];

beforeEach(() => {
  calls = mockApi();
});

afterEach(() => {
  calls = [];
});

describe('backendA', () => {
  it('pega al health', async () => {
    const res = await backendA.health();
    expect(res.status).toBe('healthy');
    expect(res.redis_connected).toBe(true);
    expect(calls[0].url).toBe(`${API_A}/health`);
  });

  it('lee la configuración y la whitelist', async () => {
    await backendA.getSettings();
    await backendA.getWhitelist();

    expect(calls[0].url).toBe(`${API_A}/config/settings`);
    expect(calls[1].url).toBe(`${API_A}/config/whitelist`);
  });

  it('actualiza la configuración con PUT', async () => {
    await backendA.updateSettings({ max_retries: 3 });

    expect(calls[0].url).toBe(`${API_A}/config/settings`);
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ max_retries: 3 });
  });

  it('agrega y quita de la whitelist', async () => {
    await backendA.addToWhitelist('10.0.0.9');
    await backendA.removeFromWhitelist('10.0.0.9');

    expect(calls[0].init?.method).toBe('POST');
    expect(calls[1].init?.method).toBe('DELETE');
    expect(calls[1].url).toBe(`${API_A}/config/whitelist/10.0.0.9`);
  });

  it('consulta el estado de autenticación', async () => {
    await backendA.authStatus();
    expect(calls[0].url).toBe(`${API_A}/auth/status`);
  });

  it('hace login, setup y reset', async () => {
    await backendA.login('admin', 'admin123');
    await backendA.setupAdmin('admin', 'a@b.c', 'admin123');
    await backendA.forgotPassword('a@b.c');
    await backendA.resetPassword('tok', 'nueva123');

    expect(calls.map(c => c.url)).toEqual([
      `${API_A}/auth/login`,
      `${API_A}/auth/setup`,
      `${API_A}/auth/forgot-password`,
      `${API_A}/auth/reset-password`
    ]);
  });

  it('publica el desbaneo y lee el estado de seguridad', async () => {
    const unban = await backendA.triggerUnban('1.2.3.4', 'manual');
    await backendA.getSecurityState();

    expect(unban.subscribers_notified).toBe(1);
    expect(JSON.parse(String(calls[0].init?.body)).ip).toBe('1.2.3.4');
    expect(JSON.parse(String(calls[0].init?.body)).reason).toBe('manual');
    expect(calls[1].url).toBe(`${API_A}/security/state`);
  });

  it('usa un motivo por defecto si no se indica', async () => {
    await backendA.triggerUnban('1.2.3.4');
    expect(JSON.parse(String(calls[0].init?.body)).reason).toContain('Manual unban authorized');
  });
});

describe('backendB', () => {
  it('consulta health, ufw y fail2ban', async () => {
    await backendB.health();
    await backendB.getUfwRules();
    await backendB.getFail2ban();

    expect(calls[0].url).toBe(`${API_B}/health`);
    expect(calls[1].url).toBe(`${API_B}/ufw-rules`);
    expect(calls[2].url).toBe(`${API_B}/fail2ban`);
  });

  it('lee logs, baneos, fallos y pub/sub', async () => {
    await backendB.getLogs();
    await backendB.getBanned();
    await backendB.getFailures();
    await backendB.getPubSub();

    expect(calls.map(c => c.url)).toEqual([
      `${API_B}/logs`,
      `${API_B}/banned`,
      `${API_B}/failures`,
      `${API_B}/pubsub`
    ]);
  });

  it('envía una línea de log al motor', async () => {
    await backendB.simulateLog('linea de prueba');

    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ log_line: 'linea de prueba' });
  });

  it('desbanea directo y en fail2ban', async () => {
    await backendB.unban('1.2.3.4');
    await backendB.unbanFail2ban('1.2.3.4');

    expect(calls[0].url).toBe(`${API_B}/unban`);
    expect(calls[1].url).toBe(`${API_B}/fail2ban/unban`);
  });

  it('consulta estadísticas', async () => {
    await backendB.getStats();
    expect(calls[0].url).toBe(`${API_B}/stats`);
  });
});

describe('manejo de errores', () => {
  it('lanza ApiError con el detalle del backend', async () => {
    mockApi({ 'GET /api/v1/config/whitelist': { detail: 'IP inválida' } }, {
      statuses: { 'GET /api/v1/config/whitelist': 400 }
    });

    await expect(backendA.getWhitelist()).rejects.toBeInstanceOf(ApiError);
    await expect(backendA.getWhitelist()).rejects.toThrow('IP inválida');
  });

  it('lanza ApiError con status 0 si no hay conexión', async () => {
    mockApi({}, { failAll: true });

    const error = await backendA.health().catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).message).toContain('No hay conexión');
  });

  it('usa un mensaje genérico si el backend no envía detalle', async () => {
    mockApi({ 'GET /api/v1/health': null }, { statuses: { 'GET /api/v1/health': 500 } });

    await expect(backendA.health()).rejects.toThrow('Error HTTP 500');
  });
});
