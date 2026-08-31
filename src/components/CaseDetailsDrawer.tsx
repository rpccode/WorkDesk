import React, { useEffect, useState } from 'react';
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
    fetchCommitments,
    fetchFollowups,
    fetchNotes,
    markCommitmentDone,
    closeCase,
    setCaseForEmail,
  } = useStore();

  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'commitments' | 'followups' | 'notes'>('commitments');

  useEffect(() => {
    if (c) {
      fetchCommitments(c.id);
      fetchFollowups(c.id);
      fetchNotes(c.id);
    }
  }, [c?.id]);

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

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9980,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
        onClick={onClose}
      >
        <div
          className="animate-fade-in"
          style={{
            width: '100%',
            maxWidth: '680px',
            height: '100%',
            backgroundColor: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-md)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {c.client_name || 'Cliente sin nombre'}
                  </span>
                  {getPriorityBadge(c.priority)}
                  <span className={`badge ${c.status === 'closed' ? 'badge-neutral' : 'badge-low'}`}>
                    {c.status === 'closed' ? 'Cerrado' : 'Activo'}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{c.title}</h2>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {c.description && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', whiteSpace: 'pre-line' }}>
                {c.description}
              </p>
            )}

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                onClick={() => setIsCommitmentModalOpen(true)}
              >
                <Plus size={15} /> Compromiso
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                onClick={() => setIsFollowupModalOpen(true)}
              >
                <Plus size={15} /> Bitácora
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                onClick={() => {
                  setCaseForEmail(c);
                  onClose();
                }}
              >
                <Mail size={15} /> Redactar Correo
              </button>

              {c.status !== 'closed' && (
                <button
                  className="btn-danger"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', marginLeft: 'auto' }}
                  onClick={handleCloseCase}
                >
                  <CheckCircle2 size={15} /> Cerrar Caso
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-main)' }}>
            <button
              onClick={() => setActiveTab('commitments')}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: 0,
                borderBottom: activeTab === 'commitments' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'commitments' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'commitments' ? 700 : 500,
                background: 'transparent',
              }}
            >
              <CheckSquare size={16} /> Compromisos ({caseCommitments.length})
            </button>
            <button
              onClick={() => setActiveTab('followups')}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: 0,
                borderBottom: activeTab === 'followups' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'followups' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'followups' ? 700 : 500,
                background: 'transparent',
              }}
            >
              <MessageSquare size={16} /> Bitácora ({followups.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: 0,
                borderBottom: activeTab === 'notes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'notes' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'notes' ? 700 : 500,
                background: 'transparent',
              }}
            >
              <FileText size={16} /> Notas ({caseNotes.length})
            </button>
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
            {activeTab === 'commitments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {caseCommitments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <CheckSquare size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                    <p>No hay compromisos registrados en este caso.</p>
                    <button
                      className="btn-secondary"
                      style={{ marginTop: '0.8rem', fontSize: '0.8rem' }}
                      onClick={() => setIsCommitmentModalOpen(true)}
                    >
                      + Añadir primer compromiso
                    </button>
                  </div>
                ) : (
                  caseCommitments.map((com) => {
                    const isDone = com.status === 'done';
                    const overdue = !isDone && isOverdue(com.due_date);
                    return (
                      <div
                        key={com.id}
                        className="glass-card"
                        style={{
                          padding: '0.9rem 1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          borderLeft: overdue ? '4px solid var(--status-critical)' : isDone ? '4px solid var(--status-low)' : '4px solid var(--accent-primary)',
                          opacity: isDone ? 0.65 : 1,
                        }}
                      >
                        <button
                          onClick={() => !isDone && markCommitmentDone(com.id)}
                          style={{
                            background: isDone ? 'var(--status-low-bg)' : 'transparent',
                            color: isDone ? 'var(--status-low)' : 'var(--text-muted)',
                            border: `1px solid ${isDone ? 'var(--status-low)' : 'var(--border-subtle)'}`,
                            padding: '0.4rem',
                            borderRadius: '50%',
                            cursor: isDone ? 'default' : 'pointer',
                          }}
                          title={isDone ? 'Completado' : 'Marcar como completado'}
                        >
                          <CheckCircle2 size={16} />
                        </button>

                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 600,
                              textDecoration: isDone ? 'line-through' : 'none',
                              color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                            }}
                          >
                            {com.description}
                          </p>
                          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>
                              {com.owner === 'me' ? '🙋‍♂️ Mi entrega' : com.owner === 'client' ? '🏢 Cliente debe responder' : '👥 Tercero'}
                            </span>
                            {com.due_date && (
                              <span style={{ color: overdue ? 'var(--status-critical)' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
                                • {formatRelativeDate(com.due_date)} ({formatDate(com.due_date)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'followups' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {followups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <MessageSquare size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                    <p>No hay entradas de bitácora registradas.</p>
                    <button
                      className="btn-secondary"
                      style={{ marginTop: '0.8rem', fontSize: '0.8rem' }}
                      onClick={() => setIsFollowupModalOpen(true)}
                    >
                      + Registrar primera interacción
                    </button>
                  </div>
                ) : (
                  followups.map((f) => (
                    <div key={f.id} className="glass-card" style={{ padding: '1rem 1.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span className="badge badge-neutral">
                          {f.type === 'meeting' ? '🤝 Reunión' : f.type === 'call' ? '📞 Llamada' : f.type === 'email' ? '✉️ Correo' : '📝 Nota'}
                        </span>
                        <span>{formatDate(f.date)}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{f.summary}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {caseNotes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <FileText size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
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
};
