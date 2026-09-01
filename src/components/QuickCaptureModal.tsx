import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import { Zap, X, Check } from 'lucide-react';

export const QuickCaptureModal: React.FC = () => {
  const { isQuickCaptureOpen, setQuickCaptureOpen, cases, createNote, createCommitment } = useStore();
  const [content, setContent] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [isCommitment, setIsCommitment] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isQuickCaptureOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      if (isCommitment && selectedCaseId) {
        await createCommitment({
          case_id: selectedCaseId,
          description: content.trim(),
          due_date: dueDate || undefined,
          owner: 'me',
        });
      } else {
        await createNote({
          case_id: selectedCaseId || undefined,
          content: content.trim(),
        });
      }
      setContent('');
      setSelectedCaseId('');
      setIsCommitment(false);
      setDueDate('');
      setQuickCaptureOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={() => setQuickCaptureOpen(false)}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '1.75rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-focus)',
          boxShadow: 'var(--shadow-glow), var(--shadow-lg)',
          borderRadius: 'var(--radius-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <Zap size={18} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Captura Rápida</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              Ctrl+N / Alt+N
            </span>
          </div>
          <button onClick={() => setQuickCaptureOpen(false)} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <textarea
              rows={3}
              autoFocus
              placeholder="Escribe un compromiso, idea, nota de reunión o pendiente..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ width: '100%', resize: 'none' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleSubmit(e);
                }
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Vincular a Caso (Opcional)
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">(Sin caso específico / Nota general)</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.client_name || 'Cliente'}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedCaseId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isCommitment}
                    onChange={(e) => setIsCommitment(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <span>Registrar como Compromiso formal</span>
                </label>

                {isCommitment && (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setQuickCaptureOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !content.trim()}
            >
              <Check size={16} />
              {isSaving ? 'Guardando...' : 'Guardar (Ctrl+Enter)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
