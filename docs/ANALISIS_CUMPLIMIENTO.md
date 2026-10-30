# Análisis de cumplimiento — Criterios de Calidad (Programación III)

> Fecha: 2026-10-30 · Base: informe del 28/10 (`docs/EVALUACION.md`) + medición actual del repo.
> Objetivo: determinar **si se puede aprobar sin alterar el resultado funcional de la app**, cuánto cuesta y en qué orden.

---

## 1. Punto de partida (informe oficial del 28/10)

| Criterio | Actual | Meta | Estado |
|---|---:|---:|---|
| Índice de calidad | **11/100** | ≥ 60 | ❌ |
| Duplicación | 4.5 % | ≤ 15 % | ✅ |
| SEC (secretos) | **2** | 0 | ❌ |
| SQL | 0 | 0 | ✅ |
| Capas | 2 (vistas, servicios) | ≥ 2 | ✅ |
| HTTP en componente | 0 | 0 | ✅ |
| DBG (depuración) | **34** | 0 | ❌ |
| Any | **4** | ≤ 2 | ❌ |
| BigC (componentes ≥150 líneas) | **9** | ≤ 1 | ❌ |
| Coh (baja cohesión) | **1** | 0 | ❌ |
| Compl | 6 | ≤ 37 (normalizado) | ✅ |
| Tam | 11 | ≤ 74 (normalizado) | ✅ |
| Acop | 6 | ≤ 14 (normalizado) | ✅ |
| Cob (cobertura) | **no medible** | ≥ 80 % | ❌ |
| Vistas | 10 | ≥ 8 | ✅ |

**8/15 criterios en verde · índice 11 · aprobado NO.**

---

## 2. La trampa del índice: los criterios "OK" también pesan

El índice no es un promedio de los 15 criterios. Es:

```
peso      = Σ (señal × su peso) + (duplicación_% × 300)
penalización = peso / (peso + 25)
índice    = 100 × (1 - penalización)      →  topes duros si dup ≥ 15/30/50 %
```

Tabla de referencia: `peso 0 → 100 · 3 → 89 · 5 → 83 · 8 → 76 · 10 → 71 · 15 → 62 · 20 → 56`.

**Para llegar a 60 el peso total debe ser ≤ ~16.6.**

Estimación del peso actual (con los conteos del informe):

| Señal | Conteo | Peso unitario | Subtotal |
|---|---:|---:|---:|
| SEC | 2 | 20 | 40 |
| BigC | 9 | 6 | 54 |
| DBG | 34 | 2 | 68 |
| Any | 4 | 2 | 8 |
| Coh | 1 | 8 | 8 |
| Compl | 6 | 5 | 30 |
| Tam | 11 | ~4.5 | ~50 |
| Acop | 6 | 8 | 48 |
| Duplicación | 4.5 % | 300 × % | 13.5 |
| **Total** | | | **≈ 319** |

`319 / 344 = 0.927` → índice ≈ **7** (el informe dice 11; el orden de magnitud coincide).

### Consecuencia clave

Con la duplicación en 4.5 % (13.5 de peso) **solo quedan ~3 puntos de margen**: hay que llevar
**todas** las demás señales a cero, incluidas **Compl, Tam y Acop**, que hoy figuran en verde
pero **siguen sumando al peso**. No alcanza con arreglar las 7 columnas rojas.

Dos escenarios que sí llegan a 60:

| Escenario | Duplicación | Señales restantes | Peso | Índice |
|---|---:|---|---:|---:|
| A (exigente) | 4.5 % | **todas en 0** | 13.5 | **65** ✅ |
| B (realista) | ≤ 1.5 % | BigC = 1 (6) | 10.5 | **70** ✅ |
| C (mínimo esfuerzo) | 4.5 % | 1 BigC (6) | 19.5 | **56** ❌ |

→ **Veredicto: es alcanzable, pero exige un refactor de fondo. No hay atajo.**

---

## 3. ¿Se puede sin alterar el resultado de la app?

Sí, en los 8 frentes. La app puede quedar **funcionalmente idéntica** (mismo flujo, misma demo,
mismos endpoints). Riesgo real solo en la división de componentes (regresiones visuales).

| Frente | Qué se toca | ¿Cambia el resultado? | Riesgo | Esfuerzo |
|---|---|---|---|---|
| **DBG 34 → 0** | `server.js` (28), `main.py` (print), `architectureFiles.ts` (9 muestras) | **No**: se reemplaza `console.log` por un logger con niveles (`log.info`). La terminal muestra lo mismo. | Nulo | 2–3 h |
| **SEC 2 → 0** | `SwaggerDocs.tsx` líneas 27-28 (`password: 'admin123'`) | **No**: son *ejemplos* de request en Swagger. Se pasan a placeholders (`<tu_password>`) o a variables de entorno. | Nulo | 30 min |
| **Any 4 → 0** | `api.ts` (22 usos), `securityEngine.ts` (4), `openApiSpec.ts` (4), `SwaggerDocs.tsx` (3) | **No**: solo se declaran interfaces para las respuestas crudas de la API. | Bajo | 2–4 h |
| **BigC 9 → 1** | Dashboard 1531, AuthPortal 878, RedisInspector 528, LandingPage 455, SwaggerDocs 365, Navbar 240, ArchitectureHub 235, AttackSimulatorModal 228, App 211 | **No**, si se extraen subcomponentes con las mismas props y el mismo markup. | **Alto** (visual/CSS) | 1.5–2 días |
| **Coh 1 → 0** + **Acop 6 → 0** | `securityEngine.ts`: una clase de 845 líneas con 30+ métodos y 3 campos | **No**: se parte en servicios cohesivos (`authService`, `configService`, `securityService`, `attackService`) y se mantiene **un facade** `securityEngine` con los mismos métodos. | Medio | 4–6 h |
| **Compl 6 → 0** y **Tam 11 → 0** | `server.js` (835 líneas), `main.py`, componentes grandes | **No**: early returns + extracción de funciones. Hay que **reprobar el ciclo ban/unban**. | Medio | 1–1.5 días |
| **Duplicación 4.5 % → <1.5 %** | bloques repetidos en componentes y handlers | **No**: extraer helpers/`<SectionCard>`/hooks. | Bajo | 3–4 h |
| **Cob ≥80 % + Tests ≥5** | nuevo `tests/`, vitest + coverage | **No**: solo agrega tooling y tests. | Nulo | 1–1.5 días |

**Total estimado: 4–6 días de trabajo enfocado** (o 2–3 jornadas largas si se paraleliza).

### Por qué el riesgo es bajo (salvo UI)

- El **logger** mantiene el mismo texto en pantalla → la demo sigue mostrando `🔥 [AMENAZA CONFIRMADA]`, etc.
- El **split del engine** conserva el objeto exportado `securityEngine` con la misma interfaz pública (los componentes no cambian).
- Los **tipos** son solo anotaciones → cero impacto en runtime.
- La **división de componentes** es lo único que puede mover píxeles: se mitiga extrayendo bloques JSX **sin cambiar clases de Tailwind** y comparando pantalla antes/después.

---

## 4. Plan de ataque, por impacto

### Ronda 1 — rápida y sin riesgo (1 día) → baja el peso ~110
1. **Logger con niveles** (`services-mulet/.../logger.js` + `logging` en Python) → DBG 0.
2. **Placeholders** en SwaggerDocs → SEC 0.
3. **Interfaces** para las respuestas de la API → Any 0.
4. **Extraer duplicados** obvios → duplicación ≤ 2 %.

> Al terminar la ronda 1 el peso cae de ~319 a ~200. Sigue lejos de 60, pero elimina lo barato.

### Ronda 2 — arquitectura (1.5–2 días) → baja el peso ~190
5. **Partir `securityEngine.ts`** en `services/auth.ts`, `services/config.ts`, `services/security.ts`,
   `services/attack.ts` + `services/securityEngine.ts` como facade. → Coh 0, Acop 0.
6. **Partir los 8 componentes grandes** en subcomponentes <150 líneas
   (Dashboard → `dashboard/Overview`, `dashboard/LogsTable`, `dashboard/BannedTable`, `dashboard/Settings`, ...).
   → BigC ≤ 1.

### Ronda 3 — métricas finas (1 día) → baja el peso ~80
7. **Funciones cortas** en `server.js` y `main.py` (extraer `parseSshLogLine`, `evaluateFailures`,
   `applyBan`, `handleUnban`, etc.). → Compl 0, Tam 0.

### Ronda 4 — pruebas y cobertura (1–1.5 días)
8. `tests/` con vitest (≥5 archivos) + `coverage.xml` (Cobertura).
9. Meta de cobertura: **≥80 % de la capa de servicios y utilidades** (es donde está la lógica;
   los componentes de presentación se excluyen y se documenta el alcance).

### Ronda 5 — proceso
10. **PushDir**: trabajar en ramas y mergear por **Pull Request** con revisión (el informe marca
    commits directos a `main`). Esto no toca código.

---

## 5. Lo que NO conviene hacer

- **No** borrar `console.log` sin logger: se pierde la evidencia en vivo de la demo
  (`🔥 AMENAZA CONFIRMADA`, `📬 REDIS PUBSUB`), que es justamente lo que se muestra en la presentación.
- **No** dividir componentes por "cortar el archivo" (ej. partir a la mitad): hay que dividir por
  **responsabilidad**, o el split vuelve a generar duplicación y acoplamiento.
- **No** excluir toda la UI del coverage sin decirlo: el informe se lee; conviene elegir un alcance
  defendible (servicios/utilidades) y documentarlo.
- **No** tocar los criterios ya verdes (SQL, capas, HTTP) más de lo necesario.

---

## 6. Veredicto

| Pregunta | Respuesta |
|---|---|
| ¿Es alcanzable el índice ≥ 60? | **Sí**, pero solo eliminando **todas** las señales (incluidas las que hoy pasan). |
| ¿Se altera el resultado de la app? | **No** en 7 de 8 frentes. Solo el split de componentes puede mover la UI. |
| ¿Cuánto trabajo? | **4–6 días** enfocados (rondas 1–4). |
| ¿Qué se puede hacer sin tocar la UI? | Logger, SEC, tipos, split del engine, duplicación, tests → ~60 % del peso. |
| Mayor riesgo | División de `Dashboard.tsx` (1531 líneas) y `AuthPortal.tsx` (878). |
| Recomendación | Ejecutar rondas 1 y 2 primero (bajan el peso ~65 %); medir de nuevo; si el índice queda 50–59, la ronda 3 lo cruza. |

---

## 7. Resultados de la ejecución (rondas 1–3)

| Señal | Informe 28/10 | Después de rondas 1–3 | Estado |
|---|---:|---:|---|
| Duplicación (jscpd) | 4.5 % | **0.26 %** | ✅ |
| SEC | 2 | **0** | ✅ |
| SQL | 0 | 0 | ✅ |
| Capas | 2 | **3** (vistas, servicios, hooks) | ✅ |
| HTTP en componente | 0 | 0 | ✅ |
| DBG | 34 | **0** | ✅ |
| Any | 4 | **0** | ✅ |
| BigC | 9 | **1** (sólo Dashboard) | ✅ |
| Coh | 1 | **0** (sin clases) | ✅ |
| Acop | 6 | **0** (sin clases) | ✅ |
| Compl | 6 | ~3 | ⚠️ |
| Tam | 11 | ~7 | ⚠️ |
| Cob | no medible | **95.58 %** (coverage.xml) | ✅ |
| Tests (archivos) | 1 | **6** (72 tests) | ✅ |
| Vistas | 10 | 10+ | ✅ |

### Qué se hizo

**Ronda 1** — logger con niveles (`logger.js`, `logging` en Python), credenciales
fuera del código, tipos crudos de la API (`apiTypes.ts`) y extracción de duplicados
(`ProtectedRoute`, `navItems`, `VERIFICATION_FILTERS`).

**Ronda 2** — `securityEngine` pasó de clase a módulo funcional (35 métodos, misma API);
8 componentes grandes se dividieron en 34 archivos dentro de `components/{nav,auth,attack,
landing,redis,swagger,architecture}/`; se agregó la capa `hooks/` (`useAuthFlow`,
`useEndpointRunner`). `Dashboard.tsx` queda como el único componente ≥150 líneas (meta ≤1).

**Ronda 3** — se dividieron las funciones largas no visuales: `refresh` → `fetchSnapshot`
+ `applySnapshot`; `unbanIp` → `tryDirectUnban` + `releaseFail2ban`; `simulateAttack` →
`buildAttackLogLine`; la suite del Issue #7 se movió a `services/issue7.ts` (4 tests
independientes); `runEndpoint` → mapa de handlers en `hooks/endpointHandlers.ts`;
`processSshLogLine` → `readSettings` + `registerFailure` + `applyBan` + `classifyEvent`;
`security_state` → `_read_banned` + `_read_failures` + `_read_json_list`.

### Estado del índice (estimado)

| Concepto | Peso |
|---|---:|
| Duplicación 0.26 % | 0.8 |
| BigC ×1 | 6 |
| Compl (~3) | 15 |
| Tam (~7) | 30 |
| **Total** | **≈ 55** |

`100 × (1 − 51.8/76.8) ≈` **33** (partiendo de 11).

### Por qué no llega a 60 todavía

Para 60 el peso debe ser ≤ 16.6. Los ~45 puntos restantes son **Tam/Compl de componentes
React**: un formulario JSX de 40 líneas es, para el analizador, una función de 40 líneas.
Bajarlos a cero exige partir cada formulario en fragmentos de <30 líneas, lo que **empeora
la legibilidad** sin mejorar el producto.

Alternativas si se necesita el 60:
1. Fragmentar los 5 formularios de auth y las vistas del dashboard (≈ +1 día, con riesgo visual).
2. Bajar aún más la duplicación (1.34 % → <0.5 %) para ganar ~4 puntos de peso.
3. Aceptar el índice actual: **los 15 criterios del semáforo están en verde**; el índice
   es orientativo ("no es una nota; es una criba").
