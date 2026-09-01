import React, { useEffect, useState, useRef } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Clock,
  AlertTriangle,
  Zap,
  X,
  Minimize2,
  LayoutTemplate,
  ChevronDown,
} from 'lucide-react';
import { backgroundEngine, type BackgroundServiceStats } from '../services/background-service';
import { useStore } from '../store';
import { api } from '../api/tauri';
import { playNotificationSound } from '../utils/live-alerts';

interface BackgroundStatusWidgetProps {
  onToggleMiniWidget?: () => void;
  fullWidth?: boolean;
}

export const BackgroundStatusWidget: React.FC<BackgroundStatusWidgetProps> = ({
  onToggleMiniWidget,
  fullWidth = false,
}) => {
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

  const handleMinimizeToTray = async () => {
    setIsOpen(false);
    try {
      await api.hideToTray();
    } catch (_) {}
  };

  const formatLastScan = () => {
    if (!stats.lastScanTime) return 'Iniciando...';
    return stats.lastScanTime.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      {/* Status Pill Trigger */}
      <button
        type="button"
        className="btn-ghost"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: fullWidth ? 'space-between' : 'flex-start',
          gap: '0.4rem',
          padding: '0.35rem 0.65rem',
          fontSize: '0.72rem',
          borderRadius: '8px',
          width: fullWidth ? '100%' : 'auto',
          backgroundColor: consultantPreferences.enable_background_watchdog
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(148, 163, 184, 0.1)',
          border: consultantPreferences.enable_background_watchdog
            ? '1px solid rgba(16, 185, 129, 0.3)'
            : '1px solid var(--border-subtle)',
          color: consultantPreferences.enable_background_watchdog
            ? 'var(--status-low)'
            : 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Estado del Servicio en Segundo Plano (SLA & Vigilante)"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
          <span
            style={{
              width: '6.5px',
              height: '6.5px',
              borderRadius: '50%',
              backgroundColor: consultantPreferences.enable_background_watchdog
                ? 'var(--status-low)'
                : 'var(--text-muted)',
              boxShadow: consultantPreferences.enable_background_watchdog
                ? '0 0 6px var(--status-low)'
                : 'none',
              flexShrink: 0,
            }}
          />
          <ShieldCheck size={13} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {consultantPreferences.enable_background_watchdog ? 'Segundo Plano Activo' : 'En Pausa'}
          </span>
        </div>

        <ChevronDown
          size={12}
          style={{
            color: 'var(--text-muted)',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          className="glass-card animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: fullWidth ? '100%' : '290px',
            minWidth: '240px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            padding: '0.9rem',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ padding: '0.25rem', borderRadius: '6px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                <Zap size={13} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0 }}>
                  Vigilante de Fondo
                </h4>
                <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                  Monitoreo continuo SLA
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', padding: '0.15rem', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Desktop HUD Trigger Banner */}
          {onToggleMiniWidget && (
            <button
              type="button"
              className="btn-primary animate-pulse-glow"
              style={{
                width: '100%',
                fontSize: '0.72rem',
                padding: '0.45rem 0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                fontWeight: 700,
              }}
              onClick={() => {
                setIsOpen(false);
                onToggleMiniWidget();
              }}
            >
              <LayoutTemplate size={12} />
              Modo Widget de Escritorio
            </button>
          )}

          {/* Service Toggle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.45rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>
                Vigilante Activo
              </span>
              <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                Cada {consultantPreferences.background_check_interval_seconds || 60}s
              </span>
            </div>

            <button
              type="button"
              className={consultantPreferences.enable_background_watchdog ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
              onClick={handleToggleWatchdog}
            >
              {consultantPreferences.enable_background_watchdog ? 'Activado' : 'Pausado'}
            </button>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <div style={{ padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-critical)', fontSize: '0.66rem', fontWeight: 700 }}>
                <AlertTriangle size={11} /> Vencidos
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 800, margin: '0.1rem 0 0 0', color: stats.overdueCount > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                {stats.overdueCount}
              </p>
            </div>

            <div style={{ padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-medium)', fontSize: '0.66rem', fontWeight: 700 }}>
                <Clock size={11} /> Vencen Hoy
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 800, margin: '0.1rem 0 0 0', color: stats.dueTodayCount > 0 ? 'var(--status-medium)' : 'var(--text-primary)' }}>
                {stats.dueTodayCount}
              </p>
            </div>
          </div>

          {/* Status info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Último ciclo:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatLastScan()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Notificaciones Escritorio:</span>
              <strong style={{ color: consultantPreferences.enable_desktop_notifications ? 'var(--status-low)' : 'var(--text-muted)' }}>
                {consultantPreferences.enable_desktop_notifications ? 'Activas' : 'Inactivas'}
              </strong>
            </div>
          </div>

          {/* Actions: Force Scan & Hide to Tray */}
          <div style={{ display: 'flex', gap: '0.35rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.45rem' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem 0.45rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem' }}
              onClick={handleForceScan}
              disabled={isForcing}
            >
              <RefreshCw size={11} className={isForcing ? 'animate-spin' : ''} />
              {isForcing ? 'Escaneando...' : 'Escanear'}
            </button>

            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: '0.7rem', padding: '0.3rem 0.45rem', color: 'var(--text-muted)' }}
              onClick={handleMinimizeToTray}
              title="Ocultar a la bandeja de Windows"
            >
              <Minimize2 size={12} /> Ocultar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
