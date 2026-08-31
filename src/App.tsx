import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Users,
  FileText,
  Mail,
  FileBarChart2,
  Zap,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { DashboardView } from './views/DashboardView';
import { CasesView } from './views/CasesView';
import { CommitmentsView } from './views/CommitmentsView';
import { ClientsView } from './views/ClientsView';
import { NotesView } from './views/NotesView';
import { EmailBuilderView } from './views/EmailBuilderView';
import { ReportsView } from './views/ReportsView';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import type { ActiveTab } from './types';

export function App() {
  const {
    activeTab,
    setActiveTab,
    setQuickCaptureOpen,
    refreshAll,
    dashboardSummary,
  } = useStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');

  useEffect(() => {
    refreshAll();
    updateLastSync();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setQuickCaptureOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{
          width: '252px',
          height: '100%',
          background: 'linear-gradient(180deg, #0f1623 0%, #080c15 100%)',
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
          background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.15) 30%, rgba(59,130,246,0.08) 70%, transparent)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* ── Logo Header ─────────────────────────────────────── */}
        <div style={{
          padding: '1.2rem 1.1rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
        }}>
          {/* Logo icon */}
          <div style={{
            padding: '0.5rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            boxShadow: '0 0 18px rgba(59, 130, 246, 0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}>
            <Layers size={18} />
          </div>

          <div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              background: 'linear-gradient(90deg, #f1f5f9 0%, #8da3bf 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              WorkDesk
            </div>
            <div style={{
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              letterSpacing: '0.1em',
            }}>
              CENTRO OPERATIVO
            </div>
          </div>
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

          {/* Sync row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              className="btn-ghost"
              style={{
                flex: 1,
                fontSize: '0.73rem',
                padding: '0.35rem 0.5rem',
                color: 'var(--text-muted)',
                gap: '0.35rem',
              }}
              onClick={handleRefresh}
            >
              <RefreshCw
                size={11}
                style={{ transition: 'transform 0.6s', transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)' }}
              />
              Sincronizar
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
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.07) 0%, transparent 60%), var(--bg-main)',
        }}
      >
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          {activeTab === 'dashboard'    && <DashboardView />}
          {activeTab === 'cases'        && <CasesView />}
          {activeTab === 'commitments'  && <CommitmentsView />}
          {activeTab === 'clients'      && <ClientsView />}
          {activeTab === 'notes'        && <NotesView />}
          {activeTab === 'emails'       && <EmailBuilderView />}
          {activeTab === 'reports'      && <ReportsView />}
        </div>
      </main>

      {/* Global Quick Capture Modal */}
      <QuickCaptureModal />
    </div>
  );
}

export default App;
