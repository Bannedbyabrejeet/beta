import { Radio, FileCode2, Layers, Database, type LucideIcon } from 'lucide-react';
import { Tab } from '../../types';

export interface NavItem {
  /** id del botón (usado en tests E2E) */
  id: string;
  tab: Tab;
  label: string;
  icon: LucideIcon;
  activeClass: string;
  idleClass: string;
}

/**
 * Configuración de las pestañas de escritorio.
 * Tener los estilos acá evita repetir el mismo bloque 5 veces en el JSX.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'nav-tab-landing',
    tab: 'landing',
    label: 'Plataforma',
    icon: Radio,
    activeClass: 'bg-white/10 text-white shadow-sm border border-white/10',
    idleClass: 'text-slate-400 hover:text-white hover:bg-white/5'
  },
  {
    id: 'nav-tab-dashboard',
    tab: 'dashboard',
    label: 'Dashboard',
    icon: Radio,
    activeClass: 'bg-emerald-500/15 text-emerald-400 shadow-sm border border-emerald-500/30',
    idleClass: 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-transparent'
  },
  {
    id: 'nav-tab-swagger',
    tab: 'swagger',
    label: 'OpenAPI Docs',
    icon: FileCode2,
    activeClass: 'bg-cyan-500/15 text-cyan-400 shadow-sm border border-cyan-500/30',
    idleClass: 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent'
  },
  {
    id: 'nav-tab-architecture',
    tab: 'architecture',
    label: 'Arquitectura',
    icon: Layers,
    activeClass: 'bg-indigo-500/15 text-indigo-300 shadow-sm border border-indigo-500/30',
    idleClass: 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/20 border border-transparent'
  },
  {
    id: 'nav-tab-redis',
    tab: 'redis',
    label: 'Redis Streams & KV',
    icon: Database,
    activeClass: 'bg-amber-500/15 text-amber-300 shadow-sm border border-amber-500/30',
    idleClass: 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/20 border border-transparent'
  }
];

/** Ítems de la barra móvil (más compacta). */
export const MOBILE_ITEMS: Array<{ tab: Tab; label: string; activeClass: string }> = [
  { tab: 'landing', label: 'Plataforma', activeClass: 'text-emerald-400 font-semibold' },
  { tab: 'dashboard', label: 'Dashboard', activeClass: 'text-emerald-400 font-semibold' },
  { tab: 'swagger', label: 'Swagger', activeClass: 'text-cyan-400 font-semibold' },
  { tab: 'architecture', label: 'Docker', activeClass: 'text-indigo-400 font-semibold' },
  { tab: 'redis', label: 'Redis', activeClass: 'text-amber-400 font-semibold' }
];
