import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, X, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
}

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'done' | 'error' | 'none';

interface Props {
  /** Check automatically on mount. Default: true */
  autoCheck?: boolean;
  /** Delay in ms before auto-check fires. Default: 5000 */
  autoCheckDelay?: number;
}

export const UpdateChecker: React.FC<Props> = ({
  autoCheck = true,
  autoCheckDelay = 5000,
}) => {
  const [state, setState]         = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [dismissed, setDismissed] = useState(false);

  const checkAndInstall = useCallback(async () => {
    setState('checking');
    setErrorMsg('');
    try {
      const result = await invoke<UpdateInfo>('check_for_updates');
      if (result.available) {
        // The Rust side already downloaded + installed → just report
        setUpdateInfo(result);
        setState('done');
      } else {
        setState('none');
        // Hide "no updates" banner after 3s
        setTimeout(() => setState('idle'), 3000);
      }
    } catch (err: any) {
      const msg = String(err);
      // Tauri updater throws when pubkey is placeholder or endpoint unreachable —
      // treat those as "no update available" silently in dev.
      if (
        msg.includes('PLACEHOLDER') ||
        msg.includes('failed to fetch') ||
        msg.includes('404') ||
        msg.includes('endpoint') ||
        msg.includes('network')
      ) {
        setState('idle');
      } else {
        setErrorMsg(msg);
        setState('error');
      }
    }
  }, []);

  useEffect(() => {
    if (!autoCheck) return;
    const timer = setTimeout(() => {
      checkAndInstall();
    }, autoCheckDelay);
    return () => clearTimeout(timer);
  }, [autoCheck, autoCheckDelay, checkAndInstall]);

  if (dismissed) return null;

  // ── Render states ─────────────────────────────────────────────────────────
  if (state === 'idle') return null;

  if (state === 'checking') {
    return (
      <UpdateBanner color="var(--text-muted)" icon={<RefreshCw size={15} className="spin" />}>
        Buscando actualizaciones...
      </UpdateBanner>
    );
  }

  if (state === 'none') {
    return (
      <UpdateBanner color="var(--status-low)" icon={<CheckCircle size={15} />}>
        WorkDesk está actualizado ✓
      </UpdateBanner>
    );
  }

  if (state === 'done') {
    return (
      <UpdateBanner
        color="var(--status-low)"
        icon={<CheckCircle size={15} />}
        onDismiss={() => setDismissed(true)}
        accent
      >
        <span style={{ fontWeight: 700 }}>
          ¡Actualización {updateInfo?.version} instalada!
        </span>{' '}
        Reinicia la aplicación para aplicar los cambios.
        {updateInfo?.notes && (
          <details style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <summary style={{ cursor: 'pointer' }}>Ver novedades</summary>
            <pre style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {updateInfo.notes}
            </pre>
          </details>
        )}
      </UpdateBanner>
    );
  }

  if (state === 'error') {
    return (
      <UpdateBanner
        color="var(--status-medium)"
        icon={<AlertTriangle size={15} />}
        onDismiss={() => setDismissed(true)}
      >
        No se pudo verificar actualizaciones.{' '}
        <button
          type="button"
          onClick={checkAndInstall}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: 700, padding: 0 }}
        >
          Reintentar
        </button>
        {errorMsg && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>{errorMsg}</span>}
      </UpdateBanner>
    );
  }

  return null;
};

// ── Manual trigger button (for Settings view) ──────────────────────────────
export const CheckUpdatesButton: React.FC = () => {
  const [state, setState]   = useState<UpdateState>('idle');
  const [info, setInfo]     = useState<UpdateInfo | null>(null);
  const [err, setErr]       = useState('');

  const check = async () => {
    setState('checking');
    setErr('');
    try {
      const result = await invoke<UpdateInfo>('check_for_updates');
      setInfo(result);
      setState(result.available ? 'done' : 'none');
    } catch (e: any) {
      setErr(String(e));
      setState('error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        type="button"
        className="btn-secondary"
        style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', alignSelf: 'flex-start' }}
        onClick={check}
        disabled={state === 'checking'}
      >
        {state === 'checking'
          ? <><RefreshCw size={14} className="spin" /> Verificando...</>
          : <><Download size={14} /> Buscar actualizaciones</>
        }
      </button>

      {state === 'none' && (
        <span style={{ fontSize: '0.8rem', color: 'var(--status-low)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <CheckCircle size={14} /> WorkDesk está actualizado.
        </span>
      )}

      {state === 'done' && info?.available && (
        <span style={{ fontSize: '0.8rem', color: 'var(--status-low)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <CheckCircle size={14} /> Actualización {info.version} instalada. Reinicia para aplicar.
        </span>
      )}

      {state === 'error' && (
        <span style={{ fontSize: '0.78rem', color: 'var(--status-medium)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <AlertTriangle size={14} /> {err || 'No se pudo verificar actualizaciones.'}
        </span>
      )}
    </div>
  );
};

// ── Shared Banner ──────────────────────────────────────────────────────────
const UpdateBanner: React.FC<{
  color: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onDismiss?: () => void;
  accent?: boolean;
}> = ({ color, icon, children, onDismiss, accent }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.65rem',
      padding: '0.75rem 1.1rem',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${color}40`,
      background: accent
        ? `linear-gradient(135deg, rgba(16,185,129,0.1), var(--bg-surface))`
        : 'var(--bg-surface)',
      fontSize: '0.82rem',
      color: 'var(--text-primary)',
      position: 'relative',
      animation: 'fadeInDown 0.3s ease',
    }}
  >
    <span style={{ color, flexShrink: 0, marginTop: '0.1rem' }}>{icon}</span>
    <div style={{ flex: 1 }}>{children}</div>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    )}
  </div>
);
