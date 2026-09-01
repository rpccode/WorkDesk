import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import {
  Inbox,
  Plus,
  Trash2,
  CheckCircle2,
  Briefcase,
  CheckSquare,
  FileText,
  Building2,
  X,
} from 'lucide-react';
import type { InboxItem, InboxSuggestedType } from '../types';

export const InboxView: React.FC = () => {
  const {
    inboxItems,
    clients,
    cases,
    addInboxItem,
    processInboxItem,
    addNotification,
  } = useStore();

  const [inputContent, setInputContent] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [suggestedType, setSuggestedType] = useState<InboxSuggestedType>('task');
  const [activeTab, setActiveTab] = useState<'unprocessed' | 'processed'>('unprocessed');

  // Processing modal state
  const [processingItem, setProcessingItem] = useState<InboxItem | null>(null);
  const [triageTarget, setTriageTarget] = useState<'case' | 'commitment' | 'followup' | 'note'>('case');
  const [triageCaseId, setTriageCaseId] = useState<string>('');
  const [triageClientId, setTriageClientId] = useState<string>('');
  const [triageTitle, setTriageTitle] = useState('');
  const [triagePriority, setTriagePriority] = useState<string>('medium');
  const [triageOwner, setTriageOwner] = useState<'me' | 'client' | 'third_party'>('me');
  const [triageDueDate, setTriageDueDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const unprocessedItems = useMemo(() => inboxItems.filter((i) => i.status === 'inbox'), [inboxItems]);
  const processedItems = useMemo(() => inboxItems.filter((i) => i.status !== 'inbox'), [inboxItems]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    addInboxItem(inputContent.trim(), suggestedType, selectedClientId || null);
    setInputContent('');
    addNotification({
      type: 'success',
      title: 'Capturado en Inbox',
      message: 'Tu idea o tarea fue guardada. Podrás procesarla cuando quieras.',
      show_toast: true,
    });
  };

  const handleOpenTriage = (item: InboxItem, target: 'case' | 'commitment' | 'followup' | 'note') => {
    setProcessingItem(item);
    setTriageTarget(target);
    setTriageClientId(item.client_id || (clients[0]?.id || ''));
    setTriageCaseId(cases[0]?.id || '');
    setTriageTitle(item.content.substring(0, 80));
    setTriageDueDate(new Date().toISOString().split('T')[0]);
  };

  const handleExecuteTriage = async () => {
    if (!processingItem) return;

    let targetData: any = {};
    if (triageTarget === 'case') {
      targetData = {
        client_id: triageClientId,
        title: triageTitle.trim() || processingItem.content.substring(0, 80),
        priority: triagePriority,
      };
    } else if (triageTarget === 'commitment') {
      targetData = {
        case_id: triageCaseId,
        owner: triageOwner,
        due_date: triageDueDate,
      };
    } else if (triageTarget === 'note') {
      targetData = {
        case_id: triageCaseId || undefined,
      };
    } else if (triageTarget === 'followup') {
      targetData = {
        case_id: triageCaseId,
        type: 'call',
        date: triageDueDate,
      };
    }

    await processInboxItem(processingItem.id, triageTarget, targetData);
    setProcessingItem(null);
    addNotification({
      type: 'success',
      title: 'Elemento Procesado',
      message: `Convertido a ${triageTarget === 'case' ? 'Caso' : triageTarget === 'commitment' ? 'Compromiso' : triageTarget === 'note' ? 'Nota' : 'Seguimiento'}.`,
      show_toast: true,
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
            <Inbox size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
              Bandeja de Entrada (Inbox GTD)
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
              Captura rápida sin fricción para registrar ideas o tareas y procesarlas después
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge" style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.78rem' }}>
            {unprocessedItems.length} Pendientes de clasificar
          </span>
        </div>
      </div>

      {/* ── Quick Capture Bar ────────────────────────────────────────── */}
      <form onSubmit={handleQuickAdd} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <input
            type="text"
            placeholder="¿Qué tienes en mente? Escribe y pulsa Enter (ej. Llamar a Juan mañana para confirmar balance)..."
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            style={{ flex: 1, fontSize: '0.9rem', padding: '0.75rem 1rem' }}
            autoFocus
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 1.25rem', fontSize: '0.86rem' }}>
            <Plus size={16} /> Capturar
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cliente (opcional):</span>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            >
              <option value="">Sin asignar</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tipo sugerido:</span>
            <select
              value={suggestedType}
              onChange={(e) => setSuggestedType(e.target.value as any)}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            >
              <option value="task">Tarea / Compromiso</option>
              <option value="case">Nuevo Caso</option>
              <option value="followup">Seguimiento</option>
              <option value="note">Nota rápida</option>
            </select>
          </div>
        </div>
      </form>

      {/* ── Tabs Navigation ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className="btn-ghost"
          style={{
            fontWeight: activeTab === 'unprocessed' ? 800 : 500,
            color: activeTab === 'unprocessed' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'unprocessed' ? '2px solid var(--accent-primary)' : 'none',
            borderRadius: 0,
            padding: '0.4rem 0.8rem',
            fontSize: '0.84rem',
          }}
          onClick={() => setActiveTab('unprocessed')}
        >
          Por Procesar ({unprocessedItems.length})
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{
            fontWeight: activeTab === 'processed' ? 800 : 500,
            color: activeTab === 'processed' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'processed' ? '2px solid var(--accent-primary)' : 'none',
            borderRadius: 0,
            padding: '0.4rem 0.8rem',
            fontSize: '0.84rem',
          }}
          onClick={() => setActiveTab('processed')}
        >
          Historial Procesado ({processedItems.length})
        </button>
      </div>

      {/* ── Items List ──────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {activeTab === 'unprocessed' && unprocessedItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5, color: 'var(--status-low)' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>¡Bandeja de entrada limpia (Inbox Zero)!</p>
            <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>No tienes elementos pendientes por clasificar.</p>
          </div>
        )}

        {activeTab === 'unprocessed' && unprocessedItems.map((item) => (
          <div
            key={item.id}
            className="card-hover"
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {item.client_name && (
                  <span className="badge" style={{ fontSize: '0.68rem', backgroundColor: 'rgba(59,130,246,0.12)', color: 'var(--accent-primary)', fontWeight: 800 }}>
                    <Building2 size={11} /> {item.client_name}
                  </span>
                )}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>

              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {item.content}
              </p>
            </div>

            {/* Quick Triage Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem' }}
                onClick={() => handleOpenTriage(item, 'case')}
                title="Convertir a Caso"
              >
                <Briefcase size={12} /> + Caso
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem' }}
                onClick={() => handleOpenTriage(item, 'commitment')}
                title="Convertir a Compromiso"
              >
                <CheckSquare size={12} /> + Compromiso
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem' }}
                onClick={() => handleOpenTriage(item, 'note')}
                title="Guardar como Nota"
              >
                <FileText size={12} /> + Nota
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: '0.74rem', padding: '0.3rem 0.5rem', color: 'var(--status-critical)' }}
                onClick={() => processInboxItem(item.id, 'discarded')}
                title="Descartar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'processed' && processedItems.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: 0.7,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="var(--status-low)" />
              <span style={{ fontSize: '0.84rem' }}>{item.content}</span>
            </div>
            <span className="badge" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
              {item.processed_as || 'procesado'}
            </span>
          </div>
        ))}
      </div>

      {/* ── Processing Modal ────────────────────────────────────────── */}
      {processingItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Convertir a {triageTarget === 'case' ? 'Caso' : triageTarget === 'commitment' ? 'Compromiso' : triageTarget === 'note' ? 'Nota' : 'Seguimiento'}
              </h3>
              <button type="button" className="btn-ghost" onClick={() => setProcessingItem(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              "{processingItem.content}"
            </div>

            {triageTarget === 'case' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Título del Caso:</label>
                  <input
                    type="text"
                    value={triageTitle}
                    onChange={(e) => setTriageTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cliente:</label>
                  <select
                    value={triageClientId}
                    onChange={(e) => setTriageClientId(e.target.value)}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Prioridad:</label>
                  <select
                    value={triagePriority}
                    onChange={(e) => setTriagePriority(e.target.value)}
                  >
                    <option value="critical">Crítica</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
              </div>
            )}

            {triageTarget === 'commitment' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Caso Relacionado:</label>
                  <select
                    value={triageCaseId}
                    onChange={(e) => setTriageCaseId(e.target.value)}
                  >
                    {cases.filter((c) => c.status !== 'closed').map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Responsable:</label>
                    <select
                      value={triageOwner}
                      onChange={(e) => setTriageOwner(e.target.value as any)}
                    >
                      <option value="me">Yo</option>
                      <option value="client">Cliente</option>
                      <option value="third_party">Terceros</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Fecha límite:</label>
                    <input
                      type="date"
                      value={triageDueDate}
                      onChange={(e) => setTriageDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {(triageTarget === 'note' || triageTarget === 'followup') && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Caso Asociado:</label>
                <select
                  value={triageCaseId}
                  onChange={(e) => setTriageCaseId(e.target.value)}
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setProcessingItem(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleExecuteTriage}>
                Crear y Procesar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
