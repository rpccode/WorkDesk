import React, { useMemo } from 'react';
import { useStore } from '../store';
import {
  TrendingUp,
  Award,
  Clock,
  Flame,
  Building2,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { calculateConsultantAnalytics } from '../utils/consultant-analytics';
import { calculateClientHealth } from '../utils/client-health';

export const ConsultingAnalyticsView: React.FC = () => {
  const { clients, cases, commitments, tickets, setActiveTab } = useStore();

  const analytics = useMemo(() => {
    return calculateConsultantAnalytics(clients, cases, commitments);
  }, [clients, cases, commitments]);

  const clientHealthReports = useMemo(() => {
    return clients.map((cli) => calculateClientHealth(cli, cases, commitments, tickets));
  }, [clients, cases, commitments, tickets]);

  const criticalClients = clientHealthReports.filter((r) => r.level === 'critical');
  const warningClients = clientHealthReports.filter((r) => r.level === 'warning');
  const healthyClients = clientHealthReports.filter((r) => r.level === 'healthy');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Consulting Intelligence
            </span>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.025em', margin: '0.1rem 0 0' }}>
              Analíticas de Productividad & Radar de Riesgo
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem' }}
            onClick={() => setActiveTab('my_day')}
          >
            ← Volver a Mi Día
          </button>
        </div>
      </div>

      {/* ── Top KPIs Row ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        {/* On-Time SLA */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-low)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              SLA de Entrega a Tiempo
            </span>
            <Award size={18} color="var(--status-low)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.35rem' }}>
            <h3 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: 'var(--status-low)' }}>
              {analytics.on_time_sla_rate}%
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>de compromisos cumplidos a tiempo</span>
          </div>
        </div>

        {/* Total Entregas */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Compromisos Completados
            </span>
            <CheckCircle2 size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.35rem' }}>
            <h3 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
              {analytics.total_commitments_completed}
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>entregables ejecutados</span>
          </div>
        </div>

        {/* Velocidad de Cierre */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tiempo Medio de Cierre
            </span>
            <Clock size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.35rem' }}>
            <h3 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
              {analytics.avg_case_resolution_days}
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>días promedio por caso</span>
          </div>
        </div>

        {/* Espera de Clientes */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: analytics.avg_client_response_days >= 4 ? '4px solid var(--status-critical)' : '4px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tiempo Espera Terceros
            </span>
            <Flame size={18} color={analytics.avg_client_response_days >= 4 ? 'var(--status-critical)' : 'var(--status-medium)'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.35rem' }}>
            <h3 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: analytics.avg_client_response_days >= 4 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
              {analytics.avg_client_response_days}
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>días promedio de respuesta</span>
          </div>
        </div>

      </div>

      {/* ── 2 Columns: Radar de Cuellos de Botella vs Salud de Cuentas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Radar de Cuellos de Botella */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <BarChart3 size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Radar de Cuellos de Botella por Cliente
              </h3>
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Cuentas con mayor cantidad de entregables bloqueados o días de espera acumulados:
          </p>

          {analytics.bottlenecks_by_client.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5, color: 'var(--status-low)' }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>No se detectan cuellos de botella activos</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {analytics.bottlenecks_by_client.map((b) => {
                const isCritical = b.avg_waiting_days >= 5;

                return (
                  <div
                    key={b.client_id}
                    style={{
                      padding: '0.9rem 1.1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: isCritical ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Building2 size={13} color="var(--accent-primary)" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {b.client_name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {b.waiting_items_count} validación(es) en espera • Promedio de {b.avg_waiting_days} días
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.68rem',
                          backgroundColor: isCritical ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: isCritical ? 'var(--status-critical)' : 'var(--status-medium)',
                          fontWeight: 800,
                        }}
                      >
                        {isCritical ? 'Bloqueo Crítico' : 'Retraso Moderado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Matriz de Salud de Clientes */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <ShieldAlert size={18} color="var(--status-medium)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Matriz de Riesgo de Cuentas
              </h3>
            </div>
            <button type="button" className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => setActiveTab('clients')}>
              Ver Clientes <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: '6px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--status-low)', display: 'block' }}>{healthyClients.length}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>Saludables</span>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: '6px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--status-medium)', display: 'block' }}>{warningClients.length}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>En Observación</span>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '6px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--status-critical)', display: 'block' }}>{criticalClients.length}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>Riesgo Crítico</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.4rem' }}>
            {criticalClients.slice(0, 3).map((report) => {
              const client = clients.find((c) => c.id === report.client_id);
              if (!client) return null;

              return (
                <div
                  key={report.client_id}
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {client.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--status-critical)' }}>
                      Riesgo {report.score}/100
                    </span>
                  </div>
                  {report.recommendations[0] && (
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                      💡 {report.recommendations[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
