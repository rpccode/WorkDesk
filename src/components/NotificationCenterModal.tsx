import React, { useState } from 'react';
import ReactDOM from 'react-dom';
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

  const getNotificationIcon = (type: NotificationType) => {
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

  const getNotificationBorderColor = (type: NotificationType) => {
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

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 99990,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => setNotificationCenterOpen(false)}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Centro de Alertas</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {unreadCount > 0 ? `${unreadCount} alerta(s) sin leer` : 'Todo al día'}
              </p>
            </div>
          </div>

          <button
            className="btn-ghost"
            style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
            onClick={() => setNotificationCenterOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Actions Bar */}
        <div
          style={{
            padding: '0.6rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
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
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.45rem', color: 'var(--text-muted)' }}
                onClick={clearAllNotifications}
                title="Limpiar todas"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Notifications Feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {filteredNotifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="var(--status-low)" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>No hay notificaciones en esta categoría.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: n.is_read ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                  borderLeft: `4px solid ${getNotificationBorderColor(n.type)}`,
                  borderTop: '1px solid var(--border-subtle)',
                  borderRight: '1px solid var(--border-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  boxShadow: n.is_read ? 'none' : 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onClick={() => markNotificationRead(n.id)}
              >
                {!n.is_read && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary)',
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {getNotificationIcon(n.type)}
                  <span style={{ fontSize: '0.84rem', fontWeight: n.is_read ? 600 : 800, color: 'var(--text-primary)' }}>
                    {n.title}
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {n.message}
                </p>

                {/* Actions row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {formatRelativeDate(n.created_at)}
                  </span>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {!n.is_read && (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', color: 'var(--text-muted)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationRead(n.id);
                        }}
                      >
                        Marcar leída
                      </button>
                    )}

                    {n.action_label && (
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(n);
                        }}
                      >
                        <ExternalLink size={12} /> {n.action_label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
