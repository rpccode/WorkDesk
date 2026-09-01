import React, { useState } from 'react';
import { useStore } from '../store';
import { CheckSquare, X, Check } from 'lucide-react';
import type { CommitmentOwner } from '../types';

interface CommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCaseId?: string;
  initialDueDate?: string;
}

export const CommitmentModal: React.FC<CommitmentModalProps> = ({
  isOpen,
  onClose,
  defaultCaseId,
  initialDueDate,
}) => {
  const { cases, createCommitment } = useStore();
  const [caseId, setCaseId] = useState(defaultCaseId || (cases[0]?.id || ''));
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState<CommitmentOwner>('me');
  const [dueDate, setDueDate] = useState(initialDueDate || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (defaultCaseId) setCaseId(defaultCaseId);
      if (initialDueDate) setDueDate(initialDueDate);
    }
  }, [isOpen, defaultCaseId, initialDueDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('La descripción del compromiso es obligatoria.');
      return;
    }
    if (!caseId) {
      setError('Debes vincular el compromiso a un caso.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createCommitment({
        case_id: caseId,
        description: description.trim(),
        owner,
        due_date: dueDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Error al guardar el compromiso.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9990,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
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
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <CheckSquare size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Nuevo Compromiso / Entrega</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.6rem 0.85rem', marginBottom: '1rem', borderRadius: 'var(--radius-sm)', background: 'var(--status-critical-bg)', color: 'var(--status-critical)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Caso Vinculado *
            </label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              style={{ width: '100%' }}
              required
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.client_name || 'Cliente'}] {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Descripción del Compromiso *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Enviar propuesta técnica ajustada / Entregar reporte de pruebas"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                ¿Quién es el responsable?
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value as CommitmentOwner)}
                style={{ width: '100%' }}
              >
                <option value="me">🙋‍♂️ Yo (Prometí entregar)</option>
                <option value="client">🏢 Cliente (Me debe responder)</option>
                <option value="third_party">👥 Tercero / Proveedor</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Fecha Límite Pactada
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving || !description.trim()}>
              <Check size={16} />
              {isSaving ? 'Guardando...' : 'Crear compromiso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
