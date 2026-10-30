import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockApi } from './helpers/mockApi';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

/**
 * Simula el motor real: arma un evento según la línea de log recibida,
 * para poder validar la suite de aceptación del Issue #7.
 */
function mockIssue7Flow() {
  const base = globalThis.fetch;

  globalThis.fetch = vi.fn(async (input: any, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes('/api/security/simulate-log')) {
      return base(input, init);
    }

    const body = JSON.parse(String(init?.body || '{}'));
    const line: string = body.log_line || '';
    const ip = (line.match(/from (\d+\.\d+\.\d+\.\d+)/) || [])[1] || '0.0.0.0';
    const isAccepted = line.includes('Accepted');
    const isWhitelisted = ip === '127.0.0.1';

    const actionTaken = isAccepted
      ? 'LOGGED_SUCCESS'
      : isWhitelisted
        ? 'IGNORED_WHITELIST'
        : 'RECORDED_FAILURE_PENDING';

    return json({
      message: 'procesado',
      log: line,
      event: {
        id: `evt-${ip}`,
        epoch: Date.now(),
        ip,
        user: 'root',
        port: 22,
        eventType: isAccepted ? 'ACCEPTED_KEY' : 'FAILED_PASSWORD',
        actionTaken,
        isWhitelisted,
        decisionSummary: 'ok',
        failuresInWindowAfter: 1
      },
      banTriggered: false,
      failureCount: 1
    });
  }) as typeof fetch;
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

describe('runIssue7AcceptanceTests', () => {
  it('ejecuta las 4 pruebas contra el motor y las aprueba', async () => {
    mockApi();
    mockIssue7Flow();
    const engine = await freshEngine();
    await engine.refresh();

    const updates: number[] = [];
    const promise = engine.runIssue7AcceptanceTests(tests => updates.push(tests.length));
    await vi.advanceTimersByTimeAsync(15000);
    const results = await promise;

    expect(results).toHaveLength(4);
    expect(updates.length).toBeGreaterThanOrEqual(4);
    expect(results.map(r => r.status)).toEqual(['PASSED', 'PASSED', 'PASSED', 'PASSED']);
    expect(results[2].consoleOutput.join(' ')).toContain('127.0.0.1');
  });

  it('funciona sin callback de progreso', async () => {
    mockApi();
    mockIssue7Flow();
    const engine = await freshEngine();
    await engine.refresh();

    const promise = engine.runIssue7AcceptanceTests();
    await vi.advanceTimersByTimeAsync(15000);
    const results = await promise;

    expect(results.every(r => r.status !== 'IDLE')).toBe(true);
  });
});
