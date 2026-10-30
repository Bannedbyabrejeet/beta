/**
 * Valores de ejemplo para los campos sensibles del OpenAPI.
 * Se usan variables para no dejar credenciales escritas en el repositorio.
 */
const EXAMPLE_CREDENTIAL = '';
const EXAMPLE_TOKEN = '';

export interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  summary: string;
  description: string;
  tags: string[];
  service: 'FastAPI (Framework A)' | 'Express / Engine (Framework B)';
  parameters?: Array<{
    name: string;
    in: 'query' | 'path' | 'header';
    required: boolean;
    type: string;
    description: string;
    default?: string;
  }>;
  requestBody?: {
    contentType: string;
    example: unknown;
    schema: unknown;
  };
  responses: Record<string, {
    description: string;
    example: unknown;
  }>;
}

export const OPENAPI_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'get-health',
    path: '/api/v1/health',
    method: 'GET',
    summary: 'Health Check & Conectividad Redis',
    description: 'Verifica el estado del servicio FastAPI y el ping a la base de datos Redis en memoria.',
    tags: ['System Health'],
    service: 'FastAPI (Framework A)',
    responses: {
      '200': {
        description: 'Servicio operando normalmente',
        example: {
          status: 'healthy',
          service: 'FastAPI Management Service (Framework A)',
          redis_connected: true,
          timestamp: '2026-08-26T14:35:10.120Z'
        }
      }
    }
  },
  {
    id: 'get-settings',
    path: '/api/v1/config/settings',
    method: 'GET',
    summary: 'Obtener Parámetros de Bloqueo',
    description: 'Lee los parámetros del hash `config:settings` en Redis (max_retries, ban_time_min, findtime_min).',
    tags: ['Configuration'],
    service: 'FastAPI (Framework A)',
    responses: {
      '200': {
        description: 'Configuración recuperada de Redis',
        example: {
          max_retries: 5,
          ban_time_min: 60,
          findtime_min: 10,
          auto_unban_enabled: true
        }
      }
    }
  },
  {
    id: 'put-settings',
    path: '/api/v1/config/settings',
    method: 'PUT',
    summary: 'Actualizar Parámetros de Baneo',
    description: 'Actualiza los umbrales de reintentos y tiempos de penalización en Redis `config:settings`.',
    tags: ['Configuration'],
    service: 'FastAPI (Framework A)',
    requestBody: {
      contentType: 'application/json',
      example: {
        max_retries: 5,
        ban_time_min: 120,
        findtime_min: 15
      },
      schema: {
        type: 'object',
        properties: {
          max_retries: { type: 'integer', minimum: 1, maximum: 50 },
          ban_time_min: { type: 'integer', minimum: 1, maximum: 10080 },
          findtime_min: { type: 'integer', minimum: 1, maximum: 1440 }
        }
      }
    },
    responses: {
      '200': {
        description: 'Parámetros actualizados con éxito',
        example: {
          message: 'Settings updated in Redis config:settings',
          data: { max_retries: 5, ban_time_min: 120, findtime_min: 15 }
        }
      }
    }
  },
  {
    id: 'get-whitelist',
    path: '/api/v1/config/whitelist',
    method: 'GET',
    summary: 'Consultar Lista Blanca (Whitelist)',
    description: 'Retorna el conjunto (Set) `config:whitelist` en Redis garantizando la persistencia de 127.0.0.1.',
    tags: ['Whitelist'],
    service: 'FastAPI (Framework A)',
    responses: {
      '200': {
        description: 'Lista de IPs y subredes exentas de baneo',
        example: {
          whitelist: ['127.0.0.1', '::1', '192.168.1.0/24', '10.0.0.15'],
          immutable_safeguard: '127.0.0.1'
        }
      }
    }
  },
  {
    id: 'post-whitelist',
    path: '/api/v1/config/whitelist',
    method: 'POST',
    summary: 'Agregar IP a la Whitelist',
    description: 'Inserta una nueva dirección IP o bloque CIDR en el Set de Redis `config:whitelist`.',
    tags: ['Whitelist'],
    service: 'FastAPI (Framework A)',
    requestBody: {
      contentType: 'application/json',
      example: { ip: '192.168.1.150' },
      schema: {
        type: 'object',
        required: ['ip'],
        properties: { ip: { type: 'string' } }
      }
    },
    responses: {
      '200': {
        description: 'IP agregada a la lista blanca',
        example: { message: 'IP 192.168.1.150 added to whitelist' }
      }
    }
  },
  {
    id: 'delete-whitelist',
    path: '/api/v1/config/whitelist/{ip}',
    method: 'DELETE',
    summary: 'Eliminar IP de la Whitelist',
    description: 'Remueve una IP de `config:whitelist`. Rechaza con HTTP 403 si se intenta remover 127.0.0.1.',
    tags: ['Whitelist'],
    service: 'FastAPI (Framework A)',
    parameters: [
      {
        name: 'ip',
        in: 'path',
        required: true,
        type: 'string',
        description: 'Dirección IP a remover'
      }
    ],
    responses: {
      '200': {
        description: 'IP removida',
        example: { message: 'IP 192.168.1.150 removed from whitelist' }
      },
      '403': {
        description: 'Acción prohibida para IPs de protección del sistema',
        example: { detail: 'Cannot remove local loopback safeguard 127.0.0.1' }
      }
    }
  },
  {
    id: 'post-unban',
    path: '/api/v1/security/unban',
    method: 'POST',
    summary: 'Desbanear IP vía Redis Pub/Sub',
    description: 'Publica mensaje en `channel:unban_events` para que el Servicio 2 (Node.js/Express) elimine la regla de UFW.',
    tags: ['Security Engine Bridge'],
    service: 'FastAPI (Framework A)',
    requestBody: {
      contentType: 'application/json',
      example: { ip: '198.51.100.42', reason: 'Verified administrative access' },
      schema: {
        type: 'object',
        required: ['ip'],
        properties: {
          ip: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    },
    responses: {
      '200': {
        description: 'Evento de desbaneo emitido',
        example: {
          message: 'Unban order published to channel:unban_events for IP 198.51.100.42',
          subscribers_notified: 1
        }
      }
    }
  },
  {
    id: 'get-banned-ips',
    path: '/api/security/banned',
    method: 'GET',
    summary: 'Consultar IPs Activas en UFW',
    description: 'Devuelve todas las IPs actualmente bloqueadas con sus timestamps de expiración y regla UFW.',
    tags: ['Security Engine'],
    service: 'Express / Engine (Framework B)',
    responses: {
      '200': {
        description: 'Listado de sanciones activas',
        example: {
          banned_count: 2,
          banned_ips: [
            {
              ip: '198.51.100.42',
              banned_at: 1724682121000,
              expires_at: 1724685721000,
              attempts: 5,
              ufw_rule: 'ufw insert 1 deny from 198.51.100.42 to any port 22 comment \'bannedbyabrejeet:ssh\''
            }
          ]
        }
      }
    }
  },
  {
    id: 'post-ingest-log',
    path: '/api/security/ingest-log',
    method: 'POST',
    summary: 'Ingestar Línea de Log SSH (Simulación)',
    description: 'Ejecuta el parser regex contra una línea de syslog SSH e interactúa con Redis y UFW.',
    tags: ['Security Engine'],
    service: 'Express / Engine (Framework B)',
    requestBody: {
      contentType: 'application/json',
      example: {
        raw_log: 'Aug 26 14:38:00 edge-gateway-01 sshd[21040]: Failed password for root from 185.220.101.5 port 44321 ssh2'
      },
      schema: {
        type: 'object',
        required: ['raw_log'],
        properties: { raw_log: { type: 'string' } }
      }
    },
    responses: {
      '200': {
        description: 'Log procesado y evaluado',
        example: {
          parsed: true,
          ip: '185.220.101.5',
          event: 'FAILED_PASSWORD',
          user: 'root',
          current_attempts: 1,
          threshold_reached: false
        }
      }
    }
  },
  {
    id: 'post-login',
    path: '/api/v1/auth/login',
    method: 'POST',
    summary: 'Inicio de Sesión de Administrador (US-01 / BACK1-01)',
    description: 'Valida credenciales contra `auth:admin` en Redis con bcrypt. Si falla, retorna HTTP 401 con mensaje estricto `Credenciales inválidas`.',
    tags: ['Authentication'],
    service: 'FastAPI (Framework A)',
    requestBody: {
      contentType: 'application/json',
      example: { username: 'admin', password: EXAMPLE_CREDENTIAL },
      schema: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      }
    },
    responses: {
      '200': {
        description: 'Autenticación exitosa',
        example: {
          access_token: EXAMPLE_TOKEN,
          token_type: 'bearer',
          expires_in: 86400
        }
      },
      '401': {
        description: 'Error de credenciales',
        example: { detail: 'Credenciales inválidas' }
      }
    }
  },
  {
    id: 'post-setup-admin',
    path: '/api/v1/auth/setup',
    method: 'POST',
    summary: 'Creación de Cuenta Única de Administrador (US-01.2)',
    description: 'Si no existe ningún administrador en Redis (`auth:admin`), crea el usuario principal con contraseña cifrada con salt bcrypt. Rechaza si ya existe.',
    tags: ['Authentication'],
    service: 'FastAPI (Framework A)',
    requestBody: {
      contentType: 'application/json',
      example: { username: 'admin', email: 'admin@bannedbyabrejeet.io', password: EXAMPLE_CREDENTIAL },
      schema: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' }
        }
      }
    },
    responses: {
      '201': {
        description: 'Cuenta creada exitosamente en Redis',
        example: { message: 'Admin user created successfully' }
      },
      '400': {
        description: 'Cuenta única ya configurada',
        example: { detail: 'Acción denegada: Ya existe una cuenta de Administrador única registrada en Redis (auth:admin).' }
      }
    }
  },
  {
    id: 'post-reset-token',
    path: '/api/v1/auth/forgot-password',
    method: 'POST',
    summary: 'Solicitud de Restauración de Contraseña (US-01.3 & US-10)',
    description: 'Genera un token temporal en Redis (`auth:reset_token:<TOKEN>`) con comando `EXPIRE` a 900 segundos y simula envío de correo transaccional.',
    tags: ['Authentication'],
    service: 'FastAPI (Framework A)',
    requestBody: {
      contentType: 'application/json',
      example: { email: 'admin@bannedbyabrejeet.io' },
      schema: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string' } }
      }
    },
    responses: {
      '200': {
        description: 'Token generado en Redis con TTL estricto de 15 minutos',
        example: {
          status: 'success',
          message: 'Correo de recuperación enviado con éxito. Token volátil persistido en Redis con EXPIRE 900.',
          reset_token: EXAMPLE_TOKEN,
          expires_in_seconds: 900,
          redis_key: `auth:reset_token:${EXAMPLE_TOKEN}`
        }
      },
      '404': {
        description: 'Correo no registrado',
        example: { detail: 'El correo electrónico ingresado no coincide con el Administrador registrado en el sistema.' }
      }
    }
  },
  {
    id: 'post-reset-confirm',
    path: '/api/v1/auth/reset-password',
    method: 'POST',
    summary: 'Confirmación de Nueva Contraseña con Token Volátil (US-01.3 & US-10)',
    description: 'Valida existencia y TTL del token en Redis. Si es válido, actualiza el hash de contraseña en `auth:admin`, invalida el token con `DEL` y retorna confirmación.',
    tags: ['Authentication'],
    service: 'FastAPI (Framework A)',
    requestBody: {
      contentType: 'application/json',
      example: { token: EXAMPLE_TOKEN, new_password: EXAMPLE_CREDENTIAL },
      schema: {
        type: 'object',
        required: ['token', 'new_password'],
        properties: {
          token: { type: 'string' },
          new_password: { type: 'string' }
        }
      }
    },
    responses: {
      '200': {
        description: 'Contraseña actualizada correctamente',
        example: { message: 'Contraseña actualizada correctamente' }
      },
      '400': {
        description: 'Token inválido o expirado en Redis (TTL superado)',
        example: { detail: 'El enlace de recuperación ha caducado o no es válido' }
      }
    }
  }
];
