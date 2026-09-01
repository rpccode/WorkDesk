import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Calendar,
  Users,
  FileText,
  Mail,
  FileBarChart2,
  Zap,
  RefreshCw,
  Layers,
  Bell,
  Settings,
} from 'lucide-react';
import { DashboardView } from './views/DashboardView';
import { CasesView } from './views/CasesView';
import { CommitmentsView } from './views/CommitmentsView';
import { CalendarView } from './views/CalendarView';
import { ClientsView } from './views/ClientsView';
import { NotesView } from './views/NotesView';
import { EmailBuilderView } from './views/EmailBuilderView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { EmailAccountsModal } from './components/EmailAccountsModal';
import { LiveToastContainer } from './components/LiveToastContainer';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { BackgroundStatusWidget } from './components/BackgroundStatusWidget';
import { DesktopMiniWidget } from './components/DesktopMiniWidget';
import { requestDesktopNotificationPermission } from './utils/live-alerts';
import { backgroundEngine } from './services/background-service';
import { api } from './api/tauri';
import type { ActiveTab } from './types';

export function App() {
  const {
    activeTab,
    setActiveTab,
    setQuickCaptureOpen,
    refreshAll,
    dashboardSummary,
    notifications,
    consultantPreferences,
    setNotificationCenterOpen,
  } = useStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isMiniWidgetMode, setIsMiniWidgetMode] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const toggleMiniWidgetMode = async (enable?: boolean) => {
    const next = enable !== undefined ? enable : !isMiniWidgetMode;
    setIsMiniWidgetMode(next);
    try {
      await api.toggleMiniWidget(next);
    } catch (_) {}
  };

  useEffect(() => {
    refreshAll();
    updateLastSync();
    requestDesktopNotificationPermission();

    // Start background engine daemon
    if (consultantPreferences.enable_background_watchdog) {
      backgroundEngine.start(consultantPreferences.background_check_interval_seconds || 60);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setQuickCaptureOpen(true);
      }
      if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        toggleMiniWidgetMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      backgroundEngine.stop();
    };
  }, []);

  const updateLastSync = () => {
    const now = new Date();
    setLastSync(now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    updateLastSync();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeCritical?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={17} />,
    },
    {
      id: 'cases',
      label: 'Casos & Proyectos',
      icon: <Briefcase size={17} />,
      badge: dashboardSummary?.active_cases_count,
    },
    {
      id: 'commitments',
      label: 'Compromisos',
      icon: <CheckSquare size={17} />,
      badge: dashboardSummary?.overdue_commitments_count
        ? dashboardSummary.overdue_commitments_count
        : dashboardSummary?.pending_commitments_count,
      badgeCritical: !!(dashboardSummary?.overdue_commitments_count),
    },
    {
      id: 'calendar',
      label: 'Calendario',
      icon: <Calendar size={17} />,
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: <Users size={17} />,
    },
    {
      id: 'notes',
      label: 'Notas & Bitácora',
      icon: <FileText size={17} />,
    },
    {
      id: 'emails',
      label: 'Generador de Correos',
      icon: <Mail size={17} />,
    },
    {
      id: 'reports',
      label: 'Informe Ejecutivo',
      icon: <FileBarChart2 size={17} />,
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: <Settings size={17} />,
    },
  ];

  if (isMiniWidgetMode) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#090d16' }}>
        <DesktopMiniWidget onRestore={() => toggleMiniWidgetMode(false)} />
        <QuickCaptureModal />
        <LiveToastContainer />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{
          width: '252px',
          height: '100%',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Subtle right-edge gradient separator */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '1px',
          height: '100%',
          background: 'linear-gradient(180deg, transparent, rgba(37,99,235,0.08) 30%, rgba(37,99,235,0.04) 70%, transparent)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* ── Logo Header ─────────────────────────────────────── */}
        <div style={{
          padding: '1rem 0.95rem 0.85rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}>
          {/* Top Row: Logo and Notification Bell */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* Logo icon */}
              <div style={{
                padding: '0.45rem',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                boxShadow: '0 0 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                flexShrink: 0,
              }}>
                <Layers size={17} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.96rem',
                    fontWeight: 800,
                    letterSpacing: '-0.025em',
                    color: 'var(--text-primary)',
                  }}>
                    WorkDesk
                  </span>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.3rem',
                    borderRadius: '4px',
                    backgroundColor: 'var(--accent-glow)',
                    color: 'var(--accent-primary)',
                    letterSpacing: '0.04em',
                  }}>
                    PRO
                  </span>
                </div>
                <p style={{
                  fontSize: '0.66rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1,
                  marginTop: '0.15rem',
                }}>
                  Centro Operativo
                </p>
              </div>
            </div>

            {/* Notification Bell */}
            <button
              className="btn-ghost"
              style={{
                position: 'relative',
                padding: '0.4rem',
                borderRadius: '8px',
                color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
              onClick={() => setNotificationCenterOpen(true)}
              title={unreadCount > 0 ? `${unreadCount} alerta(s) pendiente(s)` : 'Centro de Alertas'}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span
                  className="animate-pulse-glow"
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--status-critical)',
                    border: '1.5px solid var(--bg-surface)',
                  }}
                />
              )}
            </button>
          </div>

          {/* Bottom Row: Full-Width Background Status Widget */}
          <BackgroundStatusWidget onToggleMiniWidget={() => toggleMiniWidgetMode(true)} fullWidth />
        </div>

        {/* ── Navigation ─────────────────────────────────────── */}
        <nav style={{
          flex: 1,
          padding: '0.75rem 0.6rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          overflowY: 'auto',
        }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-item-icon">
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`nav-badge ${item.badgeCritical ? 'nav-badge-critical' : 'nav-badge-default'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Bottom Actions ─────────────────────────────────── */}
        <div style={{
          padding: '0.85rem 0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          {/* Quick Capture — glowing CTA */}
          <button
            className="btn-primary animate-pulse-glow"
            style={{
              width: '100%',
              padding: '0.62rem',
              fontSize: '0.855rem',
              fontWeight: 600,
            }}
            onClick={() => setQuickCaptureOpen(true)}
          >
            <Zap size={15} />
            Captura Rápida
            <span style={{
              fontSize: '0.6rem',
              opacity: 0.75,
              marginLeft: '0.15rem',
              padding: '0.1rem 0.3rem',
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '3px',
              letterSpacing: '0.02em',
            }}>
              Alt+N
            </span>
          </button>

          {/* Sync & Settings row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              className="btn-ghost"
              style={{
                flex: 1,
                fontSize: '0.73rem',
                padding: '0.35rem 0.5rem',
                color: 'var(--text-muted)',
              }}
              onClick={handleRefresh}
            >
              <RefreshCw
                size={11}
                style={{ transition: 'transform 0.6s', transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)' }}
              />
              Sincronizar
            </button>

            <button
              className="btn-ghost"
              style={{
                fontSize: '0.73rem',
                padding: '0.35rem 0.5rem',
                color: 'var(--text-muted)',
              }}
              onClick={() => setIsEmailModalOpen(true)}
              title="Configuración de cuentas de correo"
            >
              <Mail size={12} />
            </button>

            {lastSync && (
              <span style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
                opacity: 0.7,
              }}>
                {lastSync}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          padding: '2rem 2.25rem',
          backgroundColor: 'var(--bg-main)',
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.05) 0%, transparent 60%), var(--bg-main)',
        }}
      >
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          {activeTab === 'dashboard'    && <DashboardView />}
          {activeTab === 'cases'        && <CasesView />}
          {activeTab === 'commitments'  && <CommitmentsView />}
          {activeTab === 'calendar'     && <CalendarView />}
          {activeTab === 'clients'      && <ClientsView />}
          {activeTab === 'notes'        && <NotesView />}
          {activeTab === 'emails'       && <EmailBuilderView />}
          {activeTab === 'reports'      && <ReportsView />}
          {activeTab === 'settings'     && <SettingsView onOpenEmailAccountsModal={() => setIsEmailModalOpen(true)} />}
        </div>
      </main>

      {/* Global Modals & Live Overlays */}
      <QuickCaptureModal />
      <EmailAccountsModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
      />
      <NotificationCenterModal />
      <LiveToastContainer />
    </div>
  );
}

export default App;
