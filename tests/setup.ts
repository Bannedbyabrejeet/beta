/**
 * Entorno mínimo para los tests: la app corre en el navegador, pero los tests
 * se ejecutan en Node. Acá se stubean `localStorage` y `window`.
 */

const store = new Map<string, string>();

const localStorageStub = {
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
  get length() {
    return store.size;
  }
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageStub,
  writable: true,
  configurable: true
});

Object.defineProperty(globalThis, 'window', {
  value: { location: { origin: 'http://localhost:3000' } },
  writable: true,
  configurable: true
});
