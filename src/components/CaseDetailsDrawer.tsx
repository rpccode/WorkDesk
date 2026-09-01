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
} from 'lucide-react';
import { CommitmentModal } from './CommitmentModal';
import { FollowupModal } from './FollowupModal';
import { formatRelativeDate, formatDate, isOverdue } from '../utils/date';
import type { Case } from '../types';

interface CaseDetailsDrawerProps {
  c: Case | null;
  onClose: () => void;
}

export const CaseDetailsDrawer: React.FC<CaseDetailsDrawerProps> = ({ c, onClose }) => {
  const {
    commitments,
    followups,
    notes,
    caseEmails,
    fetchCommitments,
    fetchFollowups,
    fetchNotes,
    fetchCaseEmails,
    markCommitmentDone,
    closeCase,
    setCaseForEmail,
  } = useStore();

  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'commitments' | 'followups' | 'notes' | 'emails'>('commitments');

  useEffect(() => {
    if (c) {
      fetchCommitments(c.id);
      fetchFollowups(c.id);
      fetchNotes(c.id);
      fetchCaseEmails(c.id);
    }
  }, [c]);

  if (!c) return null;

  const caseCommitments = commitments.filter((item) => item.case_id === c.id);
  const caseNotes = notes.filter((item) => item.case_id === c.id);
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
            maxWidth: '620px',
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
            }}
          >
            <button
              className={`btn-ghost ${activeTab === 'commitments' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'commitments' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'commitments' ? 700 : 500,
                color: activeTab === 'commitments' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('commitments')}
            >
              <CheckSquare size={15} />
              Compromisos ({caseCommitments.length})
            </button>
            <button
              className={`btn-ghost ${activeTab === 'followups' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'followups' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'followups' ? 700 : 500,
                color: activeTab === 'followups' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('followups')}
            >
              <MessageSquare size={15} />
              Bitácora ({followups.filter((f) => f.case_id === c.id).length})
            </button>
            <button
              className={`btn-ghost ${activeTab === 'emails' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'emails' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'emails' ? 700 : 500,
                color: activeTab === 'emails' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('emails')}
            >
              <Mail size={15} />
              Correos ({caseEmails.length})
            </button>
            <button
              className={`btn-ghost ${activeTab === 'notes' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'notes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'notes' ? 700 : 500,
                color: activeTab === 'notes' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('notes')}
            >
              <FileText size={15} />
              Notas ({caseNotes.length})
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
                  Contexto del Caso
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
                  </div>
                ) : (
                  caseCommitments.map((com) => {
                    const isDone = com.status === 'done';
                    const overdue = isOverdue(com.due_date) && !isDone;

                    return (
                      <div
                        key={com.id}
                        className="glass-card"
                        style={{
                          padding: '0.9rem 1.1rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          borderLeft: overdue ? '3px solid var(--status-critical)' : isDone ? '3px solid var(--status-low)' : '3px solid var(--border-subtle)',
                          opacity: isDone ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => !isDone && markCommitmentDone(com.id)}
                            disabled={isDone}
                            style={{ marginTop: '0.2rem', accentColor: 'var(--accent-primary)', cursor: isDone ? 'default' : 'pointer' }}
                          />
                          <div>
                            <p style={{ fontSize: '0.88rem', fontWeight: 600, textDecoration: isDone ? 'line-through' : 'none' }}>
                              {com.description}
                            </p>
                            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <span>Responsable: {com.owner === 'me' ? '🙋‍♂️ Consultor' : com.owner === 'client' ? '🏢 Cliente' : '👥 Tercero'}</span>
                              {com.due_date && (
                                <span style={{ color: overdue ? 'var(--status-critical)' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
                                  Vence: {formatDate(com.due_date)} ({formatRelativeDate(com.due_date)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isDone ? (
                          <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>Completado</span>
                        ) : overdue ? (
                          <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>Vencido</span>
                        ) : (
                          <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>Pendiente</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB: FOLLOWUPS */}
            {activeTab === 'followups' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {followups.filter((f) => f.case_id === c.id).length === 0 ? (
                  <div className="empty-state">
                    <MessageSquare size={32} />
                    <p>No hay llamadas, reuniones ni minutas registradas.</p>
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
          </div>
        </div>
      </div>

      <CommitmentModal
        isOpen={isCommitmentModalOpen}
        onClose={() => {
          setIsCommitmentModalOpen(false);
          fetchCommitments(c.id);
        }}
        defaultCaseId={c.id}
      />

      <FollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => {
          setIsFollowupModalOpen(false);
          fetchFollowups(c.id);
        }}
        caseId={c.id}
        caseTitle={c.title}
      />
    </>
  );

  return ReactDOM.createPortal(drawerContent, document.body);
};
