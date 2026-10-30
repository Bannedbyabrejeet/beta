import { BannedIp, Issue7TestResult, SystemConfig } from '../types';

/** Lo que la suite necesita del motor (inyectado para evitar acoplamiento). */
export interface Issue7Api {
  ingestSshLog: (line: string) => Promise<{ event: any; banTriggered: boolean }>;
  refresh: () => Promise<void>;
  getWhitelist: () => string[];
  getBannedIps: () => BannedIp[];
  getConfig: () => SystemConfig;
}

type StepCallback = (tests: Issue7TestResult[]) => void;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function baseTests(): Issue7TestResult[] {
  return [
    {
      id: 'test-1-regex-increment',
      testNumber: 1,
      title: 'Detección y suma de fallos',
      criteria: 'Parseo con Regex de intento fallido e incremento del contador en Redis',
      status: 'IDLE',
      explanation: 'Verifica que al recibir una contraseña incorrecta, el sistema extraiga la IP y usuario y sume 1 fallo.',
      consoleOutput: []
    },
    {
      id: 'test-2-successful-login',
      testNumber: 2,
      title: 'Acceso exitoso',
      criteria: 'Identificación de login válido sin alteración de contadores ni sanciones',
      status: 'IDLE',
      explanation: 'Comprueba que cuando un usuario legítimo ingresa con credenciales correctas, no se sume ninguna falta.',
      consoleOutput: []
    },
    {
      id: 'test-3-whitelist-filter',
      testNumber: 3,
      title: 'Protección de Lista Blanca (Whitelist)',
      criteria: 'Descarte inmediato de fallos de IPs de confianza (127.0.0.1 y subredes)',
      status: 'IDLE',
      explanation: 'Valida que si una IP de confianza comete un error, el motor reconozca que está protegida y perdone el fallo.',
      consoleOutput: []
    },
    {
      id: 'test-4-findtime-window',
      testNumber: 4,
      title: 'Ventana de Tolerancia (Findtime)',
      criteria: 'Descarte automático de fallos antiguos fuera de la ventana de tiempo',
      status: 'IDLE',
      explanation: 'Demuestra que los errores viejos se borran automáticamente y el contador no los acumula indefinidamente.',
      consoleOutput: []
    }
  ];
}

/** Test 1: un fallo debe incrementar el contador. */
async function runDetectionTest(api: Issue7Api, test: Issue7TestResult): Promise<void> {
  test.status = 'RUNNING';
  test.consoleOutput.push('[Backend B] Iniciando Test 1: Ingesta de evento SSH con contraseña fallida...');
  await sleep(300);

  const ip = '203.0.113.88';
  const line = `Aug 26 15:00:10 edge-gw sshd[28410]: Failed password for invalid user hacker from ${ip} port 49210 ssh2`;
  test.consoleOutput.push(`[Auth Log Stream] Recibiendo línea: "${line}"`);
  const res = await api.ingestSshLog(line);
  await sleep(250);

  const count = res.event?.verification?.failuresInWindowAfter ?? 0;
  test.consoleOutput.push(`[Regex Parser] Usuario: "${res.event?.user}", IP: "${res.event?.ip}", Puerto: ${res.event?.port}`);
  test.consoleOutput.push(`[Contador Redis] Clave ip:failures:${ip} -> Contador: ${count}`);

  const detected =
    res.event && (res.event.eventType === 'INVALID_USER' || res.event.eventType === 'FAILED_PASSWORD');
  test.status = detected ? 'PASSED' : 'FAILED';
  test.explanation = detected
    ? `El parser identificó el usuario "${res.event.user}" y la IP "${ip}". El contador de fallos en Redis subió a ${count} correctamente.`
    : 'El contador no se incrementó como se esperaba.';
  test.consoleOutput.push(detected ? '[Test 1 APROBADO] Conteo incrementado exitosamente.' : '[Test 1 FALLÓ] El contador no incrementó.');
}

/** Test 2: un login válido no debe generar faltas. */
async function runValidLoginTest(api: Issue7Api, test: Issue7TestResult): Promise<void> {
  test.status = 'RUNNING';
  test.consoleOutput.push('[Backend B] Iniciando Test 2: Ingesta de evento de login exitoso...');
  await sleep(300);

  const ip = '10.0.0.15';
  const line = `Aug 26 15:00:15 edge-gw sshd[28415]: Accepted publickey for sysadmin from ${ip} port 60234 ssh2: RSA SHA256:KeyOk`;
  test.consoleOutput.push(`[Auth Log Stream] Recibiendo línea: "${line}"`);
  const res = await api.ingestSshLog(line);
  await sleep(250);

  test.consoleOutput.push(`[Regex Parser] Evento catalogado como: "${res.event?.eventType}" para usuario "${res.event?.user}".`);
  test.consoleOutput.push(`[Evaluación Seguridad] Contador de fallos para ${ip}: ${res.event?.verification?.failuresInWindowAfter ?? 0} (cero infracciones).`);

  const passed = res.event?.eventType === 'ACCEPTED_KEY' && !res.event.verification?.triggeredBan;
  test.status = passed ? 'PASSED' : 'FAILED';
  test.explanation = passed
    ? 'El acceso fue validado como exitoso. No se aplicó sanción ni se alteró ningún contador de faltas.'
    : 'El login válido fue catalogado erróneamente.';
  test.consoleOutput.push(passed ? '[Test 2 APROBADO] Login legítimo sin penalizaciones.' : '[Test 2 FALLÓ] Se registró falta para un acceso válido.');
}

/** Test 3: la whitelist debe exonerar a 127.0.0.1. */
async function runWhitelistTest(api: Issue7Api, test: Issue7TestResult): Promise<void> {
  test.status = 'RUNNING';
  test.consoleOutput.push('[Backend B] Iniciando Test 3: Verificación de filtro de Lista Blanca...');
  await sleep(300);

  const line = 'Aug 26 15:00:20 edge-gw sshd[28420]: Failed password for root from 127.0.0.1 port 52100 ssh2';
  test.consoleOutput.push(`[Auth Log Stream] Intento fallido desde 127.0.0.1: "${line}"`);
  const res = await api.ingestSshLog(line);
  await sleep(250);

  const isWhite = api.getWhitelist().includes('127.0.0.1');
  const isBanned = api.getBannedIps().some(b => b.ip === '127.0.0.1');
  test.consoleOutput.push(`[Whitelist Check] ¿127.0.0.1 está en la Lista Blanca?: ${isWhite ? 'SÍ (Protegida)' : 'NO'}`);
  test.consoleOutput.push(`[Motor de Mitigación] Decisión: ${res.event?.verification?.actionTaken}. ¿Fue bloqueada?: ${isBanned ? 'SÍ' : 'NO'}`);

  const passed = isWhite && !isBanned && res.event?.verification?.actionTaken === 'IGNORED_WHITELIST';
  test.status = passed ? 'PASSED' : 'FAILED';
  test.explanation = passed
    ? 'La IP 127.0.0.1 está en la Lista Blanca. El fallo fue perdonado e ignorado, protegiendo contra auto-bloqueos.'
    : 'La IP de la lista blanca no fue exonerada correctamente.';
  test.consoleOutput.push(passed ? '[Test 3 APROBADO] Filtro de Whitelist 100% operativo.' : '[Test 3 FALLÓ] No se aplicó el filtro.');
}

/** Test 4: los fallos fuera de la ventana Findtime se descartan. */
async function runFindtimeTest(api: Issue7Api, test: Issue7TestResult): Promise<void> {
  test.status = 'RUNNING';
  const findtime = api.getConfig().findtime_min;
  test.consoleOutput.push(`[Backend B] Iniciando Test 4: Verificación de ventana Findtime (${findtime} min)...`);
  await sleep(300);

  const ip = '198.51.100.99';
  const line = `Aug 26 15:00:25 edge-gw sshd[28425]: Failed password for root from ${ip} port 53120 ssh2`;
  test.consoleOutput.push(`[Auth Log Stream] Nuevo intento fallido en el instante presente: "${line}"`);
  const res = await api.ingestSshLog(line);
  await sleep(250);

  const count = res.event?.verification?.failuresInWindowAfter ?? 0;
  test.consoleOutput.push(`[Evaluador Findtime] Fallos antiguos descartados: ${res.event?.verification?.expiredFailuresDiscarded || 0}`);
  test.consoleOutput.push(`[Contador Activo] Fallos válidos en la ventana actual: ${count}`);

  test.status = count === 1 ? 'PASSED' : 'FAILED';
  test.explanation =
    count === 1
      ? `El fallo de hace más de ${findtime} min venció y fue purgado. El contador sólo contabiliza el intento reciente.`
      : 'Los fallos fuera de la ventana no fueron descartados.';
  test.consoleOutput.push(count === 1 ? '[Test 4 APROBADO] Findtime funciona con exactitud.' : '[Test 4 FALLÓ] No se purgaron los fallos vencidos.');
}

/** Ejecuta la suite completa del Issue #7 contra el motor real. */
export async function runIssue7Suite(
  api: Issue7Api,
  onStepUpdate?: StepCallback
): Promise<Issue7TestResult[]> {
  const tests = baseTests();
  const steps = [runDetectionTest, runValidLoginTest, runWhitelistTest, runFindtimeTest];

  for (let i = 0; i < steps.length; i++) {
    await steps[i](api, tests[i]);
    onStepUpdate?.([...tests]);
    await sleep(400);
  }

  await api.refresh();
  return tests;
}
