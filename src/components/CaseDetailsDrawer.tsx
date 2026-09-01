import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import {
  X,
  Plus,
  CheckSquare,
  MessageSquare,
  Mail,
  CheckCircle2,
  FileText,
  Target,
  Edit3,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { CommitmentModal } from './CommitmentModal';
import { FollowupModal } from './FollowupModal';
import { formatDate, isOverdue } from '../utils/date';
import type { Case, NextAction } from '../types';

interface CaseDetailsDrawerProps {
  c?: Case | null;
  caseItem?: Case | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const CaseDetailsDrawer: React.FC<CaseDetailsDrawerProps> = ({ c: propC, caseItem, isOpen = true, onClose }) => {
  const activeCase = caseItem || propC || null;
  const {
    commitments,
    followups,
    notes,
    caseEmails,
    activityEvents,
    fetchCommitments,
    fetchFollowups,
    fetchNotes,
    fetchCaseEmails,
    markCommitmentDone,
    updateCaseNextAction,
    closeCase,
    setCaseForEmail,
    addNotification,
  } = useStore();

  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'commitments' | 'followups' | 'notes' | 'emails' | 'timeline'>('commitments');

  // Next action inline editing state
  const [isEditingNextAction, setIsEditingNextAction] = useState(false);
  const [nextActionDesc, setNextActionDesc] = useState('');
  const [nextActionDueDate, setNextActionDueDate] = useState('');
  const [nextActionOwner, setNextActionOwner] = useState<'me' | 'client' | 'third_party' | 'team'>('me');

  useEffect(() => {
    if (activeCase) {
      fetchCommitments(activeCase.id);
      fetchFollowups(activeCase.id);
      fetchNotes(activeCase.id);
      fetchCaseEmails(activeCase.id);
      setNextActionDesc(activeCase.next_action?.description || '');
      setNextActionDueDate(activeCase.next_action?.due_date || '');
      setNextActionOwner(activeCase.next_action?.owner_type || 'me');
      setIsEditingNextAction(false);
    }
  }, [activeCase]);

  if (!isOpen || !activeCase) return null;
  const c = activeCase;

  const caseCommitments = commitments.filter((item) => item.case_id === c.id);
  const caseNotes = notes.filter((item) => item.case_id === c.id);
  const caseActivities = activityEvents.filter((ev) => ev.case_id === c.id || ev.entity_id === c.id);
  const pendingCommitments = caseCommitments.filter((item) => item.status !== 'done');

  const handleCloseCase = async () => {
    if (pendingCommitments.length > 0) {
      const confirmClose = window.confirm(
        `Este caso tiene ${pendingCommitments.length} compromiso(s) pendiente(s). ¿Estás seguro de cerrarlo?`
      );
      if (!confirmClose) return;
    }
    await closeCase(c.id);
    onClose();
  };

  const handleSaveNextAction = () => {
    if (!nextActionDesc.trim()) return;
    const action: NextAction = {
      description: nextActionDesc.trim(),
      due_date: nextActionDueDate || undefined,
      owner_type: nextActionOwner,
      status: 'pending',
    };
    updateCaseNextAction(c.id, action);
    setIsEditingNextAction(false);
    addNotification({
      type: 'success',
      title: 'Próxima Acción Actualizada',
      message: `Próximo paso guardado para "${c.title}".`,
      show_toast: true,
    });
  };

  const handleCompleteNextAction = () => {
    if (!c.next_action) return;
    updateCaseNextAction(c.id, {
      ...c.next_action,
      status: 'done',
    });
    addNotification({
      type: 'success',
      title: 'Próxima Acción Cumplida',
      message: `Acción marcada como hecha. ¡Recuerda definir el siguiente paso!`,
      show_toast: true,
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="badge badge-critical">🚨 Crítica</span>;
      case 'high':
        return <span className="badge badge-high">Alta</span>;
      case 'medium':
        return <span className="badge badge-medium">Media</span>;
      default:
        return <span className="badge badge-low">Baja</span>;
    }
  };

  const drawerContent = (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 9980,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
        onClick={onClose}
      >
        <div
          className="glass-card animate-fade-in"
          style={{
            width: '100%',
            maxWidth: '640px',
            height: '100%',
            backgroundColor: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              backgroundColor: 'var(--bg-surface-elevated)',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {c.client_name || 'Sin Cliente Asociado'}
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>{c.title}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                {getPriorityBadge(c.priority)}
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                  Estado: {c.status}
                </span>
              </div>
            </div>

            <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>

          {/* ── CORE TRIAD: PRÓXIMA ACCIÓN HIGHLIGHT ────────────────────── */}
          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'rgba(37,99,235,0.06)',
              borderBottom: '1px solid rgba(59,130,246,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Target size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
                  Próxima Acción (Next Action)
                </span>
              </div>

              {!isEditingNextAction && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--accent-primary)' }}
                  onClick={() => setIsEditingNextAction(true)}
                >
                  <Edit3 size={12} /> {c.next_action?.description ? 'Editar' : 'Definir'}
                </button>
              )}
            </div>

            {isEditingNextAction ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                <input
                  type="text"
                  placeholder="¿Qué tiene que suceder ahora para que esto avance?..."
                  value={nextActionDesc}
                  onChange={(e) => setNextActionDesc(e.target.value)}
                  style={{ fontSize: '0.86rem', padding: '0.5rem 0.75rem' }}
                  autoFocus
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fecha límite:</label>
                    <input
                      type="date"
                      value={nextActionDueDate}
                      onChange={(e) => setNextActionDueDate(e.target.value)}
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Responsable:</label>
                    <select
                      value={nextActionOwner}
                      onChange={(e) => setNextActionOwner(e.target.value as any)}
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
                    >
                      <option value="me">Yo</option>
                      <option value="client">Cliente</option>
                      <option value="team">Equipo / TI</option>
                      <option value="third_party">Terceros</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn-secondary" style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }} onClick={() => setIsEditingNextAction(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-primary" style={{ fontSize: '0.74rem', padding: '0.25rem 0.8rem' }} onClick={handleSaveNextAction}>
                    Guardar
                  </button>
                </div>
              </div>
            ) : c.next_action?.description ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 900 }}>➔</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {c.next_action.description}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '1.2rem' }}>
                    Responsable: <strong>{c.next_action.owner_type === 'me' ? 'Yo' : c.next_action.owner_type === 'client' ? 'Cliente' : 'Terceros'}</strong>
                    {c.next_action.due_date && <span> • Plazo: <strong>{c.next_action.due_date}</strong></span>}
                  </span>
                </div>

                {c.next_action.status !== 'done' && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem', color: 'var(--status-low)', borderColor: 'var(--status-low)', whiteSpace: 'nowrap' }}
                    onClick={handleCompleteNextAction}
                  >
                    <CheckCircle2 size={13} /> Hecho
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--status-medium)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={14} /> Sin próxima acción definida
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                  onClick={() => setIsEditingNextAction(true)}
                >
                  + Definir ahora
                </button>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div
            style={{
              padding: '0.75rem 1.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-surface)',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              onClick={() => setIsCommitmentModalOpen(true)}
            >
              <Plus size={14} /> Nuevo Compromiso
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              onClick={() => setIsFollowupModalOpen(true)}
            >
              <Plus size={14} /> Registrar Actividad
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              onClick={() => {
                setCaseForEmail(c);
                onClose();
              }}
            >
              <Mail size={14} /> Redactar Correo
            </button>
            {c.status !== 'closed' && (
              <button
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', color: 'var(--status-low)', marginLeft: 'auto' }}
                onClick={handleCloseCase}
              >
                <CheckCircle2 size={14} /> Cerrar Caso
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '0 1.5rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              overflowX: 'auto',
            }}
          >
            <button
              className={`btn-ghost ${activeTab === 'commitments' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'commitments' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'commitments' ? 700 : 500,
                color: activeTab === 'commitments' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('commitments')}
            >
              <CheckSquare size={14} />
              Compromisos ({caseCommitments.length})
            </button>
            <button
              className={`btn-ghost ${activeTab === 'followups' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'followups' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'followups' ? 700 : 500,
                color: activeTab === 'followups' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('followups')}
            >
              <MessageSquare size={14} />
              Bitácora ({followups.filter((f) => f.case_id === c.id).length})
            </button>
            <button
              className={`btn-ghost ${activeTab === 'emails' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'emails' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'emails' ? 700 : 500,
                color: activeTab === 'emails' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('emails')}
            >
              <Mail size={14} />
              Correos ({caseEmails.length})
            </button>
            <button
              className={`btn-ghost ${activeTab === 'notes' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'notes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'notes' ? 700 : 500,
                color: activeTab === 'notes' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('notes')}
            >
              <FileText size={14} />
              Notas ({caseNotes.length})
            </button>
            <button
              className={`btn-ghost ${activeTab === 'timeline' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'timeline' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'timeline' ? 700 : 500,
                color: activeTab === 'timeline' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('timeline')}
            >
              <Activity size={14} />
              Timeline
            </button>
          </div>

          {/* Content Body */}
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            {/* Description card */}
            {c.description && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Contexto y Alcance
                </span>
                {c.description}
              </div>
            )}

            {/* TAB: COMMITMENTS */}
            {activeTab === 'commitments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {caseCommitments.length === 0 ? (
                  <div className="empty-state">
                    <CheckSquare size={32} />
                    <p>No hay compromisos registrados en este caso.</p>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}
                      onClick={() => setIsCommitmentModalOpen(true)}
                    >
                      <Plus size={13} /> Añadir Compromiso
                    </button>
                  </div>
                ) : (
                  caseCommitments.map((comm) => (
                    <div
                      key={comm.id}
                      className="glass-card"
                      style={{
                        padding: '1rem 1.2rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: comm.status === 'done' ? 0.65 : 1,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span className={`badge ${comm.owner === 'me' ? 'badge-low' : 'badge-medium'}`} style={{ fontSize: '0.68rem' }}>
                            {comm.owner === 'me' ? 'Mío' : comm.owner === 'client' ? 'Cliente' : 'Terceros'}
                          </span>
                          {comm.due_date && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: isOverdue(comm.due_date) && comm.status !== 'done' ? 'var(--status-critical)' : 'var(--text-muted)',
                                fontWeight: isOverdue(comm.due_date) && comm.status !== 'done' ? 700 : 400,
                              }}
                            >
                              Vence: {formatDate(comm.due_date)}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {comm.description}
                        </p>
                      </div>

                      {comm.status !== 'done' && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          onClick={() => markCommitmentDone(comm.id)}
                        >
                          <CheckCircle2 size={13} /> Listo
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: FOLLOWUPS */}
            {activeTab === 'followups' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {followups.filter((f) => f.case_id === c.id).length === 0 ? (
                  <div className="empty-state">
                    <MessageSquare size={32} />
                    <p>No hay registros de bitácora para este caso.</p>
                  </div>
                ) : (
                  followups
                    .filter((f) => f.case_id === c.id)
                    .map((f) => (
                      <div key={f.id} className="glass-card" style={{ padding: '0.9rem 1.1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                            {f.type.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {formatDate(f.date)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{f.summary}</p>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* TAB: EMAILS */}
            {activeTab === 'emails' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {caseEmails.length === 0 ? (
                  <div className="empty-state">
                    <Mail size={32} />
                    <p>No hay correos vinculados automáticamente a este caso.</p>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}
                      onClick={() => setCaseForEmail(c)}
                    >
                      <Mail size={13} /> Redactar Correo
                    </button>
                  </div>
                ) : (
                  caseEmails.map((email) => (
                    <div
                      key={email.id}
                      className="glass-card"
                      style={{
                        padding: '1rem 1.2rem',
                        borderLeft: email.direction === 'inbound' ? '3px solid var(--accent-primary)' : '3px solid var(--status-low)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span className="badge" style={{ backgroundColor: email.direction === 'inbound' ? 'var(--accent-glow)' : 'var(--status-low-bg)', color: email.direction === 'inbound' ? 'var(--accent-primary)' : 'var(--status-low)', fontSize: '0.68rem' }}>
                          {email.direction === 'inbound' ? 'Entrante (Cliente)' : 'Enviado (Saliente)'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {formatDate(email.date)}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        {email.subject}
                      </h4>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        De: {email.sender} → Para: {email.recipient}
                      </p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                        {email.body_text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: NOTES */}
            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {caseNotes.length === 0 ? (
                  <div className="empty-state">
                    <FileText size={32} />
                    <p>No hay notas vinculadas a este caso.</p>
                  </div>
                ) : (
                  caseNotes.map((n) => (
                    <div key={n.id} className="glass-card" style={{ padding: '1rem 1.2rem' }}>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{n.content}</p>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {formatDate(n.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: TIMELINE */}
            {activeTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {caseActivities.length === 0 ? (
                  <div className="empty-state">
                    <Activity size={32} />
                    <p>No hay eventos registrados en la línea de tiempo de este caso aún.</p>
                  </div>
                ) : (
                  caseActivities.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderLeft: '3px solid var(--accent-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ev.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(ev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      {ev.description && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                          {ev.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Internal Modals */}
      <CommitmentModal
        isOpen={isCommitmentModalOpen}
        onClose={() => setIsCommitmentModalOpen(false)}
        defaultCaseId={c.id}
      />

      <FollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        caseId={c.id}
        caseTitle={c.title}
      />
    </>
  );

  return ReactDOM.createPortal(drawerContent, document.body);
};
