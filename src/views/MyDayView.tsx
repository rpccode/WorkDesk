import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import {
  Sun,
  Flame,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Plus,
  Zap,
  Target,
  Building2,
  Mail,
} from 'lucide-react';
import { CaseDetailsDrawer } from '../components/CaseDetailsDrawer';
import { CaseModal } from '../components/CaseModal';
import { CommitmentModal } from '../components/CommitmentModal';
import type { Case, NextAction } from '../types';

export const MyDayView: React.FC = () => {
  const {
    cases,
    commitments,
    consultantProfile,
    setActiveTab,
    setSelectedCaseId,
    selectedCaseId,
    setCaseForEmail,
    markCommitmentDone,
    updateCaseNextAction,
    addNotification,
  } = useStore();

  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [editingNextActionCaseId, setEditingNextActionCaseId] = useState<string | null>(null);
  const [nextActionDesc, setNextActionDesc] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionOwner, setNextActionOwner] = useState<'me' | 'client' | 'third_party' | 'team'>('me');

  const today = new Date().toISOString().split('T')[0];
  const activeCases = useMemo(() => cases.filter((c) => c.status !== 'closed'), [cases]);

  // ── Metrics & Brief Calculation ───────────────────────────────────────────
  const criticalCases = useMemo(() => activeCases.filter((c) => c.priority === 'critical' || c.priority === 'high'), [activeCases]);
  
  const overdueCommitments = useMemo(() => commitments.filter((c) => {
    if (c.status === 'done' || !c.due_date) return false;
    return c.due_date.split('T')[0] < today;
  }), [commitments, today]);

  const todayCommitments = useMemo(() => commitments.filter((c) => {
    if (c.status === 'done' || !c.due_date) return false;
    return c.due_date.split('T')[0] === today;
  }), [commitments, today]);

  const waitingCommitments = useMemo(() => commitments.filter((c) => {
    return c.status !== 'done' && c.owner !== 'me';
  }), [commitments]);

  // Cases without next action defined
  const casesWithoutNextAction = useMemo(() => activeCases.filter((c) => !c.next_action?.description), [activeCases]);

  // Cases that can be closed today (e.g. all their commitments are done or no pending ones)
  const closableCases = useMemo(() => {
    return activeCases.filter((c) => {
      const caseComms = commitments.filter((comm) => comm.case_id === c.id);
      if (caseComms.length === 0) return false;
      return caseComms.every((comm) => comm.status === 'done');
    });
  }, [activeCases, commitments]);

  // Next actions prioritized
  const myNextActions = useMemo(() => {
    return activeCases
      .filter((c) => c.next_action && c.next_action.description && c.next_action.status !== 'done')
      .map((c) => ({
        caseItem: c,
        action: c.next_action!,
      }))
      .sort((a, b) => {
        const dateA = a.action.due_date || '9999-99-99';
        const dateB = b.action.due_date || '9999-99-99';
        return dateA.localeCompare(dateB);
      });
  }, [activeCases]);

  const handleSaveNextAction = (caseId: string) => {
    if (!nextActionDesc.trim()) return;
    const newAction: NextAction = {
      description: nextActionDesc.trim(),
      due_date: nextActionDate || today,
      owner_type: nextActionOwner,
      status: 'pending',
    };
    updateCaseNextAction(caseId, newAction);
    setEditingNextActionCaseId(null);
    setNextActionDesc('');
    setNextActionDate('');
  };

  const handleCompleteNextAction = (c: Case) => {
    if (!c.next_action) return;
    updateCaseNextAction(c.id, {
      ...c.next_action,
      status: 'done',
    });
    addNotification({
      type: 'success',
      title: 'Próxima Acción Completada',
      message: `Completada en "${c.title}". Recuerda definir la siguiente acción.`,
      show_toast: true,
    });
  };

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── MORNING BRIEF HERO BANNER ────────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '1.75rem 2rem',
          background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(17,24,39,0.9) 100%)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <Sun size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Personal Operations Center • Mi Día
              </span>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, letterSpacing: '-0.025em', margin: '0.1rem 0 0' }}>
                Buenos días, {consultantProfile.name.split(' ')[0]}
              </h2>
            </div>
          </div>

          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.65rem', lineHeight: 1.5, maxWidth: '680px', margin: '0.65rem 0 0' }}>
            Tienes <strong>{activeCases.length} casos activos</strong>. 
            {criticalCases.length > 0 && <span> <span style={{ color: 'var(--status-critical)', fontWeight: 800 }}>{criticalCases.length} requieren atención prioritaria</span>.</span>}
            {overdueCommitments.length > 0 && <span> <span style={{ color: 'var(--status-critical)', fontWeight: 800 }}>{overdueCommitments.length} compromisos vencidos</span>.</span>}
            {waitingCommitments.length > 0 && <span> Hay <strong>{waitingCommitments.length} pendientes</strong> esperando respuesta de clientes/terceros.</span>}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.84rem', padding: '0.65rem 1rem' }}
            onClick={() => setIsCommitmentModalOpen(true)}
          >
            <Plus size={15} /> + Compromiso
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.84rem', padding: '0.65rem 1.25rem' }}
            onClick={() => setIsCaseModalOpen(true)}
          >
            <Zap size={15} /> + Nuevo Caso
          </button>
        </div>
      </div>

      {/* ── ATENCIÓN URGENTE / ANOMALÍAS ─────────────────────────────────────── */}
      {(overdueCommitments.length > 0 || casesWithoutNextAction.length > 0 || criticalCases.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          
          {/* Vencidos */}
          {overdueCommitments.length > 0 && (
            <div className="glass-card" style={{ padding: '1.2rem', borderLeft: '4px solid var(--status-critical)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--status-critical)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Flame size={15} /> {overdueCommitments.length} Compromisos Vencidos
                </span>
                <button type="button" className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => setActiveTab('commitments')}>
                  Ver todos <ArrowRight size={12} />
                </button>
              </div>
              <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {overdueCommitments.slice(0, 3).map((comm) => (
                  <div key={comm.id} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {comm.description}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--status-critical)', fontWeight: 800 }}>
                      Venció {comm.due_date?.split('T')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Casos sin Próxima Acción */}
          {casesWithoutNextAction.length > 0 && (
            <div className="glass-card" style={{ padding: '1.2rem', borderLeft: '4px solid var(--status-medium)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--status-medium)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={15} /> {casesWithoutNextAction.length} Casos Sin Próxima Acción
                </span>
                <button type="button" className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => setActiveTab('cases')}>
                  Gestionar <ArrowRight size={12} />
                </button>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.4rem 0 0.6rem' }}>
                Todo caso activo debe tener definido el siguiente paso para avanzar.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {casesWithoutNextAction.slice(0, 2).map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{c.title}</span>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                      onClick={() => {
                        setEditingNextActionCaseId(c.id);
                        setNextActionDesc('');
                        setNextActionDate(today);
                      }}
                    >
                      + Definir acción
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listos para cerrar */}
          {closableCases.length > 0 && (
            <div className="glass-card" style={{ padding: '1.2rem', borderLeft: '4px solid var(--status-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--status-low)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={15} /> {closableCases.length} Casos Listos para Cerrar
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.4rem 0 0.6rem' }}>
                Todos los compromisos han sido completados.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {closableCases.slice(0, 2).map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{c.title}</span>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', color: 'var(--status-low)' }}
                      onClick={() => setSelectedCaseId(c.id)}
                    >
                      Cerrar Caso
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2 COLUMNAS PRINCIPALES: PRÓXIMAS ACCIONES VS ESPERANDO ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Columna Izquierda: Matriz de Próximas Acciones */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <Target size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Mis Próximas Acciones</h3>
            </div>
            <span className="badge" style={{ fontSize: '0.72rem', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)', fontWeight: 800 }}>
              {myNextActions.length} Pendientes
            </span>
          </div>

          {myNextActions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5, color: 'var(--status-low)' }} />
              <p style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0 }}>¡Estás al día con tus próximas acciones!</p>
              <p style={{ fontSize: '0.76rem', marginTop: '0.25rem' }}>Define nuevos pasos en tus casos para seguir avanzando.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myNextActions.map(({ caseItem, action }) => {
                const isActionOverdue = action.due_date && action.due_date < today;
                const isActionToday = action.due_date === today;

                return (
                  <div
                    key={caseItem.id}
                    className="card-hover"
                    style={{
                      padding: '1rem 1.15rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ fontSize: '0.68rem', backgroundColor: 'rgba(59,130,246,0.12)', color: 'var(--accent-primary)', fontWeight: 800 }}>
                          <Building2 size={11} /> {caseItem.client_name || 'Cliente'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>•</span>
                        <span
                          style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}
                          onClick={() => setSelectedCaseId(caseItem.id)}
                        >
                          {caseItem.title}
                        </span>
                      </div>

                      {action.due_date && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: isActionOverdue ? 'var(--status-critical)' : isActionToday ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Clock size={12} />
                          {isActionOverdue ? `Atrasado (${action.due_date})` : isActionToday ? 'Para Hoy' : action.due_date}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 900 }}>➔</span>
                        <span>{action.description}</span>
                      </div>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem', color: 'var(--status-low)', borderColor: 'var(--status-low)', whiteSpace: 'nowrap' }}
                        onClick={() => handleCompleteNextAction(caseItem)}
                      >
                        <CheckCircle2 size={13} /> Hecho
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Esperando de Terceros & Agenda del Día */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Esperando de Terceros */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Clock size={17} color="var(--status-medium)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Esperando de Otros</h3>
              </div>
              <button type="button" className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => setActiveTab('waiting_on')}>
                Ver todo <ArrowRight size={12} />
              </button>
            </div>

            {waitingCommitments.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '1rem 0' }}>
                No tienes compromisos esperando respuesta de terceros.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {waitingCommitments.slice(0, 4).map((comm) => {
                  const createdDate = new Date(comm.created_at);
                  const diffDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={comm.id}
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                          {comm.client_name || 'Cliente'}
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: diffDays >= 4 ? 'var(--status-critical)' : 'var(--status-medium)' }}>
                          {diffDays === 0 ? 'Hoy' : `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {comm.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', color: 'var(--accent-primary)' }}
                          onClick={() => {
                            const relatedCase = cases.find((c) => c.id === comm.case_id);
                            if (relatedCase) setCaseForEmail(relatedCase);
                            else setActiveTab('emails');
                          }}
                        >
                          <Mail size={11} /> Seguimiento
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Agenda & Entregas de Hoy */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Calendar size={17} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Agenda de Hoy ({today})</h3>
              </div>
            </div>

            {todayCommitments.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '1rem 0' }}>
                No tienes entregas obligatorias programadas para hoy.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {todayCommitments.map((comm) => (
                  <div key={comm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{comm.description}</span>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', color: 'var(--status-low)' }}
                      onClick={() => markCommitmentDone(comm.id)}
                    >
                      ✓ Cumplido
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal para definir Próxima Acción */}
      {editingNextActionCaseId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Definir Próxima Acción</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              ¿Qué es lo próximo específico que debe ocurrir para avanzar este caso?
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Descripción de la acción:</label>
              <input
                type="text"
                placeholder="Ej. Llamar a Contabilidad para validar balance..."
                value={nextActionDesc}
                onChange={(e) => setNextActionDesc(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Fecha límite:</label>
                <input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Responsable:</label>
                <select
                  value={nextActionOwner}
                  onChange={(e) => setNextActionOwner(e.target.value as any)}
                >
                  <option value="me">Yo</option>
                  <option value="client">Cliente</option>
                  <option value="team">Equipo / TI</option>
                  <option value="third_party">Terceros</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setEditingNextActionCaseId(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSaveNextAction(editingNextActionCaseId)}
                disabled={!nextActionDesc.trim()}
              >
                Guardar Acción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Details Drawer */}
      <CaseDetailsDrawer
        isOpen={Boolean(selectedCaseId)}
        caseItem={selectedCase}
        onClose={() => setSelectedCaseId(null)}
      />

      {/* Modals */}
      <CaseModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
      />

      <CommitmentModal
        isOpen={isCommitmentModalOpen}
        onClose={() => setIsCommitmentModalOpen(false)}
      />

    </div>
  );
};
