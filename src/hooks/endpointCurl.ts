import { ApiEndpoint } from '../data/openApiSpec';

/** Construye el comando `curl` equivalente al request del endpoint. */
export function buildCurl(endpoint: ApiEndpoint, bodies: Record<string, string>): string {
  let curl = `curl -X ${endpoint.method} "https://api.bannedbyabrejeet.io${endpoint.path}"`;
  const body = bodies[endpoint.id];
  if (endpoint.requestBody && body) {
    curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/\n/g, '')}'`;
  }
  return curl;
}
