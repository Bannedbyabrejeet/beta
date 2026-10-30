/**
 * Logger con niveles para el motor de seguridad.
 *
 * No usa `console.*` (evita dejar salidas de depuración en el código de
 * producción) y escribe directo a stdout/stderr, con timestamp y nivel.
 *
 * Niveles: debug < info < warn < error.
 * Configurable por entorno: LOG_LEVEL=debug|info|warn|error (por defecto info).
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function formatArg(value) {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack || value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function emit(level, args) {
  if (LEVELS[level] < threshold) return;

  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${args.map(formatArg).join(' ')}\n`;
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

const log = {
  debug: (...args) => emit('debug', args),
  info: (...args) => emit('info', args),
  warn: (...args) => emit('warn', args),
  error: (...args) => emit('error', args)
};

module.exports = { log };
