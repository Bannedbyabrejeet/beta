import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('login', () => {
  it('autentica y guarda el token en localStorage', async () => {
    const engine = await freshEngine();
    const res = await engine.login('admin', 'admin123');

    expect(res.success).toBe(true);
    expect(res.token).toBe('jwt_session_test');
    expect(engine.getAdminUser().isAuthenticated).toBe(true);
    expect(localStorage.getItem('bbj_admin_token')).toBe('jwt_session_test');
  });

  it('devuelve credenciales inválidas si el backend rechaza', async () => {
    mockApi({ 'POST /api/v1/auth/login': { detail: 'Credenciales inválidas' } }, {
      statuses: { 'POST /api/v1/auth/login': 401 }
    });
    const engine = await freshEngine();

    const res = await engine.login('admin', 'mal');

    expect(res.success).toBe(false);
    expect(res.message).toBe('Credenciales inválidas');
    expect(engine.getAdminUser().isAuthenticated).toBe(false);
  });

  it('devuelve un mensaje genérico si falla la red', async () => {
    mockApi({}, { failAll: true });
    const engine = await freshEngine();

    const res = await engine.login('admin', 'admin123');

    expect(res.success).toBe(false);
    expect(res.message.length).toBeGreaterThan(0);
  });
});

describe('logout', () => {
  it('cierra la sesión y limpia el token', async () => {
    const engine = await freshEngine();
    await engine.login('admin', 'admin123');

    engine.logout();

    expect(engine.getAdminUser().isAuthenticated).toBe(false);
    expect(localStorage.getItem('bbj_admin_token')).toBeNull();
  });
});

describe('registerInitialAdmin', () => {
  it('crea la cuenta y la deja configurada', async () => {
    const engine = await freshEngine();

    const res = await engine.registerInitialAdmin('admin', 'ADMIN@Banned.io', 'admin123');

    expect(res.success).toBe(true);
    expect(engine.getAdminUser().isConfigured).toBe(true);
    expect(engine.getAdminUser().email).toBe('admin@bannedbyabrejeet.io');
  });

  it('informa el error si la cuenta ya existe', async () => {
    mockApi({ 'POST /api/v1/auth/setup': { detail: 'Ya existe un administrador' } }, {
      statuses: { 'POST /api/v1/auth/setup': 400 }
    });
    const engine = await freshEngine();

    const res = await engine.registerInitialAdmin('admin', 'a@b.c', 'x');

    expect(res.success).toBe(false);
    expect(res.message).toBe('Ya existe un administrador');
  });

  it('performInitialSetup delega en registerInitialAdmin', async () => {
    const engine = await freshEngine();
    await engine.performInitialSetup('admin', 'a@b.c');
    expect(engine.getAdminUser().isConfigured).toBe(true);
  });
});

describe('recuperación de contraseña', () => {
  it('emite un token con TTL y arma el correo', async () => {
    const engine = await freshEngine();

    const res = await engine.requestPasswordReset('ADMIN@banned.io');

    expect(res.success).toBe(true);
    expect(res.token).toBe('rst_test_token');
    expect(res.ttlSeconds).toBe(900);
    expect(res.emailItem?.to).toBe('admin@banned.io');
    expect(engine.getEmails()).toHaveLength(1);
  });

  it('rechaza un correo desconocido', async () => {
    mockApi({ 'POST /api/v1/auth/forgot-password': { detail: 'El correo no coincide' } }, {
      statuses: { 'POST /api/v1/auth/forgot-password': 404 }
    });
    const engine = await freshEngine();

    const res = await engine.requestPasswordReset('otro@mail.com');

    expect(res.success).toBe(false);
    expect(res.message).toBe('El correo no coincide');
  });

  it('valida el token recién emitido', async () => {
    const engine = await freshEngine();
    await engine.requestPasswordReset('admin@banned.io');

    const check = engine.checkResetTokenValid('rst_test_token');

    expect(check.valid).toBe(true);
    expect(check.ttlRemaining).toBeGreaterThan(0);
  });

  it('invalida un token desconocido', async () => {
    const engine = await freshEngine();
    expect(engine.checkResetTokenValid('no-existe').valid).toBe(false);
  });

  it('invalida un token expirado', async () => {
    const engine = await freshEngine();
    await engine.requestPasswordReset('admin@banned.io');
    engine.forceExpireResetToken();

    expect(engine.checkResetTokenValid('rst_test_token').valid).toBe(false);
  });

  it('cambia la contraseña con un token válido', async () => {
    const engine = await freshEngine();
    await engine.requestPasswordReset('admin@banned.io');

    const res = await engine.completePasswordReset('rst_test_token', 'nuevaClave123');

    expect(res.success).toBe(true);
    expect(res.message).toBe('Contraseña actualizada correctamente');
  });

  it('rechaza contraseñas demasiado cortas', async () => {
    const engine = await freshEngine();
    await engine.requestPasswordReset('admin@banned.io');

    const res = await engine.completePasswordReset('rst_test_token', 'ab');

    expect(res.success).toBe(false);
    expect(res.message).toContain('al menos 4 caracteres');
  });

  it('informa si el backend rechaza el reset', async () => {
    mockApi({ 'POST /api/v1/auth/reset-password': { detail: 'Token caducado' } }, {
      statuses: { 'POST /api/v1/auth/reset-password': 400 }
    });
    const engine = await freshEngine();
    await engine.requestPasswordReset('admin@banned.io');

    const res = await engine.completePasswordReset('rst_test_token', 'nuevaClave');

    expect(res.success).toBe(false);
    expect(res.message).toBe('Token caducado');
  });

  it('generatePasswordResetToken devuelve token y TTL', async () => {
    const engine = await freshEngine();
    const out = await engine.generatePasswordResetToken('admin@banned.io');

    expect(out.token).toBe('rst_test_token');
    expect(out.ttlSeconds).toBe(900);
  });

  it('resetToUnconfigured limpia la identidad', async () => {
    const engine = await freshEngine();
    engine.resetToUnconfigured();

    expect(engine.getAdminUser().isConfigured).toBe(false);
  });

  it('clearEmails vacía el buzón', async () => {
    const engine = await freshEngine();
    await engine.requestPasswordReset('admin@banned.io');
    engine.clearEmails();

    expect(engine.getEmails()).toHaveLength(0);
  });
});
