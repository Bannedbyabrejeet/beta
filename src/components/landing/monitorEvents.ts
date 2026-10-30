export interface MonitorEvent {
  type: 'info' | 'warn' | 'metric' | 'alert' | 'exec' | 'success' | 'redis';
  text: string;
}

/** Secuencia que simula el monitor SOC. */
export const MONITOR_EVENTS: MonitorEvent[] = [
  { type: 'info', text: '[SECURITY FEED] Monitoreo perimetral activo en interfaces de red expuestas' },
  { type: 'info', text: '[TELEMETRY] Sensor de análisis de comportamiento inicializado' },
  { type: 'warn', text: '[ALERT] Detección de múltiples intentos fallidos de autenticación (origen externo)' },
  { type: 'metric', text: '⚡ [HEURÍSTICA] Patrón anómalo de fuerza bruta identificado: umbral superado' },
  { type: 'alert', text: '🚨 [AMENAZA CRÍTICA] Ataque de diccionario en curso bloqueado por regla perimetral' },
  { type: 'exec', text: '>>> [MITIGACIÓN KERNEL] Filtrado a nivel de paquetes activado en 0.18ms' },
  { type: 'success', text: '✔ [ESTADO DE DEFENSA] Tráfico malicioso descartado automáticamente (DROP silencioso)' },
  { type: 'redis', text: '📦 [CLUSTER SYNC] Penalización temporal registrada con expiración automática (TTL)' }
];
