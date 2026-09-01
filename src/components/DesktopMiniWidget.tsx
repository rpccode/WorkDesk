import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Maximize2,
  Minimize2,
  RefreshCw,
  Clock,
  AlertTriangle,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { backgroundEngine, type BackgroundServiceStats } from '../services/background-service';
import { useStore } from '../store';
import { api } from '../api/tauri';
import { playNotificationSound } from '../utils/live-alerts';

interface DesktopMiniWidgetProps {
  onRestore: () => void;
}

export const DesktopMiniWidget: React.FC<DesktopMiniWidgetProps> = ({ onRestore }) => {
  const { setQuickCaptureOpen, cases } = useStore();
  const [stats, setStats] = useState<BackgroundServiceStats>(backgroundEngine.getStats());
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const unsubscribe = backgroundEngine.subscribe((newStats) => {
      setStats(newStats);
    });
    return () => unsubscribe();
  }, []);

  const handleForceScan = async () => {
    setIsScanning(true);
    playNotificationSound('info');
    await backgroundEngine.forceScanNow();
    setTimeout(() => setIsScanning(false), 800);
  };

  const handleMinimizeToTray = async () => {
    try {
      await api.hideToTray();
    } catch (_) {}
  };

  const formatLastScan = () => {
    if (!stats.lastScanTime) return 'Iniciando...';
    return stats.lastScanTime.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '0.85rem 1rem',
        boxSizing: 'border-box',
        userSelect: 'none',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar / Drag Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
              animation: 'pulse 2s infinite',
            }}
          />
          <ShieldCheck size={14} color="#38bdf8" />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
            WorkDesk HUD
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              padding: '0.1rem 0.35rem',
              borderRadius: '4px',
              fontWeight: 700,
            }}
          >
            Escritorio
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '0.25rem', color: '#94a3b8' }}
            onClick={handleMinimizeToTray}
            title="Ocultar a segundo plano (Bandeja)"
          >
            <Minimize2 size={13} />
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '0.25rem', color: '#38bdf8', fontWeight: 700 }}
            onClick={onRestore}
            title="Restaurar a Ventana Completa"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', margin: '0.4rem 0' }}>
        {/* Overdue */}
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            padding: '0.45rem 0.5rem',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.62rem', color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            <AlertTriangle size={10} /> Vencidos
          </span>
          <p style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0.1rem 0 0 0', color: stats.overdueCount > 0 ? '#ef4444' : '#f8fafc' }}>
            {stats.overdueCount}
          </p>
        </div>

        {/* Due Today */}
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '6px',
            padding: '0.45rem 0.5rem',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.62rem', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            <Clock size={10} /> Hoy
          </span>
          <p style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0.1rem 0 0 0', color: stats.dueTodayCount > 0 ? '#f59e0b' : '#f8fafc' }}>
            {stats.dueTodayCount}
          </p>
        </div>

        {/* Active Cases */}
        <div
          style={{
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '6px',
            padding: '0.45rem 0.5rem',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            <CheckCircle2 size={10} /> Casos
          </span>
          <p style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0.1rem 0 0 0', color: '#38bdf8' }}>
            {cases.filter((c) => c.status !== 'closed').length}
          </p>
        </div>
      </div>

      {/* Quick Action & Scan Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.45rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Último chequeo:</span>
          <strong style={{ fontSize: '0.68rem', color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>
            {formatLastScan()}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.7rem', padding: '0.3rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => setQuickCaptureOpen(true)}
          >
            <Zap size={11} /> Captura (Alt+N)
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.7rem', padding: '0.3rem 0.45rem' }}
            onClick={handleForceScan}
            disabled={isScanning}
            title="Escanear en segundo plano ahora"
          >
            <RefreshCw size={11} className={isScanning ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};
