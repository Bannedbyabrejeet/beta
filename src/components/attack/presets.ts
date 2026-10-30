import { EventType } from '../../types';

export type PresetId = 'bruteforce' | 'whitelist' | 'dictionary' | 'success';

export interface AttackParams {
  ip: string;
  user: string;
  attempts: number;
  type: EventType;
}

export interface AttackPreset {
  id: PresetId;
  title: string;
  subtitle: string;
  /** clases del título (color por escenario) */
  titleClass: string;
  /** clases del borde al hacer hover */
  hoverClass: string;
}

/** Escenarios predefinidos del simulador. */
export const ATTACK_PRESETS: AttackPreset[] = [
  {
    id: 'bruteforce',
    title: 'Fuerza Bruta',
    subtitle: '5 fallos en root',
    titleClass: 'text-rose-400',
    hoverClass: 'hover:border-rose-500/50'
  },
  {
    id: 'whitelist',
    title: 'Test Whitelist',
    subtitle: '127.0.0.1 exenta',
    titleClass: 'text-teal-400',
    hoverClass: 'hover:border-teal-500/50'
  },
  {
    id: 'dictionary',
    title: 'Diccionario',
    subtitle: 'Usuarios inválidos',
    titleClass: 'text-amber-400',
    hoverClass: 'hover:border-amber-500/50'
  },
  {
    id: 'success',
    title: 'Key Aceptada',
    subtitle: 'Acceso legítimo',
    titleClass: 'text-emerald-400',
    hoverClass: 'hover:border-emerald-500/50'
  }
];

/** Devuelve los parámetros de ataque para un escenario. */
export function resolvePreset(id: PresetId): AttackParams {
  switch (id) {
    case 'bruteforce':
      return { ip: '198.51.100.42', user: 'root', attempts: 5, type: 'FAILED_PASSWORD' };
    case 'whitelist':
      return { ip: '127.0.0.1', user: 'admin', attempts: 6, type: 'FAILED_PASSWORD' };
    case 'dictionary':
      return {
        ip: `45.33.32.${Math.floor(Math.random() * 200) + 10}`,
        user: 'postgres',
        attempts: 6,
        type: 'INVALID_USER'
      };
    default:
      return { ip: '10.0.0.15', user: 'sysadmin', attempts: 1, type: 'ACCEPTED_KEY' };
  }
}

/** Parámetros iniciales del formulario. */
export const INITIAL_PARAMS: AttackParams = {
  ip: '185.220.101.5',
  user: 'root',
  attempts: 5,
  type: 'FAILED_PASSWORD'
};
