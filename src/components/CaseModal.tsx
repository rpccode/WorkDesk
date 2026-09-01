import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import { Briefcase, X, Check, UserPlus, FileSpreadsheet } from 'lucide-react';
import type { Case, CasePriority } from '../types';
import { ClientModal } from './ClientModal';
import { BulkImportClientsModal } from './BulkImportClientsModal';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseToEdit?: Case | null;
}

export const CaseModal: React.FC<CaseModalProps> = ({ isOpen, onClose, caseToEdit }) => {
  const { clients, createCase, updateCase } = useStore();
  const [clientId, setClientId] = useState(caseToEdit?.client_id || (clients[0]?.id || ''));
  const [title, setTitle] = useState(caseToEdit?.title || '');
  const [description, setDescription] = useState(caseToEdit?.description || '');
  const [priority, setPriority] = useState<CasePriority>(caseToEdit?.priority || 'medium');
  const [status, setStatus] = useState(caseToEdit?.status || 'open');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, [isOpen, caseToEdit, clients]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título del caso es obligatorio.');
      return;
    }
    if (!clientId && !caseToEdit) {
      setError('Debes seleccionar o crear un cliente primero.');
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
      } else {
        await createCase({
          client_id: clientId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
        });
      }
      onClose();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Error al guardar el caso.');
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              {caseToEdit ? 'Editar Caso / Proyecto' : 'Nuevo Caso / Proyecto'}
            </h3>
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
          {!caseToEdit && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Cliente *
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
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  style={{ width: '100%' }}
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Título o Asunto del Caso *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Revisión de Arquitectura Cloud / Negociación Contrato"
              style={{ width: '100%' }}
              required
            />
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
              Descripción / Contexto
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos, alcance, antecedentes clave..."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !title.trim() || (!caseToEdit && clients.length === 0)}
            >
              <Check size={16} />
              {isSaving ? 'Guardando...' : caseToEdit ? 'Actualizar caso' : 'Crear caso'}
            </button>
          </div>
        </form>
      </div>

      {/* Sub-modals if client is missing */}
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
