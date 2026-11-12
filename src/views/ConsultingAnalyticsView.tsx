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
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { calculateConsultantAnalytics } from '../utils/consultant-analytics';
import { calculateClientHealth } from '../utils/client-health';
import { detectAbandonedAndRiskCases } from '../services/ai-copilot';

export const ConsultingAnalyticsView: React.FC = () => {
  const { clients, cases, commitments, tickets, setActiveTab, setSelectedCaseId } = useStore();

  const analytics = useMemo(() => {
    return calculateConsultantAnalytics(clients, cases, commitments);
  }, [clients, cases, commitments]);

  const clientHealthReports = useMemo(() => {
    return clients.map((cli) => calculateClientHealth(cli, cases, commitments, tickets));
  }, [clients, cases, commitments, tickets]);

  const criticalClients = clientHealthReports.filter((r) => r.level === 'critical');
  const warningClients = clientHealthReports.filter((r) => r.level === 'warning');
  const healthyClients = clientHealthReports.filter((r) => r.level === 'healthy');

  // AI Abandoned Cases and Risks
  const caseRisks = useMemo(() => {
    return detectAbandonedAndRiskCases(cases, commitments, tickets, clients);
  }, [cases, commitments, tickets, clients]);

  return (
    <div className="page-container animate-fade-in">
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary-text)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Consulting Intelligence
            </span>
            <h1 className="page-title" style={{ fontSize: '1.45rem', letterSpacing: '-0.025em', margin: '0.1rem 0 0' }}>
              Analíticas &amp; SLA
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              Productividad, cuellos de botella y radar de riesgo de abandono
            </p>
          </div>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveTab('my_day')}
          >
            ← Volver a Mi Día
          </button>
        </div>
      </div>

      {/* ── Top KPIs Row ────────────────────────────────────────────── */}
      <div className="kpi-grid">
        
        {/* On-Time SLA */}
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--status-low-border)', backgroundColor: 'var(--status-low-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              SLA de Entrega a Tiempo
            </span>
            <Award size={18} color="var(--status-low)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.35rem' }}>
            <h3 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: 'var(--status-low-text)' }}>
              {analytics.on_time_sla_rate}%
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>de compromisos cumplidos a tiempo</span>
          </div>
        </div>

        {/* Total Entregas */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Compromisos Completados
            </span>
            <CheckCircle2 size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.35rem' }}>
            <p style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>{analytics.total_commitments_completed}</p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>entregables ejecutados</span>
          </div>
        </div>

        {/* Velocidad de Cierre */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Tiempo Medio de Cierre
            </span>
            <Clock size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.35rem' }}>
            <p style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>{analytics.avg_case_resolution_days}</p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>días promedio por caso</span>
          </div>
        </div>

        {/* Espera de Clientes */}
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--border-subtle)', backgroundColor: analytics.avg_client_response_days >= 4 ? 'var(--status-critical-bg)' : 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Tiempo Espera Terceros
            </span>
            <Flame size={18} color={analytics.avg_client_response_days >= 4 ? 'var(--status-critical-text)' : 'var(--status-medium-text)'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.35rem' }}>
            <p style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: analytics.avg_client_response_days >= 4 ? 'var(--status-critical-text)' : 'var(--text-primary)' }}>{analytics.avg_client_response_days}</p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>días promedio de respuesta</span>
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
              <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5, color: 'var(--status-low-text)' }} />
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
                      border: isCritical ? '1px solid var(--status-critical-border)' : '1px solid var(--border-subtle)',
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {b.waiting_items_count} validación(es) en espera • Promedio de {b.avg_waiting_days} días
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.7rem',
                          backgroundColor: isCritical ? 'var(--status-critical-bg)' : 'var(--status-high-bg)',
                          color: isCritical ? 'var(--status-critical-text)' : 'var(--status-medium-text)',
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
            <button type="button" className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => setActiveTab('clients')}>
              Ver Clientes <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--status-low-bg)', borderRadius: '6px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--status-low-text)', display: 'block' }}>{healthyClients.length}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Saludables</span>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--status-high-bg)', borderRadius: '6px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--status-medium-text)', display: 'block' }}>{warningClients.length}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>En Observación</span>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--status-critical-bg)', borderRadius: '6px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--status-critical-text)', display: 'block' }}>{criticalClients.length}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Riesgo Crítico</span>
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
                    backgroundColor: 'var(--status-critical-bg-faint)',
                    border: '1px solid var(--status-critical-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {client.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--status-critical-text)' }}>
                      Riesgo {report.score}/100
                    </span>
                  </div>
                  {report.recommendations[0] && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                      💡 {report.recommendations[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── RADAR DE CASOS ABANDONADOS & RIESGOS IA ─────────────────── */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Radar de Casos Abandonados & Riesgos Operacionales (IA)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0' }}>
                Detección proactiva de proyectos a la deriva, inactividad prolongada y compromisos encadenados sin cerrar
              </p>
            </div>
          </div>
          <span className="badge" style={{ backgroundColor: caseRisks.length > 0 ? 'var(--status-critical-bg)' : 'var(--status-low-bg)', color: caseRisks.length > 0 ? 'var(--status-critical-text)' : 'var(--status-low-text)', fontWeight: 800, fontSize: '0.75rem' }}>
            {caseRisks.length} Casos con Alerta
          </span>
        </div>

        {caseRisks.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            🎉 <strong>Excelente control operativo:</strong> Todos los casos tienen actividad reciente, compromisos al día y Próximas Acciones definidas.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '0.85rem' }}>
            {caseRisks.map((risk) => {
              const borderCol = risk.riskLevel === 'critical' ? 'var(--status-critical-border)' : risk.riskLevel === 'high' ? 'var(--status-high-border)' : 'var(--status-medium-border)';
              const bgCol = risk.riskLevel === 'critical' ? 'var(--status-critical-bg)' : risk.riskLevel === 'high' ? 'var(--status-high-bg)' : 'var(--status-medium-bg)';

              return (
                <div
                  key={risk.caseId}
                  className="glass-card card-hover"
                  style={{
                    padding: '1.1rem 1.25rem',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: bgCol,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {risk.clientName}
                      </span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0.1rem 0 0', color: 'var(--text-primary)' }}>
                        {risk.caseTitle}
                      </h4>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: borderCol,
                        color: '#ffffff',
                      }}
                    >
                      {risk.riskLevel.toUpperCase()}
                    </span>
                  </div>

                  {/* Factores de riesgo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.2rem' }}>
                    {risk.reasons.map((r, rIdx) => (
                      <div key={rIdx} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertTriangle size={12} color={borderCol} />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>

                  {/* Sugerencia IA */}
                  <div
                    style={{
                      marginTop: 'auto',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-surface)',
                      fontSize: '0.75rem',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <span>💡 <strong>Acción:</strong> {risk.suggestedAction}</span>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        setSelectedCaseId(risk.caseId);
                        setActiveTab('cases');
                      }}
                    >
                      Abrir <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
