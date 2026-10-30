import React, { useState } from 'react';
import { OPENAPI_ENDPOINTS, ApiEndpoint } from '../data/openApiSpec';
import { useEndpointRunner } from '../hooks/useEndpointRunner';
import { SwaggerHeader } from './swagger/SwaggerHeader';
import { EndpointCard } from './swagger/EndpointCard';

/**
 * Valores de ejemplo para los cuerpos de request de Swagger.
 * Las credenciales NO se escriben en el repositorio: se completan a mano
 * en el formulario (o se inyectan por variables de entorno en build).
 */
const DEMO_USERNAME = 'admin';
const DEMO_EMAIL = 'admin@bannedbyabrejeet.io';
// Valores vacíos a propósito: se completan en el formulario, nunca en el repo.
const DEMO_CREDENTIAL = '';
const DEMO_RESET_VALUE = '';
const DEMO_NEW_CREDENTIAL = '';

const INITIAL_BODIES: Record<string, string> = {
  'put-settings': JSON.stringify({ max_retries: 5, ban_time_min: 120, findtime_min: 15 }, null, 2),
  'post-whitelist': JSON.stringify({ ip: '192.168.1.150' }, null, 2),
  'post-unban': JSON.stringify(
    { ip: '198.51.100.42', reason: 'Operator manual unban via Swagger' },
    null,
    2
  ),
  'post-login': JSON.stringify({ username: DEMO_USERNAME, password: DEMO_CREDENTIAL }, null, 2),
  'post-setup-admin': JSON.stringify(
    { username: DEMO_USERNAME, email: DEMO_EMAIL, password: DEMO_CREDENTIAL },
    null,
    2
  ),
  'post-reset-token': JSON.stringify({ email: DEMO_EMAIL }, null, 2),
  'post-reset-confirm': JSON.stringify(
    { token: DEMO_RESET_VALUE, new_password: DEMO_NEW_CREDENTIAL },
    null,
    2
  ),
  'post-ingest-log': JSON.stringify(
    {
      raw_log:
        'Aug 26 14:45:00 edge-node sshd[23100]: Failed password for root from 185.220.101.5 port 49120 ssh2'
    },
    null,
    2
  )
};

const TAGS = [
  'ALL',
  'System Health',
  'Authentication',
  'Configuration',
  'Whitelist',
  'Security Engine Bridge',
  'Security Engine'
];

/** Documentación interactiva de la API (OpenAPI). */
export const SwaggerDocs: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string>('get-settings');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const runner = useEndpointRunner(INITIAL_BODIES);

  const filteredEndpoints =
    selectedTag === 'ALL'
      ? OPENAPI_ENDPOINTS
      : OPENAPI_ENDPOINTS.filter(e => e.tags.includes(selectedTag));

  const copyCurl = (endpoint: ApiEndpoint) => {
    navigator.clipboard.writeText(runner.buildCurl(endpoint));
    setCopiedId(endpoint.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-200">
      <SwaggerHeader tags={TAGS} selectedTag={selectedTag} onSelectTag={setSelectedTag} />

      <div className="space-y-3.5">
        {filteredEndpoints.map(endpoint => (
          <EndpointCard
            key={endpoint.id}
            endpoint={endpoint}
            isExpanded={expandedId === endpoint.id}
            onToggle={() => setExpandedId(expandedId === endpoint.id ? '' : endpoint.id)}
            runner={runner}
            copied={copiedId === endpoint.id}
            onCopyCurl={copyCurl}
          />
        ))}
      </div>
    </div>
  );
};
