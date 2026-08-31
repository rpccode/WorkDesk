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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Centro de Operaciones
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Visión ejecutiva de compromisos, casos críticos y entregables
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button className="btn-secondary" onClick={() => setQuickCaptureOpen(true)}>
            <Zap size={16} color="var(--accent-primary)" /> Captura Rápida
          </button>
          <button className="btn-secondary" onClick={() => setIsCommitmentModalOpen(true)}>
            <Plus size={16} /> Compromiso
          </button>
          <button className="btn-primary" onClick={() => setIsCaseModalOpen(true)}>
            <Plus size={16} /> Nuevo Caso
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        {/* Card 1: Vencidos / Críticos */}
        <div
          className="glass-card"
          style={{
            padding: '1.25rem',
            borderLeft: summary && summary.overdue_commitments_count > 0 ? '4px solid var(--status-critical)' : '4px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>COMPROMISOS VENCIDOS</span>
            <AlertTriangle size={18} color={summary && summary.overdue_commitments_count > 0 ? 'var(--status-critical)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: summary && summary.overdue_commitments_count > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
            {summary?.overdue_commitments_count || 0}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Requieren atención inmediata
          </p>
        </div>

        {/* Card 2: Prometí entregar */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>PROMETÍ ENTREGAR</span>
            <Clock size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {summary?.pending_commitments_count || 0}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Bajo mi responsabilidad
          </p>
        </div>

        {/* Card 3: Me deben responder */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-medium)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ME DEBEN RESPONDER</span>
            <UserCheck size={18} color="var(--status-medium)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-medium)' }}>
            {summary?.waiting_on_others_count || 0}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            En espera de clientes/terceros
          </p>
        </div>

        {/* Card 4: Casos Activos */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-low)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>CASOS ACTIVOS</span>
            <Briefcase size={18} color="var(--status-low)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>
            {summary?.active_cases_count || 0}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {summary?.critical_cases_count ? `${summary.critical_cases_count} en estado crítico` : 'Todos en progreso normal'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Urgent Commitments */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Compromisos Urgentes / Próximos</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lo que debes resolver o entregar primero</p>
            </div>
            <button
              onClick={() => setActiveTab('commitments')}
              style={{ background: 'transparent', color: 'var(--accent-primary)', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
            >
              Ver todos <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {!summary?.urgent_commitments || summary.urgent_commitments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem', color: 'var(--status-low)', opacity: 0.6 }} />
                ¡Al día! No hay compromisos urgentes pendientes.
              </div>
            ) : (
              summary.urgent_commitments.map((com) => {
                const overdue = isOverdue(com.due_date);
                return (
                  <div
                    key={com.id}
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: overdue ? '4px solid var(--status-critical)' : '4px solid var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <button
                      onClick={() => markCommitmentDone(com.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '50%',
                        padding: '0.35rem',
                        color: 'var(--text-muted)',
                      }}
                      title="Marcar completado"
                    >
                      <CheckCircle2 size={16} />
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {com.description}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                          [{com.client_name || 'Cliente'}]
                        </span>
                        <span>•</span>
                        <span style={{ color: overdue ? 'var(--status-critical)' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
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

        {/* Critical & Active Cases */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Casos en Seguimiento Prioritario</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Proyectos activos y clientes con atención clave</p>
            </div>
            <button
              onClick={() => setActiveTab('cases')}
              style={{ background: 'transparent', color: 'var(--accent-primary)', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
            >
              Ver todos <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {!summary?.critical_cases || summary.critical_cases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <Briefcase size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                No hay casos activos registrados.
                <button
                  className="btn-secondary"
                  style={{ marginTop: '0.8rem', fontSize: '0.8rem' }}
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
                  style={{
                    padding: '0.9rem 1.1rem',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  className="card-hover"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {c.client_name || 'Cliente sin nombre'}
                    </span>
                    <span className={`badge badge-${c.priority}`}>
                      {c.priority === 'critical' ? '🚨 Crítica' : c.priority === 'high' ? 'Alta' : c.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>{c.title}</h4>
                  {c.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
