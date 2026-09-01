import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, RefreshCw, Clock, AlertTriangle, Zap, X } from 'lucide-react';
import { backgroundEngine, type BackgroundServiceStats } from '../services/background-service';
import { useStore } from '../store';
import { playNotificationSound } from '../utils/live-alerts';

export const BackgroundStatusWidget: React.FC = () => {
  const { consultantPreferences, updateConsultantPreferences } = useStore();
  const [stats, setStats] = useState<BackgroundServiceStats>(backgroundEngine.getStats());
  const [isOpen, setIsOpen] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = backgroundEngine.subscribe((newStats) => {
      setStats(newStats);
    });
    return () => unsubscribe();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleForceScan = async () => {
    setIsForcing(true);
    playNotificationSound('info');
    await backgroundEngine.forceScanNow();
    setTimeout(() => setIsForcing(false), 800);
  };

  const handleToggleWatchdog = () => {
    const updated = !consultantPreferences.enable_background_watchdog;
    updateConsultantPreferences({
      ...consultantPreferences,
      enable_background_watchdog: updated,
    });
    if (updated) {
      backgroundEngine.start(consultantPreferences.background_check_interval_seconds || 60);
    }
    playNotificationSound('success');
  };

  const formatLastScan = () => {
    if (!stats.lastScanTime) return 'Iniciando...';
    return stats.lastScanTime.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Navbar Status Pill */}
      <button
        type="button"
        className="btn-ghost"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.65rem',
          fontSize: '0.74rem',
          borderRadius: '20px',
          backgroundColor: consultantPreferences.enable_background_watchdog ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
          border: consultantPreferences.enable_background_watchdog ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
          color: consultantPreferences.enable_background_watchdog ? 'var(--status-low)' : 'var(--text-muted)',
          cursor: 'pointer',
        }}
        title="Estado del Servicio en Segundo Plano (SLA & Vigilante)"
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: consultantPreferences.enable_background_watchdog ? 'var(--status-low)' : 'var(--text-muted)',
            boxShadow: consultantPreferences.enable_background_watchdog ? '0 0 6px var(--status-low)' : 'none',
          }}
        />
        <ShieldCheck size={13} />
        <span style={{ fontWeight: 700 }}>
          {consultantPreferences.enable_background_watchdog ? 'Segundo Plano Activo' : 'En Pausa'}
        </span>
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          className="glass-card animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '1.15rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.35rem', borderRadius: '6px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                <Zap size={15} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0 }}>
                  Motor en Segundo Plano
                </h4>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Monitoreo de SLA, vencimientos y correos
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', padding: '0.2rem', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Service Toggle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>
                Vigilante Activo
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Cada {consultantPreferences.background_check_interval_seconds || 60} segundos
              </span>
            </div>

            <button
              type="button"
              className={consultantPreferences.enable_background_watchdog ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
              onClick={handleToggleWatchdog}
            >
              {consultantPreferences.enable_background_watchdog ? 'Activado' : 'Pausado'}
            </button>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ padding: '0.55rem 0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--status-critical)', fontSize: '0.7rem', fontWeight: 700 }}>
                <AlertTriangle size={12} /> Vencidos
              </div>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.15rem 0 0 0', color: stats.overdueCount > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                {stats.overdueCount}
              </p>
            </div>

            <div style={{ padding: '0.55rem 0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--status-medium)', fontSize: '0.7rem', fontWeight: 700 }}>
                <Clock size={12} /> Vencen Hoy
              </div>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.15rem 0 0 0', color: stats.dueTodayCount > 0 ? 'var(--status-medium)' : 'var(--text-primary)' }}>
                {stats.dueTodayCount}
              </p>
            </div>
          </div>

          {/* Status info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Último ciclo:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatLastScan()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cuentas de Correo:</span>
              <strong style={{ color: 'var(--accent-primary)' }}>{stats.emailsCheckedCount} enlazadas</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Notificaciones Escritorio:</span>
              <strong style={{ color: consultantPreferences.enable_desktop_notifications ? 'var(--status-low)' : 'var(--text-muted)' }}>
                {consultantPreferences.enable_desktop_notifications ? 'Habilitadas' : 'Desactivadas'}
              </strong>
            </div>
          </div>

          {/* Force Scan Action */}
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
            onClick={handleForceScan}
            disabled={isForcing}
          >
            <RefreshCw size={13} className={isForcing ? 'animate-spin' : ''} />
            {isForcing ? 'Escaneando...' : 'Ejecutar Escaneo Ahora'}
          </button>
        </div>
      )}
    </div>
  );
};
