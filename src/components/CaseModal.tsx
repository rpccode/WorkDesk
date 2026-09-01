import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import { Briefcase, X, Check, UserPlus, FileSpreadsheet, AlertCircle } from 'lucide-react';
import type { Case, CasePriority } from '../types';
import { ClientModal } from './ClientModal';
import { BulkImportClientsModal } from './BulkImportClientsModal';
import { SearchableClientSelect } from './SearchableClientSelect';
import { playNotificationSound } from '../utils/live-alerts';

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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (caseToEdit) {
        setClientId(caseToEdit.client_id);
        setTitle(caseToEdit.title);
        setDescription(caseToEdit.description || '');
        setPriority(caseToEdit.priority);
        setStatus(caseToEdit.status);
      } else {
        setClientId(clients[0]?.id || '');
        setTitle('');
        setDescription('');
        setPriority('medium');
        setStatus('open');
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

    try {
      if (caseToEdit) {
        await updateCase({
          id: caseToEdit.id,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
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
      const errMsg = typeof err === 'string' ? err : err?.message || 'Error al guardar el caso.';
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
          maxWidth: '580px',
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
              <Briefcase size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              {caseToEdit ? 'Editar Caso / Proyecto' : 'Nuevo Caso / Proyecto'}
            </h3>
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
          {!caseToEdit && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Cliente <span style={{ color: 'var(--status-critical)' }}>*</span>
                </label>
                {clients.length > 0 && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '0.1rem 0.4rem', color: 'var(--accent-primary)' }}
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
                    border: '1px solid rgba(37,99,235,0.2)',
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
                    placeholder="Buscar cliente por nombre o empresa..."
                    required
                  />
                  {fieldErrors.client && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={12} /> {fieldErrors.client}
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Título o Asunto del Caso <span style={{ color: 'var(--status-critical)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="Ej. Revisión de Arquitectura Cloud / Negociación Contrato"
              style={{
                width: '100%',
                border: fieldErrors.title ? '1.5px solid var(--status-critical)' : undefined,
                boxShadow: fieldErrors.title ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
              }}
            />
            {fieldErrors.title && (
              <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} /> {fieldErrors.title}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Nivel de Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                style={{ width: '100%' }}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">🚨 Crítica / Urgente</option>
              </select>
            </div>

            {caseToEdit && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Estado
                </label>
                <select
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
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Descripción o Antecedentes (Opcional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre el caso, requerimientos, alcance o notas iniciales..."
              style={{ width: '100%', resize: 'vertical' }}
            />
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
