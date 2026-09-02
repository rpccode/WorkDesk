export interface AppErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  source?: string;
  url?: string;
  userAgent?: string;
}

export const ERROR_LOG_STORAGE_KEY = 'workdesk_error_log_v1';
const MAX_LOGS = 50;

/**
 * Obtiene todos los errores registrados en el almacenamiento persistente
 */
export function getErrorLogs(): AppErrorLogEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(ERROR_LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading error logs:', e);
    return [];
  }
}

/**
 * Registra un error de forma persistente
 */
export function logAppError(
  error: Error | string,
  details?: Partial<AppErrorLogEntry>
): AppErrorLogEntry {
  const isErrObj = error instanceof Error;
  const message = isErrObj ? error.message : String(error || 'Error no especificado');
  const stack = isErrObj ? error.stack : details?.stack;

  const entry: AppErrorLogEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    message,
    stack,
    componentStack: details?.componentStack,
    source: details?.source || 'React / Window',
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  try {
    const existing = getErrorLogs();
    const updated = [entry, ...existing].slice(0, MAX_LOGS);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ERROR_LOG_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('Could not persist error log:', e);
  }

  return entry;
}

/**
 * Limpia el historial de errores
 */
export function clearErrorLogs(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ERROR_LOG_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error clearing error logs:', e);
  }
}

/**
 * Formatea los registros de errores como texto plano (.txt) estructurado para diagnóstico
 */
export function formatErrorLogsAsText(logs?: AppErrorLogEntry[]): string {
  const list = logs || getErrorLogs();
  const now = new Date().toISOString();
  const sep = '='.repeat(70);
  const subSep = '-'.repeat(70);

  let text = `${sep}\n`;
  text += ` WORKDESK — REGISTRO DE ERRORES Y DIAGNÓSTICO DEL SISTEMA\n`;
  text += ` Generado: ${now}\n`;
  text += ` Total de incidencias registradas: ${list.length}\n`;
  text += `${sep}\n\n`;

  if (typeof navigator !== 'undefined') {
    text += `INFORMACIÓN DEL ENTORNO:\n`;
    text += `- Plataforma: ${navigator.platform || 'N/A'}\n`;
    text += `- User Agent: ${navigator.userAgent || 'N/A'}\n`;
    if (typeof window !== 'undefined') {
      text += `- Resolución de Pantalla: ${window.innerWidth}x${window.innerHeight} (DevicePixelRatio: ${window.devicePixelRatio})\n`;
      text += `- URL / Ruta Activa: ${window.location.href}\n`;
    }
    text += `\n${subSep}\n\n`;
  }

  if (list.length === 0) {
    text += `No se registran errores en el historial. El sistema ha operado con normalidad.\n`;
    return text;
  }

  list.forEach((log, index) => {
    text += `[ERROR #${index + 1}] — ${log.timestamp}\n`;
    text += `Mensaje: ${log.message}\n`;
    if (log.source) text += `Origen: ${log.source}\n`;
    if (log.componentStack) {
      text += `Component Stack (React):\n${log.componentStack.trim()}\n`;
    }
    if (log.stack) {
      text += `Call Stack:\n${log.stack.trim()}\n`;
    }
    text += `\n${subSep}\n\n`;
  });

  return text;
}

/**
 * Dispara la descarga automática de un archivo .txt con todos los errores
 */
export function downloadErrorLogsTxt(logs?: AppErrorLogEntry[], customFilename?: string): void {
  const text = formatErrorLogsAsText(logs);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = customFilename || `workdesk_error_log_${dateStr}_${timeStr}.txt`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copia el registro de errores en formato texto al portapapeles
 */
export async function copyErrorLogsToClipboard(logs?: AppErrorLogEntry[]): Promise<boolean> {
  const text = formatErrorLogsAsText(logs);
  try {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
