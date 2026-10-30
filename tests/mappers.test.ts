import { describe, it, expect } from 'vitest';
import {
  mapBannedIp,
  mapFailureRecord,
  mapPubSubMessage,
  mapLogEvent
} from '../src/services/api';
import { INITIAL_CONFIG } from '../src/data/presetData';

const config = INITIAL_CONFIG;
const geo = { country: 'Testlandia', countryCode: 'TL', city: 'Test', flag: '🏳️' };

describe('mapBannedIp', () => {
  it('mapea un registro completo de Redis', () => {
    const banned = mapBannedIp(
      {
        ip: '203.0.113.9',
        banned_at: 1000,
        expires_at: 2000,
        attempts: 5,
        last_user: 'root',
        reason: 'Fuerza bruta'
      },
      config
    );

    expect(banned.ip).toBe('203.0.113.9');
    expect(banned.bannedAt).toBe(1000);
    expect(banned.expiresAt).toBe(2000);
    expect(banned.attemptsCount).toBe(5);
    expect(banned.lastUser).toBe('root');
    expect(banned.reason).toBe('Fuerza bruta');
    expect(banned.status).toBe('banned');
    expect(banned.ufwRule).toContain('ufw insert 1 deny from 203.0.113.9');
  });

  it('usa valores por defecto si faltan campos', () => {
    const banned = mapBannedIp({ ip: '10.0.0.1' }, config);

    expect(banned.attemptsCount).toBe(0);
    expect(banned.lastUser).toBe('desconocido');
    expect(banned.reason).toContain('Bloqueo aplicado');
    // expiresAt = bannedAt + ban_time_min
    expect(banned.expiresAt).toBeGreaterThan(banned.bannedAt);
  });
});

describe('mapFailureRecord', () => {
  it('convierte timestamps a números', () => {
    const record = mapFailureRecord({
      ip: '1.2.3.4',
      timestamps: ['100', '200'],
      firstSeen: '100',
      lastSeen: '200',
      totalAttempts: '2',
      targetedUsers: ['root']
    });

    expect(record.ip).toBe('1.2.3.4');
    expect(record.timestamps).toEqual([100, 200]);
    expect(record.totalAttempts).toBe(2);
    expect(record.targetedUsers).toEqual(['root']);
  });

  it('tolera registros vacíos', () => {
    const record = mapFailureRecord({ ip: '1.2.3.4' });

    expect(record.timestamps).toEqual([]);
    expect(record.totalAttempts).toBe(0);
  });
});

describe('mapPubSubMessage', () => {
  it('mapea un mensaje de pub/sub', () => {
    const message = mapPubSubMessage({
      id: 'p1',
      channel: 'channel:unban_events',
      sender: 'FastAPI_Service_1',
      payload: { action: 'UNBAN', ip: '1.2.3.4', timestamp: 500, reason: 'manual' }
    });

    expect(message.id).toBe('p1');
    expect(message.payload.action).toBe('UNBAN');
    expect(message.payload.ip).toBe('1.2.3.4');
    expect(message.payload.timestamp).toBe(500);
  });

  it('completa los valores faltantes', () => {
    const message = mapPubSubMessage({});

    expect(message.id).toContain('pubsub-');
    expect(message.channel).toBe('channel:unban_events');
    expect(message.payload.action).toBe('LOG_ALERT');
  });
});

describe('mapLogEvent', () => {
  it('mapea un fallo de password y arma el detalle de verificación', () => {
    const event = mapLogEvent(
      {
        id: 'log-1',
        timestamp: '2026-10-30 10:00:00',
        epoch: 1000,
        ip: '198.51.100.7',
        user: 'root',
        port: 5555,
        eventType: 'FAILED_PASSWORD',
        rawLog: 'sshd[1]: Failed password ...',
        actionTaken: 'RECORDED_FAILURE_PENDING',
        decisionSummary: 'Intento registrado',
        failuresInWindowAfter: 3,
        maxRetriesAllowed: 5
      },
      config,
      () => geo
    );

    expect(event.ip).toBe('198.51.100.7');
    expect(event.geo).toEqual(geo);
    expect(event.verification?.actionTaken).toBe('RECORDED_FAILURE_PENDING');
    expect(event.verification?.failuresInWindowAfter).toBe(3);
    expect(event.verification?.maxRetriesAllowed).toBe(5);
  });

  it('marca LOGGED_SUCCESS en accesos válidos', () => {
    const event = mapLogEvent(
      { ip: '10.0.0.2', user: 'sysadmin', eventType: 'ACCEPTED_KEY' },
      config
    );

    expect(event.verification?.actionTaken).toBe('LOGGED_SUCCESS');
    expect(event.service).toBe('sshd');
    expect(event.port).toBe(22);
  });

  it('marca DISCARDED_INFO en eventos informativos', () => {
    const event = mapLogEvent(
      { ip: '10.0.0.3', eventType: 'PREAUTH_DISCONNECT' },
      config
    );

    expect(event.verification?.actionTaken).toBe('DISCARDED_INFO');
  });

  it('usa la configuración como respaldo de ventana y umbral', () => {
    const event = mapLogEvent({ ip: '10.0.0.4', eventType: 'INVALID_USER' }, config);

    expect(event.verification?.windowMinutes).toBe(config.findtime_min);
    expect(event.verification?.maxRetriesAllowed).toBe(config.max_retries);
    expect(event.verification?.triggeredBan).toBe(false);
  });
});
