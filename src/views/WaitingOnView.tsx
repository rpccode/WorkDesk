import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import {
  Clock,
  AlertTriangle,
  Building2,
  Mail,
  CheckCircle2,
  Flame,
} from 'lucide-react';

export const WaitingOnView: React.FC = () => {
  const {
    commitments,
    cases,
    clients,
    markCommitmentDone,
    setCaseForEmail,
    setActiveTab,
    setSelectedCaseId,
    addNotification,
  } = useStore();

  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Waiting commitments (where owner is client or third_party)
  const waitingList = useMemo(() => {
    return commitments
      .filter((c) => c.status !== 'done' && c.owner !== 'me')
      .map((c) => {
        const createdDate = new Date(c.created_at);
        const diffDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const relatedCase = cases.find((item) => item.id === c.case_id);
        const relatedClient = relatedCase ? clients.find((cli) => cli.id === relatedCase.client_id) : null;
        
        return {
          ...c,
          diffDays,
          caseItem: relatedCase,
          clientItem: relatedClient,
        };
      })
      .filter((c) => {
        if (filterOwner !== 'all' && c.owner !== filterOwner) return false;
        if (searchTerm) {
          const matchDesc = c.description.toLowerCase().includes(searchTerm.toLowerCase());
          const matchClient = (c.client_name || '').toLowerCase().includes(searchTerm.toLowerCase());
          const matchCase = (c.case_title || '').toLowerCase().includes(searchTerm.toLowerCase());
          return matchDesc || matchClient || matchCase;
        }
        return true;
      })
      .sort((a, b) => b.diffDays - a.diffDays); // Oldest first
  }, [commitments, cases, clients, filterOwner, searchTerm]);

  // KPIs
  const criticalWaitingCount = waitingList.filter((w) => w.diffDays >= 5).length;
  const clientWaitingCount = waitingList.filter((w) => w.owner === 'client').length;
  const thirdPartyWaitingCount = waitingList.filter((w) => w.owner === 'third_party').length;

  return (
    <div className="page-container animate-fade-in">
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--status-medium-bg)', color: 'var(--status-medium-text)' }}>
              <Clock size={20} />
            </div>
            <div>
              <h1 className="page-title">
                Esperando de Otros
              </h1>
              <p className="page-subtitle">
                Control de dependencias, validaciones pendientes de clientes y días transcurridos
              </p>
            </div>
          </div>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setActiveTab('my_day')}
          >
            ← Volver a Mi Día
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
        <div className="glass-card" style={{ padding: '1rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total en Espera</span>
            <p style={{ fontSize: '1.55rem', fontWeight: 900, margin: '0.1rem 0 0', color: 'var(--text-primary)' }}>{waitingList.length}</p>
          </div>
          <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--bg-surface-elevated)' }}>
            <Clock size={18} color="var(--accent-primary)" />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--status-critical-border)', backgroundColor: 'var(--status-critical-bg)' }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--status-critical-text)', textTransform: 'uppercase' }}>Críticos (+5 Días)</span>
            <p style={{ fontSize: '1.55rem', fontWeight: 900, margin: '0.1rem 0 0', color: 'var(--status-critical-text)' }}>{criticalWaitingCount}</p>
          </div>
          <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--status-critical-bg)' }}>
            <Flame size={18} color="var(--status-critical)" />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary-text)', textTransform: 'uppercase' }}>De Clientes</span>
            <p style={{ fontSize: '1.55rem', fontWeight: 900, margin: '0.1rem 0 0', color: 'var(--accent-primary-text)' }}>{clientWaitingCount}</p>
          </div>
          <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--accent-glow)' }}>
            <Building2 size={18} color="var(--accent-primary)" />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--status-medium-text)', textTransform: 'uppercase' }}>De Terceros / TI</span>
            <p style={{ fontSize: '1.55rem', fontWeight: 900, margin: '0.1rem 0 0', color: 'var(--status-medium-text)' }}>{thirdPartyWaitingCount}</p>
          </div>
          <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--status-high-bg)' }}>
            <AlertTriangle size={18} color="var(--status-medium)" />
          </div>
        </div>
      </div>

      {/* ── Toolbar & Filters ───────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <input
          id="waitingon-search"
          type="text"
          aria-label="Buscar por cliente, caso o descripción"
          placeholder="Buscar por cliente, caso o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '220px', fontSize: '0.82rem' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="waitingon-filter-responsable" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Responsable:</label>
          <select
            id="waitingon-filter-responsable"
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            style={{ fontSize: '0.82rem' }}
          >
            <option value="all">Todos los responsables</option>
            <option value="client">Cliente</option>
            <option value="third_party">Terceros / Otros</option>
          </select>
        </div>
      </div>

      {/* ── Matrix List ─────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {waitingList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5, color: 'var(--status-low-text)' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>No hay bloqueos pendientes</p>
            <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>No tienes dependencias esperando respuesta de terceros.</p>
          </div>
        ) : (
          waitingList.map((item) => {
            const isCritical = item.diffDays >= 5;
            const isMedium = item.diffDays >= 2;

            return (
              <div
                key={item.id}
                className="card-hover"
                style={{
                  padding: '1.1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: isCritical ? '1px solid var(--status-critical-border-strong)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary-text)', fontWeight: 800 }}>
                      <Building2 size={11} /> {item.client_name || 'Cliente'}
                    </span>
                    {item.caseItem && (
                      <span
                        style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}
                        onClick={() => setSelectedCaseId(item.caseItem!.id)}
                      >
                        • Caso: {item.caseItem.title}
                      </span>
                    )}
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        backgroundColor: isCritical ? 'var(--status-critical-bg)' : isMedium ? 'var(--status-high-bg)' : 'var(--bg-surface)',
                        color: isCritical ? 'var(--status-critical-text)' : isMedium ? 'var(--status-medium-text)' : 'var(--text-muted)',
                      }}
                    >
                      {item.diffDays === 0 ? 'Esperando desde hoy' : `Llevas ${item.diffDays} día${item.diffDays > 1 ? 's' : ''} esperando`}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0 0' }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {item.caseItem && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => setCaseForEmail(item.caseItem!)}
                    >
                      <Mail size={13} color="var(--accent-primary)" /> Enviar Correo de Seguimiento
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: 'var(--status-low-text)', borderColor: 'var(--status-low)' }}
                    onClick={() => {
                      markCommitmentDone(item.id);
                      addNotification({
                        type: 'success',
                        title: 'Respuesta Recibida',
                        message: `Marcado como recibido el compromiso "${item.description}".`,
                        show_toast: true,
                      });
                    }}
                  >
                    <CheckCircle2 size={13} /> Recibido
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
