import React, { useEffect } from 'react';
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

  useEffect(() => {
    refreshAll();

    // Global shortcut handler inside webview (Ctrl+Alt+N or Alt+N)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setQuickCaptureOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'cases',
      label: 'Casos & Proyectos',
      icon: <Briefcase size={18} />,
      badge: dashboardSummary?.active_cases_count,
    },
    {
      id: 'commitments',
      label: 'Compromisos',
      icon: <CheckSquare size={18} />,
      badge: dashboardSummary?.overdue_commitments_count
        ? dashboardSummary.overdue_commitments_count
        : dashboardSummary?.pending_commitments_count,
      badgeColor: dashboardSummary?.overdue_commitments_count ? 'var(--status-critical)' : undefined,
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: <Users size={18} />,
    },
    {
      id: 'notes',
      label: 'Notas & Bitácora',
      icon: <FileText size={18} />,
    },
    {
      id: 'emails',
      label: 'Generador de Correos',
      icon: <Mail size={18} />,
    },
    {
      id: 'reports',
      label: 'Informe Ejecutivo',
      icon: <FileBarChart2 size={18} />,
    },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          height: '100%',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Logo Header */}
        <div
          style={{
            padding: '1.25rem 1.25rem 1rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <div
            style={{
              padding: '0.45rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)',
            }}
          >
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WorkDesk
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              CENTRO OPERATIVO
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ flex: 1, padding: '0.85rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--bg-surface-hover)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ color: isActive ? 'var(--accent-primary)' : 'inherit', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1, textAlign: 'left', fontSize: '0.86rem' }}>{item.label}</span>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '999px',
                      backgroundColor: item.badgeColor || 'var(--accent-glow)',
                      color: item.badgeColor ? 'white' : 'var(--accent-primary)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Capture Button & Refresh at bottom */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '0.65rem', justifyContent: 'center' }}
            onClick={() => setQuickCaptureOpen(true)}
          >
            <Zap size={16} /> Captura Rápida
            <span style={{ fontSize: '0.68rem', opacity: 0.8, marginLeft: '0.2rem', padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              Alt+N
            </span>
          </button>

          <button
            className="btn-secondary"
            style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'center', color: 'var(--text-muted)' }}
            onClick={() => refreshAll()}
          >
            <RefreshCw size={12} /> Sincronizar datos
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          padding: '2rem',
          backgroundColor: 'var(--bg-main)',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'cases' && <CasesView />}
          {activeTab === 'commitments' && <CommitmentsView />}
          {activeTab === 'clients' && <ClientsView />}
          {activeTab === 'notes' && <NotesView />}
          {activeTab === 'emails' && <EmailBuilderView />}
          {activeTab === 'reports' && <ReportsView />}
        </div>
      </main>

      {/* Global Quick Capture Modal */}
      <QuickCaptureModal />
    </div>
  );
}

export default App;
