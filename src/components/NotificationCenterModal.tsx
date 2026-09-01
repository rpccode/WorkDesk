import React, { useState } from 'react';
import { useStore } from '../store';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Info,
  ExternalLink,
} from 'lucide-react';
import { formatRelativeDate } from '../utils/date';
import type { AppNotification, NotificationType } from '../types';

export const NotificationCenterModal: React.FC = () => {
  const {
    isNotificationCenterOpen,
    setNotificationCenterOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    setSelectedCaseId,
    setActiveTab,
  } = useStore();

  const [filterType, setFilterType] = useState<string>('all');

  if (!isNotificationCenterOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'critical') return n.type === 'critical';
    if (filterType === 'email') return n.type === 'email';
    if (filterType === 'warning') return n.type === 'warning';
    if (filterType === 'unread') return !n.is_read;
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'critical':
        return <AlertCircle size={17} color="var(--status-critical)" />;
      case 'warning':
        return <AlertTriangle size={17} color="var(--status-medium)" />;
      case 'email':
        return <Mail size={17} color="var(--accent-primary)" />;
      case 'success':
        return <CheckCircle2 size={17} color="var(--status-low)" />;
      default:
        return <Info size={17} color="var(--text-secondary)" />;
    }
  };

  const handleAction = (n: AppNotification) => {
    markNotificationRead(n.id);
    setNotificationCenterOpen(false);

    if (n.action_type === 'open_case' && n.case_id) {
      setSelectedCaseId(n.case_id);
    } else if (n.action_type === 'open_commitment') {
      setActiveTab('commitments');
    } else if (n.action_type === 'open_email') {
      setActiveTab('emails');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 9985,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => setNotificationCenterOpen(false)}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.4rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                padding: '0.4rem',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Centro de Alertas</h3>
                {unreadCount > 0 && (
                  <span className="nav-badge nav-badge-critical" style={{ fontSize: '0.65rem' }}>
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                Monitoreo operativo y avisos en vivo
              </p>
            </div>
          </div>

          <button
            className="btn-ghost"
            style={{ padding: '0.35rem' }}
            onClick={() => setNotificationCenterOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Action controls & Filter bar */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-main)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          {/* Quick actions row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                type="button"
                className={`btn-ghost ${filterType === 'all' ? 'active' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setFilterType('all')}
              >
                Todas ({notifications.length})
              </button>
              <button
                type="button"
                className={`btn-ghost ${filterType === 'unread' ? 'active' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setFilterType('unread')}
              >
                Sin leer ({unreadCount})
              </button>
              <button
                type="button"
                className={`btn-ghost ${filterType === 'critical' ? 'active' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setFilterType('critical')}
              >
                🚨 Críticas
              </button>
              <button
                type="button"
                className={`btn-ghost ${filterType === 'email' ? 'active' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setFilterType('email')}
              >
                ✉️ Correos
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.45rem', color: 'var(--accent-primary)' }}
                  onClick={markAllNotificationsRead}
                  title="Marcar todas como leídas"
                >
                  <CheckCheck size={13} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.45rem', color: 'var(--status-critical)' }}
                  onClick={clearAllNotifications}
                  title="Limpiar todo el historial"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications Feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.35, color: 'var(--status-low)' }} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ¡Operación al Día!
              </h4>
              <p style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
                No tienes alertas pendientes en este filtro.
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '0.9rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: n.is_read ? 'var(--bg-surface-elevated)' : 'rgba(37,99,235,0.06)',
                  border: `1px solid ${n.is_read ? 'var(--border-subtle)' : 'rgba(37,99,235,0.3)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {getIcon(n.type)}
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {n.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {formatRelativeDate(n.created_at)}
                  </span>
                </div>

                {/* Message */}
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                  {n.message}
                </p>

                {/* Actions row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                  {!n.is_read ? (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', color: 'var(--text-muted)' }}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      Marcar leída
                    </button>
                  ) : <div />}

                  {n.action_label && (
                    <button
                      className="btn-primary"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                      onClick={() => handleAction(n)}
                    >
                      <ExternalLink size={12} /> {n.action_label}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
