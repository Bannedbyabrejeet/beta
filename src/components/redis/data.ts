/** Sesión de redis-cli que se muestra como evidencia (sin credenciales reales). */
export const CLI_COMMANDS = `# 1. Conexión interactiva al contenedor Dockerizado
docker exec -it beta-redis redis-cli -a $REDIS_PASSWORD

# 2. Verificación de Liveness
127.0.0.1:6379> PING
PONG

# 3. Comprobar Persistencia AOF (Append-Only File)
127.0.0.1:6379> CONFIG GET appendonly
1) "appendonly"
2) "yes"

# 4. Comprobar Snapshots Periódicos RDB a Disco
127.0.0.1:6379> CONFIG GET save
1) "save"
2) "900 1 300 10 60 10000"

# 5. Comprobar Directorio del Volumen Montado (redis_data:/data)
127.0.0.1:6379> CONFIG GET dir
1) "dir"
2) "/data"

# 6. Inspección de Persistencia en Tiempo Real
127.0.0.1:6379> INFO persistence
# Persistence
loading:0
rdb_changes_since_last_save:0
rdb_bgsave_in_progress:0
rdb_last_save_time:1756972800
rdb_last_bgsave_status:ok
aof_enabled:1
aof_rewrite_in_progress:0
aof_current_size:1048576
aof_base_size:1048576

# 7. Inspección de Redis Streams de Desbaneo
127.0.0.1:6379> XINFO STREAM stream:unban_orders
 1) "length"
 2) (integer) 1
 3) "radix-tree-keys"
 4) (integer) 1
 5) "last-generated-id"
 6) "1756972805120-0"
 7) "groups"
 8) (integer) 1`;

export interface SchemaItem {
  namespace: string;
  type: string;
  owner: string;
  ttl: string;
  desc: string;
  example: string;
}

/** Esquema de claves acordado entre los dos servicios. */
export const SCHEMA_ITEMS: SchemaItem[] = [
  {
    namespace: 'auth:admin',
    type: 'Hash',
    owner: 'Servicio 1 (FastAPI)',
    ttl: 'Persistente (AOF/RDB)',
    desc: 'Almacenamiento de credenciales maestras: username, email, password_hash (bcrypt) y fecha de creación.',
    example: 'HSET auth:admin username "admin" password_hash "<bcrypt>"'
  },
  {
    namespace: 'auth:reset_token:<TOKEN>',
    type: 'String',
    owner: 'Servicio 1 (FastAPI)',
    ttl: '900s (15 min)',
    desc: 'Token seguro temporal para recuperación de acceso administrativo.',
    example: 'SETEX auth:reset_token:<TOKEN> 900 "admin"'
  },
  {
    namespace: 'config:settings',
    type: 'Hash',
    owner: 'Servicio 1 (FastAPI)',
    ttl: 'Persistente (AOF/RDB)',
    desc: 'Parámetros del firewall: max_retries, findtime_min, ban_time_min leídos por el Servicio 2.',
    example: 'HSET config:settings max_retries "5" findtime_min "10" ban_time_min "60"'
  },
  {
    namespace: 'config:whitelist',
    type: 'Set',
    owner: 'Servicio 1 (FastAPI)',
    ttl: 'Persistente (AOF/RDB)',
    desc: 'IPs y subredes exentas de sanción (amigos de la casa). 127.0.0.1 es inmutable.',
    example: 'SADD config:whitelist "192.168.220.123"'
  },
  {
    namespace: 'ip:failures:<IP>',
    type: 'List',
    owner: 'Servicio 2 (Express)',
    ttl: 'findtime_min (ej. 600s)',
    desc: 'Timestamps de intentos fallidos dentro de la ventana de tolerancia.',
    example: 'RPUSH ip:failures:203.0.113.9 1756972805120'
  },
  {
    namespace: 'ip:banned',
    type: 'Hash',
    owner: 'Servicio 2 (Express)',
    ttl: 'ban_time_min (ej. 3600s)',
    desc: 'Registro del baneo: IP, fecha, expiración, intentos y último usuario atacado.',
    example: 'HSET ip:banned 203.0.113.9 "{\\"attempts\\":5}"'
  },
  {
    namespace: 'channel:unban_events',
    type: 'Pub/Sub',
    owner: 'Ambos servicios',
    ttl: 'Efímero (no persiste)',
    desc: 'Canal desacoplado: FastAPI publica la orden y el Servicio 2 borra la regla de UFW.',
    example: 'PUBLISH channel:unban_events "{\\"action\\":\\"UNBAN\\",\\"ip\\":\\"203.0.113.9\\"}"'
  }
];
