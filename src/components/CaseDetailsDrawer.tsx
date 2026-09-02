import React, { useEffect, useState, useMemo } from 'react';
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
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import { CommitmentModal } from './CommitmentModal';
import { FollowupModal } from './FollowupModal';
import { CaseBriefModal } from './CaseBriefModal';
import { MeetingPrepModal } from './MeetingPrepModal';
import { EmailImportModal } from './EmailImportModal';
import { ErrorBoundary } from './ErrorBoundary';
import { formatDate, isOverdue } from '../utils/date';
import { generateCaseSummaryAI, findSimilarCases } from '../services/ai-copilot';
import {
  generateICS,
  triggerICSDownload,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from '../utils/calendar-sync';
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
    tickets,
    cases,
    aiConfig,
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
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [isMeetingPrepOpen, setIsMeetingPrepOpen] = useState(false);
  const [isEmailImportOpen, setIsEmailImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'commitments' | 'followups' | 'notes' | 'emails' | 'timeline' | 'similares'>('commitments');

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Next action inline editing state
  const [isEditingNextAction, setIsEditingNextAction] = useState(false);
  const [nextActionDesc, setNextActionDesc] = useState('');
  const [nextActionDueDate, setNextActionDueDate] = useState('');
  const [nextActionOwner, setNextActionOwner] = useState<'me' | 'client' | 'third_party' | 'team'>('me');

  const similarCases = useMemo(() => {
    try {
      return activeCase ? findSimilarCases(activeCase, cases || [], notes || []) : [];
    } catch (err) {
      console.error('Error finding similar cases:', err);
      return [];
    }
  }, [activeCase, cases, notes]);

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

  const caseCommitments = (commitments || []).filter((item) => item && item.case_id === c.id);
  const caseNotes = (notes || []).filter((item) => item && item.case_id === c.id);
  const caseActivities = (activityEvents || []).filter((ev) => ev && (ev.case_id === c.id || ev.entity_id === c.id));
  const caseFollowups = (followups || []).filter((f) => f && f.case_id === c.id);
  const caseEmailsList = caseEmails || [];
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

  const handleGenerateAISummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await generateCaseSummaryAI(
        c,
        commitments,
        notes,
        tickets,
        aiConfig
      );
      setAiSummary(summary);
    } catch (err: any) {
      addNotification({
        type: 'critical',
        title: 'Error Generando Resumen IA',
        message: err.message || 'No se pudo generar el resumen del caso.',
        show_toast: true,
      });
    } finally {
      setIsGeneratingSummary(false);
    }
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
              gap: '0.45rem',
              backgroundColor: 'var(--bg-surface)',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="btn-primary"
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
              onClick={() => setIsCommitmentModalOpen(true)}
            >
              <Plus size={13} /> + Compromiso
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
              onClick={() => setIsFollowupModalOpen(true)}
            >
              <Plus size={13} /> Actividad
            </button>
            <button
              className="btn-secondary"
              style={{
                fontSize: '0.76rem',
                padding: '0.35rem 0.65rem',
                border: '1px solid var(--accent-border, rgba(59,130,246,0.3))',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(147,51,234,0.12) 100%)',
                color: 'var(--accent-primary)',
                fontWeight: 700,
              }}
              onClick={handleGenerateAISummary}
              disabled={isGeneratingSummary}
            >
              <Sparkles size={13} className={isGeneratingSummary ? 'animate-spin' : ''} />
              {isGeneratingSummary ? 'Resumiendo...' : '✨ Resumen IA'}
            </button>
            <button
              className="btn-secondary"
              style={{
                fontSize: '0.76rem',
                padding: '0.35rem 0.65rem',
                color: 'var(--accent-primary)',
              }}
              onClick={() => setIsMeetingPrepOpen(true)}
            >
              <Calendar size={13} /> ✨ Preparar Reunión
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
              onClick={() => setIsBriefModalOpen(true)}
            >
              <FileText size={13} /> Minuta Word
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
              onClick={() => {
                setCaseForEmail(c);
                onClose();
              }}
            >
              <Mail size={13} /> Redactar
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
              onClick={() => setIsEmailImportOpen(true)}
            >
              <Mail size={13} /> 📎 Adjuntar Correo
            </button>
            {c.status !== 'closed' && (
              <button
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem', color: 'var(--status-low)', marginLeft: 'auto' }}
                onClick={handleCloseCase}
              >
                <CheckCircle2 size={13} /> Cerrar
              </button>
            )}
          </div>

          {/* AI Summary Inline Accordion */}
          {aiSummary && (
            <div
              className="animate-fade-in"
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderBottom: '1px solid var(--accent-border, rgba(59,130,246,0.3))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.82rem' }}>
                  <Sparkles size={15} /> Resumen Ejecutivo del Caso (IA)
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
                  onClick={() => setAiSummary(null)}
                >
                  Cerrar
                </button>
              </div>
              <div
                style={{
                  fontSize: '0.82rem',
                  lineHeight: 1.55,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {aiSummary}
              </div>
            </div>
          )}

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
              Bitácora ({caseFollowups.length})
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
              Correos ({caseEmailsList.length})
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
              Línea de Tiempo ({caseActivities.length})
            </button>
            <button
              className={`btn-ghost ${activeTab === 'similares' ? 'active' : ''}`}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'similares' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.75rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'similares' ? 700 : 500,
                color: activeTab === 'similares' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab('similares')}
            >
              <Layers size={14} />
              Similares IA ({similarCases.length})
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
                {caseCommitments.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem', gap: '0.35rem' }}
                      onClick={() => {
                        const events = caseCommitments
                          .filter((cm) => cm.due_date)
                          .map((cm) => ({
                            id: cm.id,
                            title: `[${c.title}] ${cm.description}`,
                            description: `Compromiso de WorkDesk para el caso: ${c.title}\nResponsable: ${cm.owner === 'me' ? 'Mío' : cm.owner === 'client' ? 'Cliente' : 'Terceros'}`,
                            startDate: cm.due_date!,
                            clientName: c.client_name ?? undefined,
                            status: cm.status === 'done' ? 'COMPLETED' : 'CONFIRMED',
                          }));
                        if (events.length === 0) {
                          addNotification({
                            type: 'info',
                            title: 'Sin fechas de vencimiento',
                            message: 'Asigna fecha a tus compromisos para exportarlos al calendario.',
                            show_toast: true,
                          });
                          return;
                        }
                        const ics = generateICS(events, `Compromisos - ${c.title}`);
                        triggerICSDownload(`compromisos-${c.id.slice(0, 8)}.ics`, ics);
                        addNotification({
                          type: 'success',
                          title: 'Calendario Descargado',
                          message: `Se exportaron ${events.length} compromisos a archivo .ics`,
                          show_toast: true,
                        });
                      }}
                    >
                      <Calendar size={13} /> 📥 Exportar Todos a Calendario (.ics)
                    </button>
                  </div>
                )}

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
                      <div style={{ flex: 1, minWidth: 0, marginRight: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
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
                        <p style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                          {comm.description}
                        </p>

                        {/* Calendar sync quick links */}
                        {comm.due_date && comm.status !== 'done' && (
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', color: 'var(--accent-primary)' }}
                              onClick={() => {
                                const ics = generateICS([
                                  {
                                    id: comm.id,
                                    title: comm.description,
                                    description: `Caso: ${c.title}\nResponsable: ${comm.owner}`,
                                    startDate: comm.due_date!,
                                    clientName: c.client_name ?? undefined,
                                  },
                                ]);
                                triggerICSDownload(`compromiso-${comm.id.slice(0, 6)}.ics`, ics);
                              }}
                              title="Descargar archivo .ics para Outlook/Apple/Google Calendar"
                            >
                              📥 .ics
                            </button>
                            <a
                              href={generateGoogleCalendarUrl({
                                title: comm.description,
                                description: `Caso: ${c.title}`,
                                startDate: comm.due_date,
                              })}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost"
                              style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', textDecoration: 'none', color: 'var(--text-muted)' }}
                              title="Crear evento en Google Calendar"
                            >
                              🌐 Google
                            </a>
                            <a
                              href={generateOutlookCalendarUrl({
                                title: comm.description,
                                description: `Caso: ${c.title}`,
                                startDate: comm.due_date,
                              })}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost"
                              style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', textDecoration: 'none', color: 'var(--text-muted)' }}
                              title="Crear evento en Outlook Calendar Web"
                            >
                              📧 Outlook
                            </a>
                          </div>
                        )}
                      </div>

                      {comm.status !== 'done' && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', flexShrink: 0 }}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {caseEmails.length} correo(s) vinculados
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem' }}
                      onClick={() => setIsEmailImportOpen(true)}
                    >
                      <Mail size={13} /> 📎 Adjuntar / Importar Correo
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem' }}
                      onClick={() => setCaseForEmail(c)}
                    >
                      <Mail size={13} /> Redactar
                    </button>
                  </div>
                </div>

                {caseEmails.length === 0 ? (
                  <div className="empty-state">
                    <Mail size={32} />
                    <p>No hay correos vinculados automáticamente a este caso.</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Puedes importar un correo (.eml o texto) o redactar uno nuevo directamente.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => setIsEmailImportOpen(true)}
                      >
                        <Mail size={13} /> 📎 Adjuntar Correo como Evidencia
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => setCaseForEmail(c)}
                      >
                        <Mail size={13} /> Redactar Correo
                      </button>
                    </div>
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
                          {(() => {
                            try {
                              const d = new Date(ev.created_at);
                              return isNaN(d.getTime()) ? (ev.created_at || '') : d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                            } catch {
                              return ev.created_at || '';
                            }
                          })()}
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
            {/* TAB: SIMILARES IA */}
            {activeTab === 'similares' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: 'var(--accent-glow)', borderRadius: 'var(--radius-md)', fontSize: '0.76rem', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
                  💡 <strong>Casos Similares:</strong> Analiza casos abiertos y cerrados con problemáticas, clientes o patrones parecidos para reutilizar soluciones previas.
                </div>

                {similarCases.length === 0 ? (
                  <div className="empty-state">
                    <Layers size={32} />
                    <p>No se encontraron otros casos con patrones o palabras clave similares.</p>
                  </div>
                ) : (
                  similarCases.map((sim, idx) => (
                    <div
                      key={idx}
                      className="glass-card"
                      style={{
                        padding: '1rem 1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {sim.caseItem.client_name || 'Sin cliente'}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: 'var(--accent-glow)',
                            color: 'var(--accent-primary)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          {Math.round(sim.score * 100)}% Similitud
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>
                        {sim.caseItem.title}
                      </h4>

                      {sim.caseItem.description && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                          {sim.caseItem.description.slice(0, 160)}...
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {sim.matchingPoints.map((pt, pIdx) => (
                          <span
                            key={pIdx}
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            ✓ {pt}
                          </span>
                        ))}
                      </div>
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

      <CaseBriefModal
        isOpen={isBriefModalOpen}
        onClose={() => setIsBriefModalOpen(false)}
        caseItem={c}
      />

      <MeetingPrepModal
        isOpen={isMeetingPrepOpen}
        onClose={() => setIsMeetingPrepOpen(false)}
        caseItem={c}
      />

      <EmailImportModal
        isOpen={isEmailImportOpen}
        onClose={() => {
          setIsEmailImportOpen(false);
          if (activeCase) {
            fetchCaseEmails(activeCase.id);
            fetchCommitments(activeCase.id);
            fetchFollowups(activeCase.id);
          }
        }}
        defaultCaseId={c.id}
      />
    </>
  );

  return ReactDOM.createPortal(
    <ErrorBoundary fallbackTitle="Error al abrir el detalle del caso">
      {drawerContent}
    </ErrorBoundary>,
    document.body
  );
};
