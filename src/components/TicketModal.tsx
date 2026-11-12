import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import {
  Tag,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { SearchableClientSelect } from './SearchableClientSelect';
import { SearchableCaseSelect } from './SearchableCaseSelect';
import { playNotificationSound } from '../utils/live-alerts';
import type {
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketCategory,
  TicketChannel,
} from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketToEdit?: Ticket | null;
  defaultClientId?: string;
  defaultCaseId?: string;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  ticketToEdit,
  defaultClientId,
  defaultCaseId,
}) => {
  const { clients, cases, consultantProfile, createTicket, updateTicket, addNotification } = useStore();

  const [ticketNumber, setTicketNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Soporte TI');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [status, setStatus] = useState<TicketStatus>('open');
  const [channel, setChannel] = useState<TicketChannel>('Email');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [resolution, setResolution] = useState('');
  const [slaDueDate, setSlaDueDate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (ticketToEdit) {
      setTicketNumber(ticketToEdit.ticket_number || '');
      setClientId(ticketToEdit.client_id);
      setCaseId(ticketToEdit.case_id || '');
      setTitle(ticketToEdit.title);
      setDescription(ticketToEdit.description || '');
      setCategory(ticketToEdit.category || 'Soporte TI');
      setPriority(ticketToEdit.priority || 'medium');
      setStatus(ticketToEdit.status || 'open');
      setChannel(ticketToEdit.channel || 'Email');
      setRequesterName(ticketToEdit.requester_name || '');
      setRequesterEmail(ticketToEdit.requester_email || '');
      setAssignedTo(ticketToEdit.assigned_to || consultantProfile.name || '');
      setResolution(ticketToEdit.resolution || '');
      setSlaDueDate(ticketToEdit.sla_due_date || '');
    } else {
      setTicketNumber('');
      setClientId(defaultClientId || (clients[0]?.id || ''));
      setCaseId(defaultCaseId || '');
      setTitle('');
      setDescription('');
      setCategory('Soporte TI');
      setPriority('medium');
      setStatus('open');
      setChannel('Email');
      setRequesterName('');
      setRequesterEmail('');
      setAssignedTo(consultantProfile.name || '');
      setResolution('');
      // Default SLA due date to +48 hours
      const inTwoDays = new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0];
      setSlaDueDate(inTwoDays);
    }
    setError(null);
    setFieldErrors({});
  }, [ticketToEdit, defaultClientId, defaultCaseId, isOpen, clients, consultantProfile]);

  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  // Filter cases for the selected client if any
  const availableCases = clientId
    ? cases.filter((c) => c.client_id === clientId)
    : cases;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!clientId) {
      errors.client = 'Debes seleccionar un cliente para el ticket.';
    }

    if (!title.trim()) {
      errors.title = 'El título o asunto del ticket es obligatorio.';
    }

    if (!requesterName.trim()) {
      errors.requester_name = 'El nombre de la persona que solicita es obligatorio.';
    }

    if (requesterEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail.trim())) {
      errors.requester_email = 'El formato del correo es inválido.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setError('Por favor completa los campos obligatorios destacados en rojo.');
      playNotificationSound('critical');
      addNotification({
        type: 'warning',
        title: 'Formulario Incompleto',
        message: 'Revisa los campos requeridos para guardar el ticket.',
        show_toast: true,
      });
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (ticketToEdit) {
        await updateTicket({
          id: ticketToEdit.id,
          client_id: clientId,
          case_id: caseId || null,
          title: title.trim(),
          description: description.trim() || null,
          category,
          priority,
          status,
          channel,
          requester_name: requesterName.trim(),
          requester_email: requesterEmail.trim() || null,
          assigned_to: assignedTo.trim() || null,
          resolution: resolution.trim() || null,
          sla_due_date: slaDueDate || null,
        });

        playNotificationSound('success');
        addNotification({
          type: 'success',
          title: 'Ticket Actualizado',
          message: `El ticket "${ticketNumber || title.trim()}" ha sido modificado.`,
          show_toast: true,
        });
      } else {
        const created = await createTicket({
          ticket_number: ticketNumber.trim() || undefined,
          client_id: clientId,
          case_id: caseId || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          priority,
          status,
          channel,
          requester_name: requesterName.trim(),
          requester_email: requesterEmail.trim() || undefined,
          assigned_to: assignedTo.trim() || undefined,
          resolution: resolution.trim() || undefined,
          sla_due_date: slaDueDate || undefined,
        });

        playNotificationSound('success');
        addNotification({
          type: 'success',
          title: 'Ticket Creado',
          message: `Ticket ${created.ticket_number} registrado correctamente.`,
          show_toast: true,
        });
      }

      onClose();
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Error al guardar el ticket.';
      setError(msg);
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error al Guardar',
        message: msg,
        show_toast: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div
    ref={dialogRef}
    tabIndex={-1}
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xl)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                padding: '0.45rem',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-glow)',
                color: 'var(--accent-primary-text)',
              }}
            >
              <Tag size={20} />
            </div>
            <div>
              <h3 id="ticket-modal-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                {ticketToEdit ? `Editar Ticket: ${ticketToEdit.ticket_number}` : 'Nuevo Ticket de Servicio & Soporte'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Registra incidentes, requerimientos o solicitudes con trazabilidad SLA y cliente asignado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Cerrar modal"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--status-critical-text)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form id="ticket-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Top Grid: Client & Case Link */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
              <div>
                <SearchableClientSelect
                  label="Cliente Asignado"
                  inputId="ticket-modal-client"
                  ariaInvalid={!!fieldErrors.client}
                  ariaDescribedBy={fieldErrors.client ? 'ticket-error-client' : undefined}
                  clients={clients}
                  selectedClientId={clientId}
                  onChange={(id) => {
                    setClientId(id);
                    if (fieldErrors.client) setFieldErrors((prev) => ({ ...prev, client: '' }));
                  }}
                  placeholder="Seleccionar cliente..."
                  required
                />
                {fieldErrors.client && (
                  <span id="ticket-error-client" style={{ fontSize: '0.75rem', color: 'var(--status-critical-text)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {fieldErrors.client}
                  </span>
                )}
              </div>

              <div>
                <SearchableCaseSelect
                  label="Vincular a Caso / Proyecto (Opcional)"
                  inputId="ticket-modal-case"
                  cases={availableCases}
                  selectedCaseId={caseId}
                  onChange={(id) => setCaseId(id)}
                  placeholder="Vincular a caso existente..."
                  allowClear
                />
              </div>
            </div>

            {/* Title & Ticket Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f1">
                  Título / Asunto del Ticket <span style={{ color: 'var(--status-critical-text)' }}>*</span>
                </label>
                <input id="ticket-modal-f1"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={!!fieldErrors.title}
                  aria-describedby={fieldErrors.title ? 'ticket-error-title' : undefined}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder="Ej. Falla en servidor de correo o consulta de base de datos"
                  style={{
                    width: '100%',
                    border: fieldErrors.title ? '1.5px solid var(--status-critical)' : undefined,
                    boxShadow: fieldErrors.title ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                  }}
                />
                {fieldErrors.title && (
                  <span id="ticket-error-title" style={{ fontSize: '0.75rem', color: 'var(--status-critical-text)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {fieldErrors.title}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f2">
                  Código / Folio
                </label>
                <input id="ticket-modal-f2"
                  type="text"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="Auto (ej. TCK-001)"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            {/* Status, Priority, Category, Channel Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f3">
                  Estado
                </label>
                <select id="ticket-modal-f3"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TicketStatus)}
                  style={{ width: '100%' }}
                >
                  <option value="open">Abierto</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="waiting_client">Espera Cliente</option>
                  <option value="resolved">Resuelto</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f4">
                  Prioridad
                </label>
                <select id="ticket-modal-f4"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  style={{ width: '100%' }}
                >
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f5">
                  Categoría
                </label>
                <select id="ticket-modal-f5"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  style={{ width: '100%' }}
                >
                  <option value="Soporte TI">Soporte TI</option>
                  <option value="Incidencia">Incidencia</option>
                  <option value="Requerimiento">Requerimiento</option>
                  <option value="Consultoría">Consultoría</option>
                  <option value="Facturación">Facturación</option>
                  <option value="Infraestructura">Infraestructura</option>
                  <option value="Configuración">Configuración</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f6">
                  Canal Origen
                </label>
                <select id="ticket-modal-f6"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as TicketChannel)}
                  style={{ width: '100%' }}
                >
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Teléfono">Teléfono</option>
                  <option value="Portal">Portal</option>
                  <option value="Reunión">Reunión</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            {/* Requester Info & SLA Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f7">
                  Solicitante / Contacto <span style={{ color: 'var(--status-critical-text)' }}>*</span>
                </label>
                <input id="ticket-modal-f7"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={!!fieldErrors.requester_name}
                  aria-describedby={fieldErrors.requester_name ? 'ticket-error-requester-name' : undefined}
                  value={requesterName}
                  onChange={(e) => {
                    setRequesterName(e.target.value);
                    if (fieldErrors.requester_name) setFieldErrors((prev) => ({ ...prev, requester_name: '' }));
                  }}
                  placeholder="Nombre de la persona"
                  style={{
                    width: '100%',
                    border: fieldErrors.requester_name ? '1.5px solid var(--status-critical)' : undefined,
                  }}
                />
                {fieldErrors.requester_name && (
                  <span id="ticket-error-requester-name" style={{ fontSize: '0.75rem', color: 'var(--status-critical-text)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {fieldErrors.requester_name}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f8">
                  Email Solicitante
                </label>
                <input id="ticket-modal-f8"
                  type="email"
                  aria-invalid={!!fieldErrors.requester_email}
                  aria-describedby={fieldErrors.requester_email ? 'ticket-error-requester-email' : undefined}
                  value={requesterEmail}
                  onChange={(e) => {
                    setRequesterEmail(e.target.value);
                    if (fieldErrors.requester_email) setFieldErrors((prev) => ({ ...prev, requester_email: '' }));
                  }}
                  placeholder="contacto@empresa.com"
                  style={{
                    width: '100%',
                    border: fieldErrors.requester_email ? '1.5px solid var(--status-critical)' : undefined,
                  }}
                />
                {fieldErrors.requester_email && (
                  <span id="ticket-error-requester-email" style={{ fontSize: '0.75rem', color: 'var(--status-critical-text)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {fieldErrors.requester_email}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f9">
                  Fecha Límite SLA
                </label>
                <input id="ticket-modal-f9"
                  type="date"
                  value={slaDueDate}
                  onChange={(e) => setSlaDueDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f10">
                Detalle del Requerimiento / Problema
              </label>
              <textarea id="ticket-modal-f10"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explicación detallada del incidente, mensaje de error, pasos para reproducir o alcance solicitado..."
                style={{ width: '100%', fontSize: '0.84rem' }}
              />
            </div>

            {/* Resolution (Especially for resolved/closed status) */}
            {(status === 'resolved' || status === 'closed' || resolution) && (
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-low-text)', marginBottom: '0.35rem', textTransform: 'uppercase' }} htmlFor="ticket-modal-f11">
                  Notas de Solución / Cierre
                </label>
                <textarea id="ticket-modal-f11"
                  rows={2}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Detalla cómo se solucionó la incidencia o el acuerdo alcanzado con el cliente..."
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="ticket-form"
            className={`btn-primary ${isSaving ? 'btn-loading' : ''}`}
            disabled={isSaving}
          >
            {!isSaving && <Check size={16} />}
            {isSaving ? 'Guardando...' : ticketToEdit ? 'Actualizar Ticket' : 'Crear Ticket'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
