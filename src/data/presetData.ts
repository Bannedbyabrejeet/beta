import { SshLogEvent, BannedIp, SystemConfig } from '../types';

export const INITIAL_CONFIG: SystemConfig = {
  max_retries: 5,
  ban_time_min: 60,
  findtime_min: 10,
  auto_unban_enabled: true,
  ufw_enabled: true,
  log_source: '/var/log/auth.log',
  ssh_port: 22,
};

export const INITIAL_WHITELIST: string[] = [
  '127.0.0.1',
  '::1',
  '192.168.1.0/24',
  '10.0.0.15'
];

export const SAMPLE_GEO_MAP: Record<string, { country: string; countryCode: string; city: string; flag: string }> = {
  '198.51.100.42': { country: 'Russian Federation', countryCode: 'RU', city: 'Saint Petersburg', flag: '🇷🇺' },
  '185.220.101.5': { country: 'Germany', countryCode: 'DE', city: 'Frankfurt', flag: '🇩🇪' },
  '45.33.32.156': { country: 'United States', countryCode: 'US', city: 'Fremont', flag: '🇺🇸' },
  '218.92.0.102': { country: 'China', countryCode: 'CN', city: 'Jiangsu', flag: '🇨🇳' },
  '194.26.29.112': { country: 'Netherlands', countryCode: 'NL', city: 'Amsterdam', flag: '🇳🇱' },
  '103.149.28.13': { country: 'India', countryCode: 'IN', city: 'Mumbai', flag: '🇮🇳' },
  '179.43.155.8': { country: 'Panama', countryCode: 'PA', city: 'Panama City', flag: '🇵🇦' },
  '127.0.0.1': { country: 'Localhost', countryCode: 'LO', city: 'Loopback', flag: '🔒' },
  '192.168.1.100': { country: 'Internal LAN', countryCode: 'LAN', city: 'Office VPN', flag: '🛡️' },
};

export const SAMPLE_ATTACK_USERS = [
  'root', 'admin', 'ubuntu', 'oracle', 'postgres', 'test', 'git', 'guest', 'user', 'deploy', 'support', 'jenkins'
];

export const INITIAL_LOGS: SshLogEvent[] = [
  {
    id: 'log-1',
    timestamp: '2026-08-26 14:22:01',
    epoch: Date.now() - 320000,
    ip: '198.51.100.42',
    user: 'root',
    port: 54122,
    eventType: 'FAILED_PASSWORD',
    service: 'sshd',
    rawLog: 'Aug 26 14:22:01 edge-gateway-01 sshd[18420]: Failed password for root from 198.51.100.42 port 54122 ssh2',
    geo: SAMPLE_GEO_MAP['198.51.100.42']
  },
  {
    id: 'log-2',
    timestamp: '2026-08-26 14:22:03',
    epoch: Date.now() - 318000,
    ip: '198.51.100.42',
    user: 'root',
    port: 54128,
    eventType: 'FAILED_PASSWORD',
    service: 'sshd',
    rawLog: 'Aug 26 14:22:03 edge-gateway-01 sshd[18422]: Failed password for root from 198.51.100.42 port 54128 ssh2',
    geo: SAMPLE_GEO_MAP['198.51.100.42']
  },
  {
    id: 'log-3',
    timestamp: '2026-08-26 14:22:05',
    epoch: Date.now() - 316000,
    ip: '198.51.100.42',
    user: 'admin',
    port: 54135,
    eventType: 'INVALID_USER',
    service: 'sshd',
    rawLog: 'Aug 26 14:22:05 edge-gateway-01 sshd[18425]: Invalid user admin from 198.51.100.42 port 54135',
    geo: SAMPLE_GEO_MAP['198.51.100.42']
  },
  {
    id: 'log-4',
    timestamp: '2026-08-26 14:22:07',
    epoch: Date.now() - 314000,
    ip: '198.51.100.42',
    user: 'admin',
    port: 54139,
    eventType: 'FAILED_PASSWORD',
    service: 'sshd',
    rawLog: 'Aug 26 14:22:07 edge-gateway-01 sshd[18428]: Failed password for invalid user admin from 198.51.100.42 port 54139 ssh2',
    geo: SAMPLE_GEO_MAP['198.51.100.42']
  },
  {
    id: 'log-5',
    timestamp: '2026-08-26 14:22:09',
    epoch: Date.now() - 312000,
    ip: '198.51.100.42',
    user: 'oracle',
    port: 54144,
    eventType: 'FAILED_PASSWORD',
    service: 'sshd',
    rawLog: 'Aug 26 14:22:09 edge-gateway-01 sshd[18431]: Failed password for invalid user oracle from 198.51.100.42 port 54144 ssh2',
    geo: SAMPLE_GEO_MAP['198.51.100.42']
  },
  {
    id: 'log-6',
    timestamp: '2026-08-26 14:25:12',
    epoch: Date.now() - 120000,
    ip: '185.220.101.5',
    user: 'root',
    port: 43210,
    eventType: 'FAILED_PASSWORD',
    service: 'sshd',
    rawLog: 'Aug 26 14:25:12 edge-gateway-01 sshd[19012]: Failed password for root from 185.220.101.5 port 43210 ssh2',
    geo: SAMPLE_GEO_MAP['185.220.101.5']
  },
  {
    id: 'log-7',
    timestamp: '2026-08-26 14:28:44',
    epoch: Date.now() - 60000,
    ip: '10.0.0.15',
    user: 'sysadmin',
    port: 60234,
    eventType: 'ACCEPTED_KEY',
    service: 'sshd',
    rawLog: 'Aug 26 14:28:44 edge-gateway-01 sshd[19450]: Accepted publickey for sysadmin from 10.0.0.15 port 60234 ssh2: RSA SHA256:8sK1l9...',
    geo: { country: 'Internal VPN', countryCode: 'VPN', city: 'DevSecOps Node', flag: '🛡️' }
  }
];

export const INITIAL_BANNED: BannedIp[] = [
  {
    ip: '198.51.100.42',
    bannedAt: Date.now() - 312000,
    expiresAt: Date.now() + 3600000 - 312000,
    banTimeMin: 60,
    attemptsCount: 5,
    reason: 'Exceeded max_retries (5) within findtime (10m)',
    lastUser: 'oracle',
    ufwRule: 'ufw insert 1 deny from 198.51.100.42 to any port 22 comment \'bannedbyabrejeet:ssh\'',
    status: 'banned',
    country: 'Russian Federation',
    flag: '🇷🇺'
  },
  {
    ip: '218.92.0.102',
    bannedAt: Date.now() - 1200000,
    expiresAt: Date.now() + 3600000 - 1200000,
    banTimeMin: 60,
    attemptsCount: 7,
    reason: 'Rapid brute-force dictionary sweep on sshd:22',
    lastUser: 'postgres',
    ufwRule: 'ufw insert 1 deny from 218.92.0.102 to any port 22 comment \'bannedbyabrejeet:ssh\'',
    status: 'banned',
    country: 'China',
    flag: '🇨🇳'
  }
];
