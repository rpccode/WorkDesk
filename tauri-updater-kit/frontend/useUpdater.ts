import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'done' | 'error' | 'none';

export interface UseUpdaterOptions {
  /** Si debe buscar automáticamente al montar. Default: false */
  autoCheck?: boolean;
  /** Retraso en ms antes de ejecutar autoCheck. Default: 3000 */
  autoCheckDelay?: number;
  /** Callback opcional al completar instalación */
  onUpdateInstalled?: (info: UpdateInfo) => void;
}

export function useUpdater(options: UseUpdaterOptions = {}) {
  const { autoCheck = false, autoCheckDelay = 3000, onUpdateInstalled } = options;

  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    setStatus('checking');
    setError(null);

    try {
      const result = await invoke<UpdateInfo>('check_for_updates');
      if (result.available) {
        setUpdateInfo(result);
        setStatus('done');
        if (onUpdateInstalled) {
          onUpdateInstalled(result);
        }
      } else {
        setStatus('none');
        // Vuelve a idle después de 3.5 segundos si no hubo actualizaciones
        setTimeout(() => {
          setStatus(current => (current === 'none' ? 'idle' : current));
        }, 3500);
      }
      return result;
    } catch (err: unknown) {
      const msg = String(err);
      // Ignorar errores comunes en desarrollo o sin conexión configurada
      if (
        msg.includes('PLACEHOLDER') ||
        msg.includes('failed to fetch') ||
        msg.includes('404') ||
        msg.includes('endpoint') ||
        msg.includes('network')
      ) {
        setStatus('idle');
        return { available: false };
      }

      setError(msg);
      setStatus('error');
      return { available: false, error: msg };
    }
  }, [onUpdateInstalled]);

  useEffect(() => {
    if (!autoCheck) return;
    const timer = setTimeout(() => {
      checkForUpdates();
    }, autoCheckDelay);
    return () => clearTimeout(timer);
  }, [autoCheck, autoCheckDelay, checkForUpdates]);

  return {
    status,
    updateInfo,
    error,
    isChecking: status === 'checking',
    isDone: status === 'done',
    checkForUpdates,
    reset: () => {
      setStatus('idle');
      setError(null);
    },
  };
}
