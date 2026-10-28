# Modo Local — todo en una sola máquina

Sirve para **probar el proyecto completo sin depender de la máquina de Mulet**
(`192.168.220.127`) y **sin `sudo`**: Redis y Nginx corren en contenedores Docker.

## Uso

```bash
./local-dev/run-local.sh start     # levanta los 5 servicios
./local-dev/run-local.sh status    # estado de cada uno
./local-dev/run-local.sh logs      # sigue todos los logs
./local-dev/run-local.sh stop      # detiene todo
```

## Qué levanta

| Servicio | Puerto | Cómo corre |
|---|---|---|
| Redis | 6379 | contenedor Docker `beta-redis` |
| Backend A (FastAPI) | 8000 | `uvicorn main:app` |
| Backend B (Motor SSH/UFW) | 3001 | `node server.js` |
| Frontend (React + Vite) | 3000 | `npm run dev` |
| Nginx (entrada única) | 80 | contenedor Docker `beta-nginx` |

## URLs

- Entrada unificada (como en producción): **http://localhost**
- Frontend directo: http://localhost:3000 → login `admin` / `admin123`
- Swagger Backend A: http://localhost:8000/docs
- Backend B: http://localhost:3001/api/security/health
- Redis CLI: `docker exec -it beta-redis redis-cli`

## Diferencias con el modo distribuido

1. **UPSTREAMS** → `local-dev/nginx-local.conf` apunta todo a `127.0.0.1`.
   En producción (`servicios-mulet/proxy-nginx/nginx.conf`) apunta a `192.168.220.123`.
2. **UFW es simulado** → `local-dev/bin/ufw` (shim) guarda las reglas en
   `local-dev/ufw-rules.log` en vez de tocar el firewall real, porque `ufw` y
   `/var/log/auth.log` requieren root. El shim se inyecta en el `PATH` del
   Backend B, así que los logs dicen "✅ [UFW ÉXITO]" igual que en producción.
3. **auth.log** → el Backend B lee `local-dev/auth.log` (no es legible sin root).
   Podés simular ataques copiando ahí líneas reales de sshd; el watcher las toma
   en vivo. También podés usar el endpoint de simulación:

```bash
# simular 5 fallos de SSH -> dispara el ban
for i in 1 2 3 4 5; do
  curl -X POST http://localhost/api/security/simulate-log \
    -H 'Content-Type: application/json' \
    -d "{\"log_line\":\"Oct 21 14:30:0$i etec sshd[1234]: Failed password for invalid user root from 203.0.113.77 port 5555$i ssh2\"}"
done

# ver las reglas "de UFW"
PATH="$PWD/local-dev/bin:$PATH" ufw status numbered
```

4. **El frontend es 100% mock** (`src/services/securityEngine.ts` + `src/data/presetData.ts`):
   no hace `fetch` a ningún backend. Los datos del panel, el Redis Inspector y el
   simulador de ataques se generan en el navegador. Para ver los datos **reales**
   de Redis hay que pegarle a la API (Swagger / `curl`).

## Prueba del ciclo completo

```bash
# 1) 5 fallos de SSH -> el motor banea (Redis + regla UFW simulada)
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost/api/security/simulate-log \
    -H 'Content-Type: application/json' \
    -d "{\"log_line\":\"Oct 21 14:30:0$i etec sshd[1234]: Failed password for root from 203.0.113.99 port 5555$i ssh2\"}"
done
docker exec beta-redis redis-cli HGETALL ip:banned
PATH="$PWD/local-dev/bin:$PATH" ufw status numbered

# 2) FastAPI publica en 'channel:unban_events' -> Backend B desbanea
curl -s -X POST http://localhost/api/v1/security/unban \
  -H 'Content-Type: application/json' -d '{"ip":"203.0.113.99"}'
tail -f local-dev/logs/backend-b.log
```

## Logs

Todo en `local-dev/logs/`: `backend-a.log`, `backend-b.log`, `frontend.log`.

## Requisitos

- Docker con acceso al daemon (el usuario debe estar en el grupo `docker`)
- Node.js 18+
- Python 3 con las dependencias del Backend A:
  `pip3 install --user --break-system-packages -r servicios-abrego/backend-a-fastapi/requirements.txt`
  (o `sudo apt install python3-venv` y usar `./servicios-abrego/backend-a-fastapi/start.sh`)
