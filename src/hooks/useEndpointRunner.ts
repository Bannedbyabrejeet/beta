import { useCallback, useState } from 'react';
import { securityEngine } from '../services/securityEngine';
import { ApiEndpoint } from '../data/openApiSpec';
import { buildCurl } from './endpointCurl';
import { runEndpoint } from './endpointHandlers';

export interface EndpointResponse {
  status: number;
  durationMs: number;
  data: unknown;
}

export interface EndpointRunner {
  requestBodies: Record<string, string>;
  pathParams: Record<string, Record<string, string>>;
  responses: Record<string, EndpointResponse>;
  setRequestBody: (endpointId: string, value: string) => void;
  setPathParam: (endpointId: string, param: string, value: string) => void;
  execute: (endpoint: ApiEndpoint) => Promise<void>;
  buildCurl: (endpoint: ApiEndpoint) => string;
}

/**
 * Estado y ejecución del playground de Swagger.
 * Vive en `hooks/` (capa de estado); la lógica de cada endpoint está en
 * `endpointHandlers.ts`.
 */
export function useEndpointRunner(initialBodies: Record<string, string>): EndpointRunner {
  const [requestBodies, setRequestBodies] = useState<Record<string, string>>(initialBodies);
  const [pathParams, setPathParams] = useState<Record<string, Record<string, string>>>({
    'delete-whitelist': { ip: '192.168.1.150' }
  });
  const [responses, setResponses] = useState<Record<string, EndpointResponse>>({});

  const setRequestBody = useCallback((endpointId: string, value: string) => {
    setRequestBodies(prev => ({ ...prev, [endpointId]: value }));
  }, []);

  const setPathParam = useCallback((endpointId: string, param: string, value: string) => {
    setPathParams(prev => ({
      ...prev,
      [endpointId]: { ...(prev[endpointId] || {}), [param]: value }
    }));
  }, []);

  const execute = useCallback(
    async (endpoint: ApiEndpoint) => {
      const startTime = performance.now();
      let status = 200;
      let data: unknown = {};

      try {
        const result = await runEndpoint(endpoint, { bodies: requestBodies, pathParams });
        status = result.status ?? 200;
        data = result.data;
      } catch (e) {
        status = 400;
        data = { error: e instanceof Error ? e.message : 'Bad Request JSON Payload' };
      }

      const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
      setResponses(prev => ({
        ...prev,
        [endpoint.id]: { status, durationMs: Math.max(0.2, durationMs), data }
      }));
    },
    [requestBodies, pathParams]
  );

  return {
    requestBodies,
    pathParams,
    responses,
    setRequestBody,
    setPathParam,
    execute,
    buildCurl: (endpoint: ApiEndpoint) => buildCurl(endpoint, requestBodies)
  };
}

// Re-export para tests / compatibilidad
export { securityEngine };
