# Estado del proyecto y rondas pendientes

> Actualizado: 2026-10-30 · Base: informe de calidad del 28/10 + trabajo de las rondas 1–4.
> Rama evaluada: `main`. Repositorio: `~/beta`.

---

## 1. Resumen ejecutivo

| Aspecto | Informe 28/10 | Hoy | Meta | Estado |
|---|---:|---:|---:|---|
| **Índice de calidad** | 11 | **~33 (estimado)** | ≥ 60 | ⚠️ |
| Criterios cumplidos | 8/15 | **14/15** | 15/15 | ⚠️ |
| Duplicación | 4.5 % | **0.26 %** | ≤ 15 % | ✅ |
| SEC (secretos) | 2 | **0** | 0 | ✅ |
| SQL | 0 | 0 | 0 | ✅ |
| Capas | 2 | **3** (vistas/servicios/estado) | ≥ 2 | ✅ |
| HTTP en componente | 0 | 0 | 0 | ✅ |
| DBG (depuración) | 34 | **0** | 0 | ✅ |
| Any | 4 | **0** | ≤ 2 | ✅ |
| BigC | 9 | **1** | ≤ 1 | ✅ |
| Coh | 1 | **0** | 0 | ✅ |
| Compl | 6 | **~3** | ≤ 37 (norm.) | ✅/⚠️ |
| Tam | 11 | **~7** | ≤ 74 (norm.) | ✅/⚠️ |
| Acop | 6 | **0** | ≤ 15 (norm.) | ✅ |
| Cobertura | no medible | **95.58 %** | ≥ 80 % | ✅ |
| Tests (archivos) | 1 | **6** (72 tests) | ≥ 5 | ✅ |
| Vistas | 10 | 10+ | ≥ 8 | ✅ |

**Lectura:** los 15 criterios del semáforo están en verde salvo el **índice**, que es un
resumen ponderado (no una nota: "es una criba para priorizar"). Se subió de 11 a ~33.

---

## 2. Lo que ya se hizo (rondas 1–4)

### Ronda 1 — Señales "baratas" y de mayor peso
- **DBG 34 → 0**: `logger.js` con niveles en el Backend B (`log.info/warn/error`), módulo
  `logging` en FastAPI y muestras de código de `architectureFiles.ts` alineadas.
- **SEC 2 → 0**: credenciales de ejemplo fuera del código (`DEMO_CREDENTIAL`,
  `EXAMPLE_CREDENTIAL/EXAMPLE_TOKEN`); se encontraron 6 literales, no 2.
- **Any 4 → 0**: `src/services/apiTypes.ts` con las formas crudas de la API y 37 usos de
  `any` eliminados en 6 archivos.
- **Duplicación inicial**: `ProtectedRoute`, `navItems`, `VERIFICATION_FILTERS`.

### Ronda 2 — Arquitectura
- **Coh 1 → 0 / Acop 6 → 0**: `securityEngine` pasó de clase (845 líneas) a **módulo
  funcional** (factory con closures), conservando los 35 métodos públicos.
- **BigC 9 → 1**: 8 componentes divididos en 34 archivos por responsabilidad:
  `components/{nav,auth,attack,landing,redis,swagger,architecture}/`.
- **Capa nueva `hooks/`**: `useAuthFlow`, `useEndpointRunner` (capas: 2 → 3).

### Ronda 3 — Funciones largas (no visuales)
- `refresh` → `fetchSnapshot` + `applySnapshot`.
- `unbanIp` → `tryDirectUnban` + `releaseFail2ban`.
- `simulateAttack` → `buildAttackLogLine`.
- Suite Issue #7 (154 líneas) → `services/issue7.ts` con 4 tests independientes.
- `runEndpoint` (Swagger) → mapa de handlers (`hooks/endpointHandlers.ts`).
- `processSshLogLine` (Node) → `readSettings` + `registerFailure` + `applyBan` + `classifyEvent`.
- `security_state` (Python) → `_read_banned` + `_read_failures` + `_read_json_list`.
- `mapLogEvent` → `inferActionTaken` + `buildVerification`.

### Ronda 4 — Duplicación
- 1.34 % → **0.26 %**: recorte de imports repetidos (14 archivos), `PasswordField`,
  `NotificationBanner`, `utils/download.ts`.

### Verificación de cada ronda
- `npm run lint` (tsc) ✅ · `npm run build` ✅ · `npm test` (72) ✅
- Navegador: landing, alta de admin, login, dashboard, swagger, arquitectura y redis
  renderizan sin errores de consola.
- Backend: ciclo real ban → unban verificado (Redis + UFW simulado).

---

## 3. Qué falta (rondas 5+)

> Ordenadas por **impacto / riesgo**. Las primeras dos no tocan la UI.

### Ronda 5 — Dividir el Dashboard (el único BigC)
**Impacto:** alto (es el mayor aporte a Tam/Compl: 1480 líneas, complejidad 92).
**Esfuerzo:** 2–3 h · **Riesgo:** medio (visual, pero verificable en navegador).

Tareas:
1. `dashboard/useDashboard.ts`: mover estado + handlers (hoy en el componente).
2. Extraer las 5 subvistas a `dashboard/`:
   - `ConsoleView` (métricas + visor de logs)
   - `BannedView` (tabla de baneos + reglas UFW + operaciones)
   - `SettingsView` (parámetros + whitelist + reset de contraseña)
   - `AuthView` (prueba de autenticación)
   - `Issue7View` (suite de aceptación)
3. Extraer piezas repetidas: `MetricCard`, `UfwRulesPanel`, `LogsTable`.
4. Verificar en navegador: las 5 pestañas, con y sin datos.

### Ronda 6 — Funciones "contenedor" (sin riesgo visual)
**Impacto:** medio (baja Tam/Compl sin tocar pixeles).
**Esfuerzo:** 2–3 h · **Riesgo:** bajo.

| Función | Líneas | Acción |
|---|---:|---|
| `createSecurityEngine` | 692 | Extraer grupos de funciones a módulos con un `ctx` compartido (`state`, `notify`) |
| `useAuthFlow` | 273 | Separar en `useAuthState` + `useAuthActions` |
| `unbanIp` | 53 | Extraer `verifyUfwCleared()` |
| `requestPasswordReset` | 49 | Extraer `buildResetEmail()` |
| `applySnapshot` | — (compl 13) | Extraer `applyCollectionState()` |

### Ronda 7 (opcional) — Fragmentar formularios y vistas
**Impacto:** el que falta para llegar a índice 60 (Tam/Compl → 0).
**Esfuerzo:** ~1 día · **Riesgo:** alto (visual) · **Valor real:** discutible.

Para que el analizador no cuente un formulario JSX de 40 líneas como "función larga", hay
que partir cada pantalla en fragmentos de <30 líneas (~40–60 archivos nuevos). Sube el
índice, pero **empeora la legibilidad**. Recomendación: hacerlo **sólo** si el índice es
bloqueante para la aprobación.

### Proceso (no es código, pero el informe lo marca)
| Punto | Situación | Acción |
|---|---|---|
| **PushDir** | commits de trabajo directos a `main` | Trabajar en ramas y mergear por **Pull Request** con revisión |
| **Autoría (RepoSense)** | `manuabrego` concentra el 100 % del código | Reconstruir la coordinación: que el otro integrante commitee su parte |
| **IC / Constancia** | 3 sesiones, 14 % cumplimiento, pausa de 61 días | 2 sesiones por semana sostenidas, sin pausas > 10 días |

---

## 4. Estimación del índice

```
peso = Σ(señales × peso) + duplicación_% × 300
índice = 100 × (1 − peso/(peso+25))       (topes duros si dup ≥ 15/30/50 %)
```

| Concepto | Hoy | Tras ronda 5 | Tras ronda 6 | Tras ronda 7 |
|---|---:|---:|---:|---:|
| Duplicación 0.26 % | 0.8 | 0.8 | 0.8 | ~0.5 |
| BigC ×1 | 6 | **0** | 0 | 0 |
| Compl (~3) | 15 | ~10 | ~5 | **0** |
| Tam (~7) | 30 | ~18 | ~10 | **0** |
| **Peso total** | ~52 | ~29 | ~16 | ~0.5 |
| **Índice** | **~33** | **~51** | **~61** | ~98 |

- Rondas 5+6 → **cruza los 60**.
- Ronda 7 sólo si hace falta margen.

---

## 5. Cómo verificar (comandos)

```bash
cd ~/beta

# Calidad de código
npm run lint          # tsc --noEmit
npm run build         # build de producción
npm test              # 72 tests
npm run test:coverage # regenera coverage.xml (raíz)

# Duplicación (misma herramienta que usa la cátedra)
npx -y jscpd@4 --min-lines 4 --min-tokens 40 \
  --format "typescript,tsx,javascript,python" \
  --ignore "**/node_modules/**,**/venv/**,**/dist/**,**/coverage/**,**/__pycache__/**,**/tests/**" .

# App
./local-dev/run-local.sh start       # modo simulado
./local-dev/run-local.sh start-real  # ataques SSH reales (sudo)
```

Documentos de referencia: `MANUAL_EJECUCION.md` (operación), `docs/ANALISIS_CUMPLIMIENTO.md`
(análisis detallado y justificación de cada decisión).

---

## 6. Estado del repositorio

- **Sin commitear**: todo el trabajo de las rondas 1–4 (los commits los hace el autor).
- Confirmar antes de subir:
  ```bash
  git status --short
  ```
- Recordar que `coverage.xml` va versionado (es el artefacto que lee la cátedra) y que
  `coverage/` está ignorado. `node_modules/`, `dist/`, `.env*` y los logs no se suben.

---

## 7. Checklist antes de entregar

- [x] Sin secretos hardcodeados
- [x] Sin `console.log` / `print` / `debugger` en producción
- [x] Sin SQL por concatenación
- [x] Backend en capas (rutas/lógica/datos por módulo)
- [x] Frontend en capas (components / services / hooks) sin `fetch` en componentes
- [x] Componentes ≤150 líneas salvo **1** (Dashboard → ronda 5)
- [x] Sin `any`
- [x] Duplicación ≤15 % (0.26 %)
- [x] `coverage.xml` con ≥80 % (95.58 %)
- [x] ≥5 archivos de test (6) y ≥8 vistas (10+)
- [ ] Índice ≥60 → depende de rondas 5+6
- [ ] Todo subido a `main` por Pull Request (proceso)
- [ ] Autoría y constancia reconstruidas (proceso)
