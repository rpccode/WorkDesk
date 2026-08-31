import React, { useState } from 'react';
import { useStore } from '../store';
import { Briefcase, X, Check } from 'lucide-react';
import type { Case, CasePriority } from '../types';

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
          maxWidth: '580px',
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
              <Briefcase size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Cliente *
              </label>
              {clients.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--status-critical)' }}>
                  No tienes clientes registrados. Crea un cliente primero.
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
            <button type="submit" className="btn-primary" disabled={isSaving || !title.trim()}>
              <Check size={16} />
              {isSaving ? 'Guardando...' : caseToEdit ? 'Actualizar caso' : 'Crear caso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
