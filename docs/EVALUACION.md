<!-- evaluacion:inicio -->
# Evaluación — Bannedbyabrejeet/beta

> Documento **generado automáticamente** por la cátedra de Programación III (RepoSense + análisis de calidad). **No editar a mano**: se regenera en cada evaluación.
> Rama evaluada: `main`. Análisis **heurístico** (regex + métricas): es una criba para orientar la revisión, **no una nota**.
> Generado: 2026-10-17.

## 1. Veredicto

| Aspecto | Resultado |
|---|---|
| Tipo de proyecto | frontend |
| Índice de calidad de servicios | **7/100** (mínimo 60) |
| Criterios cumplidos | **7/15** |
| Aprobado (semáforo) | **NO** |
| Código (LOC) | 6,828 |
| Archivos de código | 18 |
| Capas detectadas | vistas, servicios |
| Tope por duplicación | `DUP>=15%` → índice ≤ 50 |

> **Aprobado** exige cumplir **todos** los criterios del semáforo. No es una nota: sirve para ordenar y priorizar la revisión.

## 2. Autoría (RepoSense)

| Autor | Commits | Código (LOC) | Tests (LOC) | Docs (LOC) | Días activos | % del código |
|---|---:|---:|---:|---:|---:|---:|
| manuabrego | 1 | 7,616 | 0 | 181 | 1 | 100% |
| manu_abrego_1913 | 1 | 0 | 0 | 2 | 2 | 0% |

> _El LOC de autoría lo calcula RepoSense sobre el historial y puede diferir del LOC de código del análisis de calidad (que mira solo el estado de `main`)._

> **Reparto del trabajo:** manuabrego concentra el 100% de las líneas de código. Un reparto muy desigual suele indicar que la integración no fue realmente en equipo; vale la pena reconstruir cómo se coordinó.

## 3. Aspectos evaluados

Cada aspecto indica **qué mide**, **por qué importa** y **tu resultado**. Cuando el resultado está en rojo, se agregan preguntas para **investigar la causa** (no hay recetas: entender el porqué es parte de la evaluación).

### 1. Índice de calidad de servicios (indice) — A REVISAR

- **Qué mide:** Un resumen numérico (0-100) que combina todas las señales y métricas del análisis, con topes duros por duplicación.
- **Por qué importa:** Ordena y prioriza la revisión: un índice bajo indica varias señales que conviene mirar juntas.
- **Tu resultado:** índice **7/100** _(mínimo 60)_
- **Para investigar la causa:**
    - ¿En qué momento del proyecto se concentraron los problemas (arranque, integración de partes, cierre)?
    - ¿El índice bajó por muchas señales chicas o por una o dos graves?
    - ¿Se revisó el código integrado después de unir el trabajo de cada integrante?

### 2. Duplicación (DRY) (duplicacion) — A REVISAR

- **Qué mide:** Porcentaje de bloques de código repetidos (similitud) en el repositorio.
- **Por qué importa:** Cada copia se mantiene por separado: un arreglo hay que repetirlo y los defectos se multiplican.
- **Tu resultado:** **15.2%** de duplicación _(máximo 15%)_
- **Para investigar la causa:**
    - ¿El trabajo se repartió por pantallas o archivos y se integró copiando y pegando bloques?
    - ¿Qué zonas del sistema cambiaron juntas más de una vez (señal de lógica compartida)?
    - ¿Hubo un lugar común acordado para la lógica repetida antes de empezar, o cada integrante resolvió lo suyo?

### 3. Secretos hardcodeados (SEC) — A REVISAR

- **Qué mide:** Credenciales, tokens o claves escritos directamente en el código en vez de leerse de variables de entorno.
- **Por qué importa:** Un secreto en el repositorio queda expuesto en el historial aunque luego se borre, y compromete al servicio y a sus usuarios.
- **Tu resultado:** **3** secreto(s) hardcodeado(s) _(máximo 0)_
- **Para investigar la causa:**
    - ¿De dónde salió ese valor: un ejemplo, una prueba rápida, una copia de un compañero?
    - ¿En qué momento entró al código y por qué no se sacó antes de cerrar la tarea?
    - ¿Se acordó cómo manejar credenciales antes de empezar, o se postergó para el final?

### 4. Consultas SQL por concatenación (SQL) — OK

- **Qué mide:** Consultas SQL armadas concatenando o interpolando valores en vez de usar parámetros.
- **Por qué importa:** Es la puerta clásica a inyección: un valor que llega de afuera puede cambiar la consulta.
- **Tu resultado:** **0** consulta(s) SQL por concatenación _(máximo 0)_

### 5. Separación en capas (capas) — OK

- **Qué mide:** Si el código está separado en capas reconocibles (backend: presentación / lógica / datos; frontend: vistas / servicios / estado).
- **Por qué importa:** Sin separación, cada archivo hace de todo y cualquier cambio toca varios lugares a la vez.
- **Tu resultado:** **2** capa(s) detectada(s): vistas, servicios _(mínimo 2 capas (a partir de 150 LOC))_

### 6. Acceso a datos dentro del componente (HTTP) — OK

- **Qué mide:** Llamadas `fetch`/`axios` dentro de componentes de UI en vez de una capa de servicios/API.
- **Por qué importa:** Duplica la lógica de acceso a datos y acopla la vista al backend: un cambio de API toca muchos componentes.
- **Tu resultado:** **0** llamada(s) a la API dentro de componente(s) _(máximo 0)_

### 7. Depuración olvidada (DBG) — A REVISAR

- **Qué mide:** Mensajes de depuración olvidados (`console.log`, `print`, `debugger`).
- **Por qué importa:** Generan ruido en los registros, pueden filtrar datos y dan sensación de código sin terminar.
- **Tu resultado:** **30** mensaje(s) de depuración olvidado(s) _(máximo 0)_
- **Para investigar la causa:**
    - ¿Fue depuración que quedó al cerrar una tarea, o se usó como registro permanente?
    - ¿Hubo una revisión final antes de cerrar la issue o la entrega?
    - ¿Quién agregó cada mensaje y con qué objetivo?

### 8. Uso del tipo `any` (Any) — A REVISAR

- **Qué mide:** Uso de `any` en TypeScript, que desactiva la verificación de tipos.
- **Por qué importa:** Se pierde la ayuda del compilador justo donde los datos vienen de afuera (API, formularios).
- **Tu resultado:** **3** uso(s) de `any` _(máximo 2)_
- **Para investigar la causa:**
    - ¿Se usó `any` para destrabar un error de tipos sin tiempo de resolverlo?
    - ¿Está claro el modelo de datos (qué forma tienen la respuesta de la API y el estado de la app)?
    - ¿Los tipos se definen en un solo lugar, o cada archivo inventa los suyos?

### 9. Componente demasiado grande (BigC) — A REVISAR

- **Qué mide:** Componentes de UI muy extensos, que suelen mezclar render, estado y lógica.
- **Por qué importa:** Son difíciles de leer, probar y reutilizar, y sus cambios tienen efectos inesperados.
- **Tu resultado:** **9** componente(s) demasiado grande(s) _(máximo 1)_
- **Para investigar la causa:**
    - ¿El componente creció a medida que se agregaban requisitos, sin volver a dividirlo?
    - ¿Mezcla responsabilidades distintas (mostrar, calcular, pedir datos)?
    - ¿Se dividió por pantalla o por unidad de responsabilidad?

### 10. Baja cohesión (Coh) — A REVISAR

- **Qué mide:** Una clase o unidad cuyos métodos y campos no están relacionados entre sí.
- **Por qué importa:** Una unidad que cambia por motivos distintos es frágil y cuesta entenderla.
- **Tu resultado:** **1** unidad(es) con baja cohesión _(máximo 0)_
- **Para investigar la causa:**
    - ¿La unidad agrupa cosas que en realidad pertenecen a lugares distintos?
    - ¿Cambia por motivos diferentes según la tarea?
    - ¿Se pensó su responsabilidad antes de escribirla, o se fue agregando?

### 11. Complejidad alta (Compl) — OK

- **Qué mide:** Complejidad ciclomática: cantidad de caminos posibles dentro de una función (condicionales, bucles, casos).
- **Por qué importa:** Muchos caminos = difícil de seguir y de probar; suelen esconderse casos sin cubrir.
- **Tu resultado:** **3** bloque(s) de complejidad alta _(máximo 5 por 1000 LOC (tenés 6828 LOC))_

### 12. Funciones/métodos largos o con muchos parámetros (Tam) — OK

- **Qué mide:** Tamaño de las funciones/métodos y cantidad de parámetros.
- **Por qué importa:** Una función que hace varias cosas cuesta leerla, nombrarla y reutilizarla.
- **Tu resultado:** **5** función/método(s) largos o con muchos parámetros _(máximo 10 por 1000 LOC)_

### 13. Acoplamiento alto (Acop) — OK

- **Qué mide:** Cuánto depende una unidad de las partes internas de otra.
- **Por qué importa:** Piezas muy enlazadas hacen que un cambio se propague y que sea difícil reemplazar partes.
- **Tu resultado:** **5** unidad(es) con acoplamiento alto _(máximo 2 por 1000 LOC)_

### 14. Tests automatizados (Tests) — A REVISAR

- **Qué mide:** Cantidad de archivos de test separados del código.
- **Por qué importa:** Sin tests no hay red de seguridad: un cambio puede romper algo sin que se note hasta la demo.
- **Tu resultado:** **1** archivo(s) de test _(mínimo 5)_
- **Para investigar la causa:**
    - ¿Se planificó escribir tests, o quedó siempre al final?
    - ¿Qué parte del sistema es más riesgosa de tocar y por qué no está cubierta?
    - ¿Se sabe qué se rompería si algo cambiara?

### 15. Vistas del frontend (Vistas) — OK

- **Qué mide:** Cantidad de vistas/componentes de pantalla del frontend.
- **Por qué importa:** El frontend se mide por pantallas: pocas vistas sugiere poca cobertura de la interfaz pedida.
- **Tu resultado:** **10** vista(s)/componente(s) _(mínimo 8)_

## 4. Anexo: dónde mirar

Archivos donde el análisis encontró cada señal en rojo (sin número de línea, a propósito):

**Secretos hardcodeados (SEC)** — 2 archivo(s):
- `src/components/SwaggerDocs.tsx`
- `src/services/securityEngine.ts`

**Depuración olvidada (DBG)** — 3 archivo(s):
- `servicios-abrego/backend-a-fastapi/main.py`
- `servicios-mulet/backend-b-engine/server.js`
- `src/data/architectureFiles.ts`

**Uso del tipo `any` (Any)** — 3 archivo(s):
- `src/components/SwaggerDocs.tsx`
- `src/data/openApiSpec.ts`
- `src/services/securityEngine.ts`

**Componente demasiado grande (BigC)** — 9 archivo(s):
- `src/App.tsx`
- `src/components/ArchitectureHub.tsx`
- `src/components/AttackSimulatorModal.tsx`
- `src/components/AuthPortal.tsx`
- `src/components/Dashboard.tsx`
- `src/components/LandingPage.tsx`
- `src/components/Navbar.tsx`
- `src/components/RedisInspector.tsx`
- `src/components/SwaggerDocs.tsx`

**Baja cohesión (Coh)** — 1 archivo(s):
- `src/services/securityEngine.ts`

---
_Informe generado por la cátedra. Los umbrales corresponden al perfil `exigente`. Ante dudas, revisá el archivo señalado y el criterio en `CRITERIOS-CALIDAD.md`._
<!-- evaluacion:fin -->
