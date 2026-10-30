import { securityEngine } from '../services/securityEngine';
import { ApiEndpoint } from '../data/openApiSpec';

export interface EndpointResult {
  status?: number;
  data: unknown;
}

export interface HandlerContext {
  bodies: Record<string, string>;
  pathParams: Record<string, Record<string, string>>;
}

type Handler = (ctx: HandlerContext) => Promise<EndpointResult>;

const parseBody = (bodies: Record<string, string>, id: string): Record<string, unknown> =>
  JSON.parse(bodies[id] || '{}');

const ok = (data: unknown): EndpointResult => ({ data });
const withStatus = (ok: boolean, successStatus: number, data: unknown): EndpointResult => ({
  status: ok ? successStatus : 400,
  data
});

/** Handlers individuales del playground (uno por endpoint). */
const HANDLERS: Record<string, Handler> = {
  'get-health': async () =>
    ok({
      status: 'healthy',
      service: 'FastAPI Management Service (Framework A)',
      redis_connected: true,
      timestamp: new Date().toISOString()
    }),

  'get-settings': async () => ok(securityEngine.getConfig()),

  'put-settings': async ({ bodies }) => {
    await securityEngine.updateConfig(parseBody(bodies, 'put-settings'));
    return ok({ message: 'Settings updated in Redis config:settings', data: securityEngine.getConfig() });
  },

  'get-whitelist': async () =>
    ok({ whitelist: securityEngine.getWhitelist(), immutable_safeguard: '127.0.0.1' }),

  'post-whitelist': async ({ bodies }) => {
    const res = await securityEngine.addToWhitelist(String(parseBody(bodies, 'post-whitelist').ip));
    return withStatus(res.success, 200, { message: res.message });
  },

  'delete-whitelist': async ({ pathParams }) => {
    const ip = pathParams['delete-whitelist']?.ip || '192.168.1.150';
    const res = await securityEngine.removeFromWhitelist(ip);
    return {
      status: res.success ? 200 : 403,
      data: res.success ? { message: res.message } : { detail: res.message }
    };
  },

  'post-unban': async ({ bodies }) => {
    const body = parseBody(bodies, 'post-unban');
    const res = await securityEngine.unbanIp(String(body.ip), String(body.reason ?? ''));
    return ok({
      message: res.message,
      subscribers_notified: 1,
      redis_pubsub_channel: 'channel:unban_events'
    });
  },

  'get-banned-ips': async () => {
    const banned = securityEngine.getBannedIps();
    return ok({ banned_count: banned.length, banned_ips: banned });
  },

  'post-ingest-log': async ({ bodies }) => {
    const res = await securityEngine.ingestSshLog(String(parseBody(bodies, 'post-ingest-log').raw_log));
    return ok({ parsed: !!res.event, event: res.event, ban_triggered: res.banTriggered });
  },

  'post-login': async ({ bodies }) => {
    const body = parseBody(bodies, 'post-login');
    const res = await securityEngine.login(String(body.username ?? ''), String(body.password ?? ''));
    return {
      status: res.success ? 200 : 401,
      data: res.success
        ? { access_token: res.token, token_type: 'bearer', expires_in: 86400, message: res.message }
        : { detail: res.message }
    };
  },

  'post-setup-admin': async ({ bodies }) => {
    const body = parseBody(bodies, 'post-setup-admin');
    const res = await securityEngine.registerInitialAdmin(
      String(body.username ?? ''),
      String(body.email ?? ''),
      String(body.password ?? '')
    );
    return withStatus(res.success, 201, res.success ? { message: res.message } : { detail: res.message });
  },

  'post-reset-token': async ({ bodies }) => {
    const res = await securityEngine.requestPasswordReset(
      String(parseBody(bodies, 'post-reset-token').email ?? '')
    );
    return {
      status: res.success ? 200 : 404,
      data: res.success
        ? {
            status: 'success',
            message: res.message,
            reset_token: res.token,
            expires_in_seconds: res.ttlSeconds,
            redis_key: `auth:reset_token:${res.token}`
          }
        : { detail: res.message }
    };
  },

  'post-reset-confirm': async ({ bodies }) => {
    const body = parseBody(bodies, 'post-reset-confirm');
    const res = await securityEngine.completePasswordReset(
      String(body.token ?? ''),
      String(body.new_password ?? '')
    );
    return withStatus(res.success, 200, res.success ? { message: res.message } : { detail: res.message });
  }
};

/** Ejecuta el endpoint pedido contra el motor real. */
export async function runEndpoint(
  endpoint: ApiEndpoint,
  ctx: HandlerContext
): Promise<EndpointResult> {
  const handler = HANDLERS[endpoint.id];
  if (!handler) {
    return { data: endpoint.responses['200']?.example || { ok: true } };
  }
  return handler(ctx);
}
