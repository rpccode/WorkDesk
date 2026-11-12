import React, { useEffect } from 'react';
import { useStore } from '../store';
import {
  AlertTriangle,
  AlertCircle,
  Mail,
  CheckCircle2,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';
import type { AppNotification, NotificationType } from '../types';

/**
 * Tope de notificaciones apiladas visibles. El excedente se resume en un
 * contador que abre el Centro de Alertas, de modo que el stack nunca invade
 * las acciones primarias de la cabecera ni los enlaces de panel.
 */
const MAX_VISIBLE = 2;

interface LiveToastItemProps {
  toast: AppNotification;
  onDismiss: (id: string) => void;
  onAction: (toast: AppNotification) => void;
}

const LiveToastItem: React.FC<LiveToastItemProps> = ({ toast, onDismiss, onAction }) => {
  useEffect(() => {
    // Auto dismiss after 6 seconds (unless critical)
    const timeout = toast.type === 'critical' ? 10000 : 6000;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, timeout);

    return () => clearTimeout(timer);
  }, [toast.id, toast.type]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'critical':
        return <AlertCircle size={18} color="var(--status-critical-text)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--status-medium-text)" />;
      case 'email':
        return <Mail size={18} color="var(--accent-primary-text)" />;
      case 'success':
        return <CheckCircle2 size={18} color="var(--status-low-text)" />;
      default:
        return <Info size={18} color="var(--text-secondary)" />;
    }
  };

  const getBorderColor = (type: NotificationType) => {
    switch (type) {
      case 'critical':
        return 'var(--status-critical-border)';
      case 'warning':
        return 'var(--status-medium-border)';
      case 'email':
        return 'var(--accent-border)';
      case 'success':
        return 'var(--status-low-border)';
      default:
        return 'var(--border-subtle)';
    }
  };

  return (
    <div
      role={toast.type === 'critical' ? 'alert' : 'status'}
      aria-live={toast.type === 'critical' ? 'assertive' : 'polite'}
      className="glass-card animate-slide-up"
      style={{
        width: '340px',
        padding: '0.6rem 0.85rem',
        backgroundColor: 'var(--bg-surface-elevated)',
        border: `1px solid ${getBorderColor(toast.type)}`,
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        pointerEvents: 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
          {getIcon(toast.type)}
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {toast.title}
          </span>
        </div>
        <button
          type="button"
          className="btn-icon btn-sm btn-ghost"
          style={{ width: '24px', height: '24px', color: 'var(--text-muted)' }}
          onClick={() => onDismiss(toast.id)}
          aria-label={`Cerrar alerta: ${toast.title}`}
        >
          <X size={14} />
        </button>
      </div>

      {/* Message body */}
      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.35, margin: 0, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {toast.message}
      </p>

      {/* Action button if available */}
      {toast.action_label && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
          <button
            className="btn-secondary"
            style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.6rem',
              color: 'var(--accent-primary-text)',
              borderColor: 'var(--accent-border)',
            }}
            onClick={() => onAction(toast)}
          >
            <ExternalLink size={12} /> {toast.action_label}
          </button>
        </div>
      )}
    </div>
  );
};

interface LiveToastContainerProps {
  /**
   * 'inline' (por defecto) reserva su propia banda dentro del layout, de modo
   * que nunca se superpone a la cabecera, a las tablas ni a los modales.
   * 'overlay' se usa en el mini-widget, que ocupa toda la ventana.
   */
  variant?: 'inline' | 'overlay';
}

export const LiveToastContainer: React.FC<LiveToastContainerProps> = ({ variant = 'inline' }) => {
  const { activeToasts, dismissToast, setSelectedCaseId, setActiveTab, setNotificationCenterOpen } = useStore();

  if (activeToasts.length === 0) return null;

  const visible = activeToasts.slice(0, MAX_VISIBLE);
  const overflow = activeToasts.length - visible.length;

  const handleAction = (toast: AppNotification) => {
    dismissToast(toast.id);
    if (toast.action_type === 'open_case' && toast.case_id) {
      setSelectedCaseId(toast.case_id);
    } else if (toast.action_type === 'open_commitment') {
      setActiveTab('commitments');
    } else if (toast.action_type === 'open_email') {
      setActiveTab('emails');
    }
  };

  const isOverlay = variant === 'overlay';

  return (
    <div
      style={
        isOverlay
          ? {
              position: 'fixed',
              bottom: '1.25rem',
              right: '1.25rem',
              zIndex: 'var(--z-toast)',
              display: 'flex',
              flexDirection: 'column-reverse',
              gap: '0.6rem',
              pointerEvents: 'none',
            }
          : {
              // Banda propia: nunca se superpone al contenido ni a los modales.
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'flex-start',
              gap: '0.6rem',
              flexWrap: 'wrap',
              padding: '0.6rem 2.25rem 0.85rem',
              pointerEvents: 'none',
            }
      }
    >
      {visible.map((t) => (
        <LiveToastItem
          key={t.id}
          toast={t}
          onDismiss={dismissToast}
          onAction={handleAction}
        />
      ))}

      {overflow > 0 && (
        <button
          type="button"
          onClick={() => setNotificationCenterOpen(true)}
          className="btn-secondary"
          style={{
            pointerEvents: 'auto',
            width: '340px',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            padding: '0.5rem 0.9rem',
            color: 'var(--text-secondary)',
            borderColor: 'var(--border-medium)',
          }}
        >
          <span>+{overflow} notificación{overflow > 1 ? 'es' : ''} más</span>
          <span style={{ color: 'var(--accent-primary-text)', fontWeight: 700 }}>Ver todas</span>
        </button>
      )}
    </div>
  );
};
