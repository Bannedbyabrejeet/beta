import { defineConfig } from 'vitest/config';

/**
 * Configuración de tests y cobertura.
 *
 * Alcance de la cobertura: la **capa de servicios** (`src/services`), que es
 * donde vive la lógica de negocio y el acceso a la API. Los componentes de
 * presentación (`src/components`) no se instrumentan: se validan a mano contra
 * el backend real (ver MANUAL_EJECUCION.md).
 *
 * Genera `coverage/coverage.xml` (Cobertura) y `coverage.json` (resumen).
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json-summary', 'cobertura'],
      include: ['src/services/**/*.ts'],
      // apiTypes.ts sólo declara tipos (no genera código ejecutable)
      exclude: ['src/services/**/*.d.ts', 'src/services/apiTypes.ts', 'src/services/**/index.ts'],
      all: true
    }
  }
});
