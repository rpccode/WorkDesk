import { describe, it, expect, beforeEach } from 'vitest';
import {
  logAppError,
  getErrorLogs,
  clearErrorLogs,
  formatErrorLogsAsText,
  ERROR_LOG_STORAGE_KEY,
} from '../../src/utils/error-logger';

describe('error-logger utility', () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    };
    (globalThis as any).localStorage = mockStorage;
  });

  it('logs errors and retrieves them from storage', () => {
    clearErrorLogs();
    const entry = logAppError(new Error('Prueba de error en tiempo de ejecución'), {
      source: 'Test Unit',
      componentStack: 'in ComponentUnderTest',
    });

    expect(entry.message).toBe('Prueba de error en tiempo de ejecución');
    expect(entry.source).toBe('Test Unit');
    expect(entry.componentStack).toBe('in ComponentUnderTest');

    const logs = getErrorLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].message).toBe('Prueba de error en tiempo de ejecución');
  });

  it('formats error logs properly as readable diagnostic text', () => {
    clearErrorLogs();
    logAppError('Error de red al sincronizar correos');
    logAppError(new TypeError('Cannot read properties of undefined'));

    const text = formatErrorLogsAsText();
    expect(text).toContain('WORKDESK — REGISTRO DE ERRORES Y DIAGNÓSTICO DEL SISTEMA');
    expect(text).toContain('Error de red al sincronizar correos');
    expect(text).toContain('Cannot read properties of undefined');
    expect(text).toContain('Total de incidencias registradas: 2');
  });

  it('clears all error logs when clearErrorLogs is called', () => {
    logAppError('Error temporal 1');
    logAppError('Error temporal 2');
    expect(getErrorLogs().length).toBeGreaterThan(0);

    clearErrorLogs();
    expect(getErrorLogs().length).toBe(0);
  });
});
