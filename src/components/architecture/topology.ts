import { Server, Terminal, Database, Flame, type LucideIcon } from 'lucide-react';

export interface TopologyNode {
  badge: string;
  badgeClass: string;
  icon: LucideIcon;
  iconClass: string;
  title: string;
  items: string[];
  footer: string;
  footerClass: string;
  cardClass: string;
}

/**
 * Nodos del diagrama de topología.
 * Antes eran 4 bloques de JSX casi idénticos; ahora son datos.
 */
export const TOPOLOGY_NODES: TopologyNode[] = [
  {
    badge: 'Reverse Proxy',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    icon: Server,
    iconClass: 'text-cyan-400',
    title: 'Nginx Proxy',
    items: ['• :80 / :443 Ingress', '• Microfrontends A/B', '• Enrutador API REST'],
    footer: 'bannedbyabrejeet_proxy',
    footerClass: 'text-cyan-300',
    cardClass: 'border-white/10 hover:border-cyan-400/50 transition-all'
  },
  {
    badge: 'Servicio 1 (REST API)',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: Terminal,
    iconClass: 'text-emerald-400',
    title: 'FastAPI Python',
    items: ['• JWT Auth (Bcrypt)', '• Reset TTL Tokens', '• OpenAPI Swagger', '• Publicador Pub/Sub'],
    footer: ':8000 (FastAPI Service)',
    footerClass: 'text-emerald-300',
    cardClass: 'border-white/10 hover:border-emerald-400/50 transition-all'
  },
  {
    badge: 'Database / PubSub',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    icon: Database,
    iconClass: 'text-amber-400',
    title: 'Redis 7.2 Alpine',
    items: [
      '• Hash: config:settings',
      '• Set: config:whitelist',
      '• TTL: ip:failures:<IP>',
      '• PubSub: unban_events'
    ],
    footer: ':6379 (In-Memory Engine)',
    footerClass: 'text-amber-300',
    cardClass: 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]'
  },
  {
    badge: 'Servicio 2 (Engine)',
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    icon: Flame,
    iconClass: 'text-rose-400',
    title: 'Express Security Engine',
    items: ['• CAP_NET_ADMIN', '• /var/log/auth.log tail', '• ufw deny ejecutor', '• Suscriptor channel:unban'],
    footer: 'network_mode: host + UFW',
    footerClass: 'text-rose-300',
    cardClass: 'border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.05)]'
  }
];
