import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useStore } from '../store';

/**
 * Aviso no bloqueante: los datos mostrados provienen de la caché local
 * porque la sincronización con la base de datos falló. El usuario debe poder
 * distinguir "información vieja" de "información actual" sin leer la consola.
 */
export const StaleDataBanner: React.FC = () => {
  const { isStaleData, lastSyncError, refreshAll } = useStore();
  const [isRetrying, setIsRetrying] = React.useState(false);

  if (!isStaleData) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refreshAll();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.6rem 0.9rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--status-medium-bg)',
        border: '1px solid var(--status-medium-border)',
        color: 'var(--text-primary)',
        fontSize: '0.82rem',
      }}
    >
      <AlertTriangle size={15} color="var(--status-medium)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        <strong style={{ color: 'var(--status-medium-text)' }}>Mostrando datos guardados.</strong>{' '}
        {lastSyncError || 'No se pudo sincronizar con la base de datos.'} La información puede no estar al día.
      </span>
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={handleRetry}
        disabled={isRetrying}
        style={{ flexShrink: 0, color: 'var(--accent-primary-text)', borderColor: 'var(--accent-border)' }}
      >
        <RefreshCw size={13} className={isRetrying ? 'animate-spin' : ''} />
        {isRetrying ? 'Reintentando...' : 'Reintentar'}
      </button>
    </div>
  );
};
