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
        return <AlertCircle size={18} color="var(--status-critical)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--status-medium)" />;
      case 'email':
        return <Mail size={18} color="var(--accent-primary)" />;
      case 'success':
        return <CheckCircle2 size={18} color="var(--status-low)" />;
      default:
        return <Info size={18} color="var(--text-secondary)" />;
    }
  };

  const getBorderColor = (type: NotificationType) => {
    switch (type) {
      case 'critical':
        return 'var(--status-critical)';
      case 'warning':
        return 'var(--status-medium)';
      case 'email':
        return 'var(--accent-primary)';
      case 'success':
        return 'var(--status-low)';
      default:
        return 'var(--border-subtle)';
    }
  };

  return (
    <div
      className="glass-card animate-slide-up"
      style={{
        width: '360px',
        padding: '0.9rem 1.1rem',
        backgroundColor: 'var(--bg-surface-elevated)',
        borderLeft: `4px solid ${getBorderColor(toast.type)}`,
        boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        pointerEvents: 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {getIcon(toast.type)}
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {toast.title}
          </span>
        </div>
        <button
          className="btn-ghost"
          style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
          onClick={() => onDismiss(toast.id)}
          title="Cerrar alerta"
        >
          <X size={14} />
        </button>
      </div>

      {/* Message body */}
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
        {toast.message}
      </p>

      {/* Action button if available */}
      {toast.action_label && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
          <button
            className="btn-secondary"
            style={{
              fontSize: '0.73rem',
              padding: '0.25rem 0.6rem',
              color: 'var(--accent-primary)',
              borderColor: 'var(--accent-glow)',
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

export const LiveToastContainer: React.FC = () => {
  const { activeToasts, dismissToast, setSelectedCaseId, setActiveTab } = useStore();

  if (activeToasts.length === 0) return null;

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

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        pointerEvents: 'none',
      }}
    >
      {activeToasts.map((t) => (
        <LiveToastItem
          key={t.id}
          toast={t}
          onDismiss={dismissToast}
          onAction={handleAction}
        />
      ))}
    </div>
  );
};
