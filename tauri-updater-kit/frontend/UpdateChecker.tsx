import React, { useState } from 'react';
import { useUpdater, UpdateInfo } from './useUpdater';
import './UpdateChecker.css';

// Íconos SVG embebidos y livianos para no forzar dependencias externas
const IconRefresh = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export interface UpdateCheckerProps {
  /** Nombre de tu aplicación (ej: 'MiApp'). Default: 'La aplicación' */
  appName?: string;
  /** Si debe verificar automáticamente tras iniciar. Default: true */
  autoCheck?: boolean;
  /** Retraso en ms antes de la búsqueda inicial. Default: 4000 */
  autoCheckDelay?: number;
  /** Callback al completarse la instalación de una actualización */
  onUpdateInstalled?: (info: UpdateInfo) => void;
}

/**
 * Banner flotante de actualizaciones con soporte de descarga pasiva en background.
 */
export const UpdateChecker: React.FC<UpdateCheckerProps> = ({
  appName = 'La aplicación',
  autoCheck = true,
  autoCheckDelay = 4000,
  onUpdateInstalled,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const { status, updateInfo, error, checkForUpdates } = useUpdater({
    autoCheck,
    autoCheckDelay,
    onUpdateInstalled,
  });

  if (dismissed || status === 'idle') return null;

  if (status === 'checking') {
    return (
      <div className="tau-banner tau-banner-info">
        <span className="tau-icon">
          <IconRefresh className="tau-icon-spin" />
        </span>
        <div className="tau-body">
          Buscando actualizaciones para {appName}...
        </div>
      </div>
    );
  }

  if (status === 'none') {
    return (
      <div className="tau-banner tau-banner-success">
        <span className="tau-icon">
          <IconCheck />
        </span>
        <div className="tau-body">
          {appName} está actualizado a la última versión.
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="tau-banner tau-banner-success">
        <span className="tau-icon">
          <IconCheck />
        </span>
        <div className="tau-body">
          <span className="tau-title">¡Actualización {updateInfo?.version} instalada!</span>
          Reinicia {appName} para aplicar los cambios.
          {updateInfo?.notes && (
            <details className="tau-notes-details">
              <summary>Ver notas de la versión</summary>
              <pre className="tau-notes-content">{updateInfo.notes}</pre>
            </details>
          )}
        </div>
        <button
          type="button"
          className="tau-close-btn"
          aria-label="Cerrar notificación"
          onClick={() => setDismissed(true)}
        >
          <IconClose />
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="tau-banner tau-banner-warning">
        <span className="tau-icon">
          <IconWarning />
        </span>
        <div className="tau-body">
          No se pudo verificar actualizaciones.{' '}
          <button type="button" className="tau-retry-btn" onClick={checkForUpdates}>
            Reintentar
          </button>
          {error && <div style={{ fontSize: '0.73rem', opacity: 0.8, marginTop: '0.2rem' }}>{error}</div>}
        </div>
        <button
          type="button"
          className="tau-close-btn"
          aria-label="Cerrar notificación"
          onClick={() => setDismissed(true)}
        >
          <IconClose />
        </button>
      </div>
    );
  }

  return null;
};

export interface CheckUpdatesButtonProps {
  appName?: string;
  className?: string;
}

/**
 * Botón interactivo para colocar en la pantalla de Ajustes / Configuración / Acerca de.
 */
export const CheckUpdatesButton: React.FC<CheckUpdatesButtonProps> = ({
  appName = 'La aplicación',
  className = '',
}) => {
  const { status, updateInfo, error, isChecking, checkForUpdates } = useUpdater();

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.4rem' }}>
      <button
        type="button"
        className={`tau-check-btn ${className}`}
        onClick={checkForUpdates}
        disabled={isChecking}
      >
        {isChecking ? (
          <>
            <IconRefresh className="tau-icon-spin" />
            <span>Verificando...</span>
          </>
        ) : (
          <>
            <IconDownload />
            <span>Buscar actualizaciones</span>
          </>
        )}
      </button>

      {status === 'none' && (
        <span className="tau-feedback-line" style={{ color: '#10b981' }}>
          <IconCheck /> {appName} está en su versión más reciente.
        </span>
      )}

      {status === 'done' && (
        <span className="tau-feedback-line" style={{ color: '#10b981' }}>
          <IconCheck /> Versión {updateInfo?.version} lista. Reinicia para aplicar.
        </span>
      )}

      {status === 'error' && (
        <span className="tau-feedback-line" style={{ color: '#f59e0b' }}>
          <IconWarning /> {error || 'Error al consultar actualizaciones.'}
        </span>
      )}
    </div>
  );
};
