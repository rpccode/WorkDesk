import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import { CheckSquare, X, Check, AlertCircle } from 'lucide-react';
import { SearchableCaseSelect } from './SearchableCaseSelect';
import type { CommitmentOwner } from '../types';
import { playNotificationSound } from '../utils/live-alerts';

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
  const { cases, createCommitment, addNotification } = useStore();
  const [caseId, setCaseId] = useState(defaultCaseId || (cases[0]?.id || ''));
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState<CommitmentOwner>('me');
  const [dueDate, setDueDate] = useState(initialDueDate || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setDescription('');
      setOwner('me');
      if (defaultCaseId) setCaseId(defaultCaseId);
      if (initialDueDate) setDueDate(initialDueDate);
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, defaultCaseId, initialDueDate]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!description.trim()) {
      errors.description = 'La descripción o entregable del compromiso es obligatorio.';
    }

    if (!caseId) {
      errors.caseId = 'Debes vincular el compromiso a un caso.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setError('Por favor completa los campos requeridos en rojo.');
      playNotificationSound('critical');
      addNotification({
        type: 'warning',
        title: 'Formulario Incompleto',
        message: 'Debes seleccionar un caso e ingresar la descripción del acuerdo.',
        show_toast: true,
      });
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

      playNotificationSound('success');
      addNotification({
        type: 'success',
        title: 'Compromiso Creado',
        message: `El compromiso "${description.trim()}" ha sido programado.`,
        show_toast: true,
      });
      onClose();
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : err?.message || 'Error al guardar el compromiso.';
      setError(errMsg);
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error al Guardar Compromiso',
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
        zIndex: 99990,
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
          maxWidth: '540px',
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
              <CheckSquare size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Nuevo Compromiso / Entrega</h3>
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
          <div>
            <SearchableCaseSelect
              label="Caso Vinculado"
              cases={cases}
              selectedCaseId={caseId}
              onChange={(id) => {
                setCaseId(id);
                if (fieldErrors.caseId) setFieldErrors((prev) => ({ ...prev, caseId: '' }));
              }}
              placeholder="Buscar caso o cliente..."
              required
            />
            {fieldErrors.caseId && (
              <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} /> {fieldErrors.caseId}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Descripción del Compromiso / Entregable <span style={{ color: 'var(--status-critical)' }}>*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: '' }));
              }}
              placeholder="Ej. Enviar propuesta técnica ajustada / Entregar reporte de pruebas"
              style={{
                width: '100%',
                border: fieldErrors.description ? '1.5px solid var(--status-critical)' : undefined,
                boxShadow: fieldErrors.description ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
              }}
            />
            {fieldErrors.description && (
              <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} /> {fieldErrors.description}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Responsable del Acuerdo
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value as CommitmentOwner)}
                style={{ width: '100%' }}
              >
                <option value="me">🙋‍♂️ Mío (Consultor)</option>
                <option value="client">🏢 Cliente</option>
                <option value="third_party">👥 Tercero / Proveedor</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Fecha Límite / Vencimiento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
            >
              <Check size={16} />
              {isSaving ? 'Guardando...' : 'Crear Compromiso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
