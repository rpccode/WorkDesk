import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import { MessageSquare, X, Check } from 'lucide-react';
import { getTodayIso } from '../utils/date';
import type { FollowupType } from '../types';

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
  const { createFollowup, fetchFollowups } = useStore();
  const [type, setType] = useState<FollowupType>('meeting');
  const [summary, setSummary] = useState('');
  const [date, setDate] = useState(getTodayIso());
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    setIsSaving(true);
    try {
      await createFollowup({
        case_id: caseId,
        type,
        summary: summary.trim(),
        date,
      });
      await fetchFollowups(caseId);
      onClose();
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
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registrar Seguimiento / Bitácora</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Caso: {caseTitle}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Tipo de Interacción
              </label>
              <select value={type} onChange={(e) => setType(e.target.value as FollowupType)} style={{ width: '100%' }}>
                <option value="meeting">🤝 Reunión / Sesión</option>
                <option value="call">📞 Llamada Telefónica</option>
                <option value="email">✉️ Correo Enviado / Recibido</option>
                <option value="note">📝 Nota de Avance</option>
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
              Resumen de la Interacción / Acuerdos *
            </label>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="¿Qué se habló, qué se definió o qué acuerdos surgieron?..."
              style={{ width: '100%', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving || !summary.trim()}>
              <Check size={16} />
              {isSaving ? 'Guardando...' : 'Guardar en bitácora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
