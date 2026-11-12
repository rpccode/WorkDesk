import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import { Briefcase, X, Check, UserPlus, FileSpreadsheet, AlertCircle } from 'lucide-react';
import type { Case, CasePriority } from '../types';
import { ClientModal } from './ClientModal';
import { BulkImportClientsModal } from './BulkImportClientsModal';
import { SearchableClientSelect } from './SearchableClientSelect';
import { playNotificationSound } from '../utils/live-alerts';
import { toUserMessage } from '../utils/error-messages';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseToEdit?: Case | null;
}

export const CaseModal: React.FC<CaseModalProps> = ({ isOpen, onClose, caseToEdit }) => {
  const { clients, createCase, updateCase, addNotification } = useStore();
  const [clientId, setClientId] = useState(caseToEdit?.client_id || (clients[0]?.id || ''));
  const [title, setTitle] = useState(caseToEdit?.title || '');
  const [description, setDescription] = useState(caseToEdit?.description || '');
  const [priority, setPriority] = useState<CasePriority>(caseToEdit?.priority || 'medium');
  const [status, setStatus] = useState(caseToEdit?.status || 'open');
  const [nextActionDesc, setNextActionDesc] = useState(caseToEdit?.next_action?.description || '');
  const [nextActionDueDate, setNextActionDueDate] = useState(caseToEdit?.next_action?.due_date || '');
  const [nextActionOwner, setNextActionOwner] = useState<'me' | 'client' | 'third_party' | 'team'>(caseToEdit?.next_action?.owner_type || 'me');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  React.useEffect(() => {
    if (isOpen) {
      if (caseToEdit) {
        setClientId(caseToEdit.client_id);
        setTitle(caseToEdit.title);
        setDescription(caseToEdit.description || '');
        setPriority(caseToEdit.priority);
        setStatus(caseToEdit.status);
        setNextActionDesc(caseToEdit.next_action?.description || '');
        setNextActionDueDate(caseToEdit.next_action?.due_date || '');
        setNextActionOwner(caseToEdit.next_action?.owner_type || 'me');
      } else {
        setClientId(clients[0]?.id || '');
        setTitle('');
        setDescription('');
        setPriority('medium');
        setStatus('open');
        setNextActionDesc('');
        setNextActionDueDate(new Date().toISOString().split('T')[0]);
        setNextActionOwner('me');
      }
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, caseToEdit, clients]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'El título o asunto del caso es obligatorio.';
    }

    if (!clientId && !caseToEdit) {
      errors.client = 'Debes vincular un cliente al caso.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setError('Por favor completa los campos requeridos señalados en rojo.');
      playNotificationSound('critical');
      addNotification({
        type: 'warning',
        title: 'Formulario Incompleto',
        message: 'Debes ingresar el título y seleccionar un cliente.',
        show_toast: true,
      });
      return;
    }

    setIsSaving(true);
    setError(null);

    const nextActionObj = nextActionDesc.trim()
      ? {
          description: nextActionDesc.trim(),
          due_date: nextActionDueDate || undefined,
          owner_type: nextActionOwner,
          status: 'pending' as const,
        }
      : null;

    try {
      if (caseToEdit) {
        await updateCase({
          id: caseToEdit.id,
          client_id: clientId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          next_action: nextActionObj,
        });
        addNotification({
          type: 'success',
          title: 'Caso Actualizado',
          message: `El caso "${title.trim()}" se actualizó correctamente.`,
          show_toast: true,
        });
      } else {
        await createCase({
          client_id: clientId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          next_action: nextActionObj,
        });
        addNotification({
          type: 'success',
          title: 'Caso Creado',
          message: `El caso "${title.trim()}" ha sido registrado.`,
          show_toast: true,
        });
      }

      playNotificationSound('success');
      onClose();
    } catch (err: any) {
      const errMsg = toUserMessage(err, 'No se pudo guardar el caso.', 'Revisa los campos e intenta de nuevo.');
      setError(errMsg);
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error al Guardar Caso',
        message: errMsg,
        show_toast: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-modal-title"
      style={{ padding: '1.5rem' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="glass-card animate-fade-in"
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: '580px',
          padding: '1.75rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-xl)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-glow)', color: 'var(--accent-primary-text)' }}>
              <Briefcase size={20} />
            </div>
            <h3 id="case-modal-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              {caseToEdit ? 'Editar Caso / Proyecto' : 'Nuevo Caso / Proyecto'}
            </h3>
          </div>
          <button
            type="button"
            className="btn-icon btn-sm btn-ghost"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{ color: 'var(--text-muted)' }}
          >
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
              background: 'var(--status-critical-bg)',
              border: '1px solid var(--status-critical-border)',
              color: 'var(--status-critical-text)',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label htmlFor="case-client" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Cliente Asignado <span style={{ color: 'var(--status-critical-text)' }}>*</span>
              </label>
              {clients.length > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', color: 'var(--accent-primary-text)' }}
                  onClick={() => setIsClientModalOpen(true)}
                >
                  + Crear otro cliente
                </button>
              )}
            </div>

            {clients.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-glow)',
                  border: '1px solid var(--accent-glow-strong)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Aún no tienes clientes registrados para vincular este caso.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                    onClick={() => setIsClientModalOpen(true)}
                  >
                    <UserPlus size={13} /> + Crear Cliente
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                    onClick={() => setIsBulkImportOpen(true)}
                  >
                    <FileSpreadsheet size={13} /> Importar Excel / CSV
                  </button>
                </div>
              </div>
            ) : (
              <>
                <SearchableClientSelect
                  clients={clients}
                  selectedClientId={clientId}
                  onChange={(id) => {
                    setClientId(id);
                    if (fieldErrors.client) setFieldErrors((prev) => ({ ...prev, client: '' }));
                  }}
                  placeholder="Buscar o reasignar cliente por nombre o empresa..."
                  required
                  inputId="case-client"
                  ariaInvalid={!!fieldErrors.client}
                  ariaDescribedBy={fieldErrors.client ? 'case-client-error' : undefined}
                />
                {fieldErrors.client && (
                  <span id="case-client-error" style={{ fontSize: '0.75rem', color: 'var(--status-critical-text)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {fieldErrors.client}
                  </span>
                )}
              </>
            )}
          </div>

          <div>
            <label htmlFor="case-title" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Título o Asunto del Caso <span style={{ color: 'var(--status-critical-text)' }}>*</span>
            </label>
            <input
              id="case-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="Ej. Revisión de Arquitectura Cloud / Negociación Contrato"
              required
              aria-invalid={!!fieldErrors.title}
              aria-describedby={fieldErrors.title ? 'case-title-error' : undefined}
              style={{
                width: '100%',
                border: fieldErrors.title ? '1.5px solid var(--status-critical)' : undefined,
                boxShadow: fieldErrors.title ? '0 0 0 2px var(--status-critical-border)' : undefined,
              }}
            />
            {fieldErrors.title && (
              <span id="case-title-error" style={{ fontSize: '0.75rem', color: 'var(--status-critical-text)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} /> {fieldErrors.title}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label htmlFor="case-priority" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Nivel de Prioridad
              </label>
              <select
                id="case-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                style={{ width: '100%' }}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica / Urgente</option>
              </select>
            </div>

            {caseToEdit && (
              <div>
                <label htmlFor="case-status" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Estado
                </label>
                <select
                  id="case-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="open">Abierto</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="waiting">En Espera</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="case-description" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Descripción o Antecedentes (Opcional)
            </label>
            <textarea
              id="case-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre el caso, requerimientos, alcance o notas iniciales..."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Próxima Acción (Next Action) Initial Definition */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--accent-glow-faint)',
              border: '1px solid var(--accent-glow-strong)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Próxima Acción (Next Action)
            </span>
            <input
              id="case-next-action"
              type="text"
              aria-label="Próxima acción: qué tiene que suceder ahora para que esto avance"
              value={nextActionDesc}
              onChange={(e) => setNextActionDesc(e.target.value)}
              placeholder="¿Qué tiene que suceder ahora para que esto avance? (opcional)"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
            />
            {nextActionDesc.trim() && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label htmlFor="case-next-action-due" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fecha límite:</label>
                  <input
                    id="case-next-action-due"
                    type="date"
                    value={nextActionDueDate}
                    onChange={(e) => setNextActionDueDate(e.target.value)}
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                  />
                </div>
                <div>
                  <label htmlFor="case-next-action-owner" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Responsable:</label>
                  <select
                    id="case-next-action-owner"
                    value={nextActionOwner}
                    onChange={(e) => setNextActionOwner(e.target.value as any)}
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                  >
                    <option value="me">Yo</option>
                    <option value="client">Cliente</option>
                    <option value="team">Equipo / TI</option>
                    <option value="third_party">Terceros</option>
                  </select>
                </div>
              </div>
            )}
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
              {isSaving ? 'Guardando...' : caseToEdit ? 'Actualizar Caso' : 'Crear Caso'}
            </button>
          </div>
        </form>
      </div>

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
      />

      <BulkImportClientsModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
