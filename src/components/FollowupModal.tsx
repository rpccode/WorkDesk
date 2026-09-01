import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import { MessageSquare, X, Check, AlertCircle } from 'lucide-react';
import { getTodayIso } from '../utils/date';
import type { FollowupType } from '../types';
import { playNotificationSound } from '../utils/live-alerts';

interface FollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
}

export const FollowupModal: React.FC<FollowupModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
}) => {
  const { createFollowup, fetchFollowups, addNotification } = useStore();
  const [type, setType] = useState<FollowupType>('meeting');
  const [summary, setSummary] = useState('');
  const [date, setDate] = useState(getTodayIso());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setSummary('');
      setType('meeting');
      setDate(getTodayIso());
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!summary.trim()) {
      errors.summary = 'El resumen o minuta del seguimiento es obligatorio.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setError('Por favor completa el resumen de la interacción.');
      playNotificationSound('critical');
      addNotification({
        type: 'warning',
        title: 'Formulario Incompleto',
        message: 'Debes escribir el resumen del seguimiento antes de guardar.',
        show_toast: true,
      });
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createFollowup({
        case_id: caseId,
        type,
        summary: summary.trim(),
        date,
      });
      await fetchFollowups(caseId);

      playNotificationSound('success');
      addNotification({
        type: 'success',
        title: 'Seguimiento Registrado',
        message: `La minuta se guardó exitosamente en el caso "${caseTitle}".`,
        show_toast: true,
      });
      onClose();
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : err?.message || 'Error al guardar el seguimiento.';
      setError(errMsg);
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error al Guardar',
        message: errMsg,
        show_toast: true,
      });
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
        zIndex: 99995,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '1.75rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Registrar Seguimiento / Bitácora</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Caso: {caseTitle}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--status-critical)',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Tipo de Interacción
              </label>
              <select value={type} onChange={(e) => setType(e.target.value as FollowupType)} style={{ width: '100%' }}>
                <option value="meeting">🤝 Reunión / Sesión</option>
                <option value="call">📞 Llamada Telefónica</option>
                <option value="email">✉️ Correo Electrónico</option>
                <option value="note">📝 Nota / Actualización Interna</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Fecha
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Resumen / Minuta de Acuerdos <span style={{ color: 'var(--status-critical)' }}>*</span>
            </label>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (fieldErrors.summary) setFieldErrors((prev) => ({ ...prev, summary: '' }));
              }}
              placeholder="¿Qué se acordó o discutió en esta sesión?..."
              style={{
                width: '100%',
                resize: 'vertical',
                border: fieldErrors.summary ? '1.5px solid var(--status-critical)' : undefined,
                boxShadow: fieldErrors.summary ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
              }}
            />
            {fieldErrors.summary && (
              <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} /> {fieldErrors.summary}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              <Check size={16} />
              {isSaving ? 'Guardando...' : 'Guardar Minuta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
