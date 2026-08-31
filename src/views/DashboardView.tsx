import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import {
  AlertTriangle,
  Clock,
  UserCheck,
  Briefcase,
  Plus,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { formatRelativeDate, isOverdue } from '../utils/date';
import { CaseDetailsDrawer } from '../components/CaseDetailsDrawer';
import { CaseModal } from '../components/CaseModal';
import { CommitmentModal } from '../components/CommitmentModal';
import type { Case } from '../types';

/* ── Animated KPI number ─────────────────────────────────────────────── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.round(from + (value - from) * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <>{display}</>;
}

/* ── KPI Card component ──────────────────────────────────────────────── */
interface KpiCardProps {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  urgent?: boolean;
}

function KpiCard({ label, value, sub, icon, accentColor, glowColor, urgent }: KpiCardProps) {
  return (
    <div
      className="kpi-card"
      style={{
        '--kpi-accent': accentColor,
        '--kpi-color': accentColor,
        '--kpi-glow': glowColor,
      } as React.CSSProperties}
    >
      {/* Background icon */}
      <div className="kpi-icon-bg">
        {React.cloneElement(icon as React.ReactElement, { size: 52 })}
      </div>

      {/* Label */}
      <div className="kpi-label" style={{ marginBottom: '0.6rem' }}>{label}</div>

      {/* Number */}
      <div className="kpi-number" style={urgent && value > 0 ? { animation: 'none' } : {}}>
        <AnimatedNumber value={value} />
      </div>

      {/* Sub-label */}
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────────── */
export const DashboardView: React.FC = () => {
  const {
    dashboardSummary,
    fetchDashboardSummary,
    markCommitmentDone,
    setActiveTab,
    setQuickCaptureOpen,
  } = useStore();

  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const summary = dashboardSummary;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Page Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Centro de Operaciones
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.865rem', marginTop: '0.25rem' }}>
            Visión ejecutiva de compromisos, casos críticos y entregables
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
          <button className="btn-ghost" style={{ fontSize: '0.83rem' }} onClick={() => setQuickCaptureOpen(true)}>
            <Zap size={15} color="var(--accent-primary)" /> Captura Rápida
          </button>
          <button className="btn-secondary" style={{ fontSize: '0.83rem' }} onClick={() => setIsCommitmentModalOpen(true)}>
            <Plus size={15} /> Compromiso
          </button>
          <button className="btn-primary" style={{ fontSize: '0.83rem' }} onClick={() => setIsCaseModalOpen(true)}>
            <Plus size={15} /> Nuevo Caso
          </button>
        </div>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────── */}
      <div
        className="stagger-children"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}
      >
        <KpiCard
          label="Compromisos Vencidos"
          value={summary?.overdue_commitments_count || 0}
          sub="Requieren atención inmediata"
          icon={<AlertTriangle />}
          accentColor="var(--status-critical)"
          glowColor="rgba(244, 63, 94, 0.25)"
          urgent
        />
        <KpiCard
          label="Prometí Entregar"
          value={summary?.pending_commitments_count || 0}
          sub="Bajo mi responsabilidad"
          icon={<Clock />}
          accentColor="var(--accent-primary)"
          glowColor="var(--accent-glow-strong)"
        />
        <KpiCard
          label="Me Deben Responder"
          value={summary?.waiting_on_others_count || 0}
          sub="En espera de clientes/terceros"
          icon={<UserCheck />}
          accentColor="var(--status-medium)"
          glowColor="rgba(251, 191, 36, 0.25)"
        />
        <KpiCard
          label="Casos Activos"
          value={summary?.active_cases_count || 0}
          sub={
            summary?.critical_cases_count
              ? `${summary.critical_cases_count} en estado crítico`
              : 'Todos en progreso normal'
          }
          icon={<Briefcase />}
          accentColor="var(--status-low)"
          glowColor="rgba(52, 211, 153, 0.25)"
        />
      </div>

      {/* ── 2-Column Panels ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>

        {/* Urgent Commitments */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Compromisos Urgentes / Próximos</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Lo que debes resolver o entregar primero
              </p>
            </div>
            <button
              className="btn-ghost"
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem', color: 'var(--accent-primary)' }}
              onClick={() => setActiveTab('commitments')}
            >
              Ver todos <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
            {!summary?.urgent_commitments || summary.urgent_commitments.length === 0 ? (
              <div className="empty-state" style={{ flex: 1 }}>
                <CheckCircle2 size={36} color="var(--status-low)" />
                <p>¡Al día! No hay compromisos urgentes.</p>
              </div>
            ) : (
              summary.urgent_commitments.map((com) => {
                const overdue = isOverdue(com.due_date);
                return (
                  <div
                    key={com.id}
                    style={{
                      padding: '0.8rem 1rem',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: overdue
                        ? '3px solid var(--status-critical)'
                        : '3px solid var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.7rem',
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <button
                      onClick={() => markCommitmentDone(com.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '50%',
                        padding: '0.32rem',
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                      title="Marcar completado"
                    >
                      <CheckCircle2 size={15} />
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="text-ellipsis" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {com.description}
                      </p>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.71rem', color: 'var(--text-secondary)', marginTop: '0.18rem' }}>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                          {com.client_name || 'Cliente'}
                        </span>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span style={{
                          color: overdue ? 'var(--status-critical)' : 'inherit',
                          fontWeight: overdue ? 700 : 400,
                        }}>
                          {formatRelativeDate(com.due_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Critical Cases */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Casos en Seguimiento Prioritario</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Proyectos activos y clientes con atención clave
              </p>
            </div>
            <button
              className="btn-ghost"
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem', color: 'var(--accent-primary)' }}
              onClick={() => setActiveTab('cases')}
            >
              Ver todos <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
            {!summary?.critical_cases || summary.critical_cases.length === 0 ? (
              <div className="empty-state" style={{ flex: 1 }}>
                <Briefcase size={36} />
                <p>No hay casos activos registrados.</p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}
                  onClick={() => setIsCaseModalOpen(true)}
                >
                  + Crear primer caso
                </button>
              </div>
            ) : (
              summary.critical_cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className="card-hover"
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.73rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {c.client_name || 'Cliente sin nombre'}
                    </span>
                    <span className={`badge badge-${c.priority}`}>
                      {c.priority === 'critical' ? 'Crítica' : c.priority === 'high' ? 'Alta' : c.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.91rem', fontWeight: 700 }}>{c.title}</h4>
                  {c.description && (
                    <p className="text-ellipsis" style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '0.28rem' }}>
                      {c.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CaseDetailsDrawer c={selectedCase} onClose={() => setSelectedCase(null)} />
      <CaseModal isOpen={isCaseModalOpen} onClose={() => setIsCaseModalOpen(false)} />
      <CommitmentModal isOpen={isCommitmentModalOpen} onClose={() => setIsCommitmentModalOpen(false)} />
    </div>
  );
};
