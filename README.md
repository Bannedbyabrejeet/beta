<!-- calidad:inicio -->
![Calidad](https://img.shields.io/badge/Calidad-7%2F100-red) ![Aprobado](https://img.shields.io/badge/Aprobado-NO-red) ![Cumple](https://img.shields.io/badge/Cumple-7%2F15-orange) ![Duplicación](https://img.shields.io/badge/Duplicaci%C3%B3n-15.2%25-yellow) ![SEC](https://img.shields.io/badge/SEC-3-red) ![SQL](https://img.shields.io/badge/SQL-0-green) ![DBG](https://img.shields.io/badge/DBG-30-red) ![Capas](https://img.shields.io/badge/Capas-2-green) ![Tests](https://img.shields.io/badge/Tests-1-orange) ![Vistas](https://img.shields.io/badge/Vistas-10-green)

**Calidad de servicios (heurístico):** índice **7/100** · cumple **7/15** · aprobado **NO** · capas **2**
Detalle completo en [`docs/EVALUACION.md`](docs/EVALUACION.md).
<!-- calidad:fin -->

CRITERIOS DE CALIDAD - PROGRAMACION III (perfil exigente, rama main)

El analisis es heuristico (regex + metricas): no compila ni ejecuta el codigo.
Sirve como criba para priorizar la revision docente; no es una nota automatica.
Un repositorio sin codigo en main arranca con indice 0.

================================================================
SEMAFORO: 15 CRITERIOS (Aprob = SI solo si se cumplen TODOS)
Cumple N/M = criterios cumplidos sobre el total.
================================================================

1) INDICE
   Puntaje global 0-100 del repositorio (mas senales = peor).
   Meta: >= 60.
   Mejorar: bajar duplicacion y senales pesadas (secretos, SQL, capas).

2) DUPLICACION
   Porcentaje de lineas dentro de bloques repetidos (copiar y pegar).
   Meta: <= 15 %.
   Mejorar: extraer helpers/utilidades/componentes reutilizables.

3) SEC (seguridad)
   Credenciales, tokens o claves privadas escritas en el codigo.
   Meta: 0.
   Mejorar: variables de entorno (.env fuera del repo) y rotar las claves.

4) SQL
   Consultas SQL construidas por concatenacion/interpolacion (inyeccion).
   Meta: 0.
   Mejorar: consultas parametrizadas u ORM; nunca concatenar valores.

5) CAPAS
   El codigo debe estar separado en capas reconocibles (no todo mezclado).
   Meta: sin no_layering (>= 2 capas a partir de 150 LOC).
   Mejorar: backend -> routes/ + services/ + models/;
            frontend -> components/ + services/ + store|hooks/.

6) HTTP
   Llamadas fetch/axios dentro de un componente de UI.
   Meta: 0.
   Mejorar: mover las llamadas a una capa de servicios/API.

7) DBG (depuracion)
   Salidas olvidadas: console.log, print(, debugger;, pdb.set_trace.
   Meta: 0 (se ignoran los tests).
   Mejorar: borrarlas; usar un logger con niveles.

8) ANY
   Uso masivo de 'any' en TypeScript (tipado debil).
   Meta: <= 2.
   Mejorar: definir interface/type; activar strict en tsconfig.

9) BigC (componente grande)
   Componentes de UI demasiado grandes (.vue/.jsx/.tsx/.svelte).
   Meta: <= 1.
   Mejorar: dividir en componentes mas chicos y extraer hooks/composables.

10) Coh (cohesion)
    Clases con baja cohesion (metodos que casi no comparten datos).
    Meta: 0 clases.
    Mejorar: una clase = una responsabilidad; mover lo que no encaja.

11) Compl (complejidad)
    Complejidad ciclomatica alta, normalizada por tamano.
    Meta: <= 5 cada 1000 LOC.
    Mejorar: early returns, extraer funciones, evitar anidamiento profundo.

12) Tam (tamano)
    Metodos/funciones largos o con demasiados parametros.
    Meta: <= 10 cada 1000 LOC.
    Mejorar: extraer funciones y agrupar parametros en objetos/DTO.

13) Acop (acoplamiento)
    Clases muy acopladas (CBO: dependen de muchos tipos externos).
    Meta: <= 2 cada 1000 LOC.
    Mejorar: inyectar dependencias, depender de interfaces, aislar datos.

14) TESTS
    Archivos de test presentes y separados del codigo.
    Meta: >= 5.
    Mejorar: agregar tests en tests/ (o test_*.py, *.spec.ts).

15a) EP (solo backend)
    Endpoints HTTP expuestos.
    Meta: >= 10.
    Mejorar: implementar rutas reales (Express/Flask/FastAPI/Nest/etc.).

15b) VISTAS (solo frontend)
    Componentes/pantallas de UI.
    Meta: >= 8.
    Mejorar: agregar vistas/componentes de pantalla.

================================================================
SENALES DE SERVICIO (que las dispara)
================================================================

SEC  hardcoded_secret : password, api_key, token, secret, claves PEM,
                        patrones reales (ghp_..., sk_live_..., AIza..., AKIA...).
                        NO cuenta si sale de process.env, os.environ, getenv o ${...}.
                        Se ignoran los tests.  Aplica: backend + frontend.
SQL  sql_injection     : SQL armado con + o plantillas ${...} / f-strings.  Backend.
BigC big_component     : componente (.vue/.jsx/.tsx/.svelte) de >= 150 lineas.  Frontend.
HTTP http_in_component : fetch(...) / axios(...) dentro del componente.  Frontend.
Any  any_type          : >= 3 usos de 'any' en un mismo archivo .ts/.tsx.  Frontend.
DBG  debug_leftover    : console.log/debug/info, debugger;, print(, pprint(,
                        pdb.set_trace, binding.pry, System.out.print.  Ambos.
ARQ  no_layering       : repo con >= 150 LOC y menos de 2 capas reconocibles.

CAPAS QUE SE RECONOCEN (por carpeta/archivo):
  Backend:
    presentacion: routes/ controllers/ api/ endpoints/ handlers/
    logica:       services/ use-cases/ domain/ business/ core/
    datos:        models/ repositories/ dao/ entities/ db/ persistence/
  Frontend:
    vistas:       components/ views/ pages/ layouts/ ui/
    servicios:    services/ api/ clients/ http/
    estado:       store/ state/ context/ redux/ pinia/ hooks/ composables/

================================================================
METRICAS TRANSVERSALES (umbrales del perfil exigente)
================================================================

Duplicacion (DRY)         : se mide desde 1 %.
                            Topes duros: >=15% -> indice <=50
                                         >=30% -> indice <=30
                                         >=50% -> indice <=15.
Complejidad ciclomatica   : >= 6 en un metodo/funcion.
Tamano metodo/funcion     : >= 30 lineas.
Numero de parametros      : > 4.
Cohesion (LCOM aprox.)    : < 50 % (con >= 4 metodos y >= 3 campos).
Acoplamiento (CBO aprox.) : >= 8.

================================================================
COMO SE CALCULA EL INDICE (0-100)
================================================================

indice = 100 * (1 - penalizacion), y luego se aplican TOPES DUROS.
penalizacion = peso / (peso + 25).

Pesos aproximados (exigente):
  secreto hardcodeado 20, SQL por concatenacion 15, falta de capas 10,
  baja cohesion 8, alto acoplamiento 8, componente grande 6,
  metodo largo 5, complejidad alta 5, funcion larga 4, parametros de mas 4,
  HTTP en componente 3, any 2, depuracion olvidada 2.

================================================================
QUE NO SE EVALUA
================================================================

- POO/SOLID pura: no se miden god classes, %POO, herencia, interfaces,
  encapsulacion, instanceof/type-switch, new de concretos ni funciones
  fuera de clases.
- En React/Vue (<script setup>), Express o Flask los handlers viven fuera
  de clases por diseno y NO se penaliza eso. Un repo sin clases no vale 0.
- El indice no es una nota: ordena y prioriza la correccion.

================================================================
ADVERTENCIAS (falsos positivos)
================================================================

- SEC y SQL pueden dar falsos positivos: verificar archivo y linea del informe.
- DBG tambien marca print() de scripts de prueba.
- La deteccion de capas es por nombre de carpeta: usar nombres convencionales.
- En JS/TS y Python, cohesion y acoplamiento son mas ruidosos.

================================================================
CHECKLIST ANTES DE ENTREGAR
================================================================

[ ] Sin secretos en el codigo (todo por variables de entorno; claves rotadas).
[ ] Sin console.log/print/debugger en codigo de produccion.
[ ] Consultas SQL parametrizadas (nunca concatenadas).
[ ] Backend en capas: routes/ + services/ + models/.
[ ] Frontend en capas: components/ + services/ + store|hooks/;
    sin fetch/axios en componentes.
[ ] Componentes chicos (< 150 lineas) y sin 'any' (o casi).
[ ] Duplicacion <= 15 %: extraer lo repetido.
[ ] Metodos cortos (<= 30 lineas), <= 4 parametros y complejidad baja.
[ ] Clases cohesivas y poco acopladas.
[ ] >= 5 tests y, segun el tipo, >= 10 endpoints (back) o >= 8 vistas (front).
[ ] Todo subido a main (es la rama que se evalua).

# beta
beta
