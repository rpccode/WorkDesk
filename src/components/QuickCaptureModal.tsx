import React, { useState } from 'react';
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={() => setQuickCaptureOpen(false)}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-focus)',
          boxShadow: 'var(--shadow-glow), var(--shadow-md)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Captura Rápida</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Guarda notas, pendientes o ideas al instante</p>
            </div>
          </div>
          <button
            onClick={() => setQuickCaptureOpen(false)}
            style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <textarea
              autoFocus
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="¿Qué ocurrió? / ¿Qué pendiente surgió?..."
              style={{ width: '100%', resize: 'none', fontSize: '0.95rem' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                Vincular a caso (opcional)
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- Sin caso específico --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.client_name || 'Cliente'}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: isCommitment ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  padding: '0.5rem 0',
                }}
              >
                <input
                  type="checkbox"
                  checked={isCommitment}
                  onChange={(e) => setIsCommitment(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Es un compromiso con fecha
              </label>
            </div>
          </div>

          {isCommitment && (
            <div className="animate-fade-in">
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                Fecha límite de entrega
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
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
              {isSaving ? 'Guardando...' : 'Guardar captura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
