import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import { Users, X, Check, AlertCircle } from 'lucide-react';
import type { Client, ClientComplexity } from '../types';
import { playNotificationSound } from '../utils/live-alerts';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, clientToEdit }) => {
  const { createClient, updateClient, addNotification } = useStore();
  const [name, setName] = useState(clientToEdit?.name || '');
  const [company, setCompany] = useState(clientToEdit?.company || '');
  const [email, setEmail] = useState(clientToEdit?.email || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [status, setStatus] = useState(clientToEdit?.status || 'active');

  // Corporate Profile & Complexity Matrix fields
  const [category, setCategory] = useState(clientToEdit?.category || '');
  const [complexityWeighted, setComplexityWeighted] = useState<ClientComplexity | ''>(
    clientToEdit?.complexity_weighted || ''
  );
  const [complexityEvaluated, setComplexityEvaluated] = useState<ClientComplexity | ''>(
    clientToEdit?.complexity_evaluated || ''
  );
  const [ticketAvg, setTicketAvg] = useState<number | ''>(
    clientToEdit?.ticket_avg !== undefined && clientToEdit?.ticket_avg !== null ? clientToEdit.ticket_avg : ''
  );
  const [branchesCount, setBranchesCount] = useState<number | ''>(
    clientToEdit?.branches_count !== undefined && clientToEdit?.branches_count !== null ? clientToEdit.branches_count : ''
  );
  const [employeesCount, setEmployeesCount] = useState<number | ''>(
    clientToEdit?.employees_count !== undefined && clientToEdit?.employees_count !== null ? clientToEdit.employees_count : ''
  );
  const [systemsCount, setSystemsCount] = useState<number | ''>(
    clientToEdit?.systems_count !== undefined && clientToEdit?.systems_count !== null ? clientToEdit.systems_count : ''
  );
  const [hasItDepartment, setHasItDepartment] = useState<boolean | null>(
    clientToEdit?.has_it_department !== undefined && clientToEdit?.has_it_department !== null
      ? clientToEdit.has_it_department
      : null
  );

  const [activeSection, setActiveSection] = useState<'general' | 'profile'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setName(clientToEdit.name);
        setCompany(clientToEdit.company || '');
        setEmail(clientToEdit.email || '');
        setPhone(clientToEdit.phone || '');
        setStatus(clientToEdit.status);
        setCategory(clientToEdit.category || '');
        setComplexityWeighted(clientToEdit.complexity_weighted || '');
        setComplexityEvaluated(clientToEdit.complexity_evaluated || '');
        setTicketAvg(clientToEdit.ticket_avg !== undefined && clientToEdit.ticket_avg !== null ? clientToEdit.ticket_avg : '');
        setBranchesCount(clientToEdit.branches_count !== undefined && clientToEdit.branches_count !== null ? clientToEdit.branches_count : '');
        setEmployeesCount(clientToEdit.employees_count !== undefined && clientToEdit.employees_count !== null ? clientToEdit.employees_count : '');
        setSystemsCount(clientToEdit.systems_count !== undefined && clientToEdit.systems_count !== null ? clientToEdit.systems_count : '');
        setHasItDepartment(clientToEdit.has_it_department !== undefined ? clientToEdit.has_it_department : null);
      } else {
        setName('');
        setCompany('');
        setEmail('');
        setPhone('');
        setStatus('active');
        setCategory('');
        setComplexityWeighted('');
        setComplexityEvaluated('');
        setTicketAvg('');
        setBranchesCount('');
        setEmployeesCount('');
        setSystemsCount('');
        setHasItDepartment(null);
      }
      setActiveSection('general');
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'El nombre del cliente o contacto es obligatorio.';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'El formato del correo es inválido (ej: contacto@empresa.com).';
      }
    }

    if (branchesCount !== '' && Number(branchesCount) < 0) {
      errors.branchesCount = 'El número de sucursales no puede ser negativo.';
    }

    if (employeesCount !== '' && Number(employeesCount) < 0) {
      errors.employeesCount = 'El número de empleados no puede ser negativo.';
    }

    if (systemsCount !== '' && Number(systemsCount) < 0) {
      errors.systemsCount = 'El número de sistemas no puede ser negativo.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setError('Por favor corrige los campos señalados en rojo.');
      playNotificationSound('critical');
      addNotification({
        type: 'warning',
        title: 'Formulario Incompleto',
        message: 'Revisa los campos obligatorios o formatos incorrectos.',
        show_toast: true,
      });
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        company: company.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        category: category.trim() || undefined,
        complexity_weighted: (complexityWeighted || undefined) as ClientComplexity | undefined,
        complexity_evaluated: (complexityEvaluated || undefined) as ClientComplexity | undefined,
        ticket_avg: ticketAvg === '' ? undefined : Number(ticketAvg),
        branches_count: branchesCount === '' ? undefined : Number(branchesCount),
        employees_count: employeesCount === '' ? undefined : Number(employeesCount),
        systems_count: systemsCount === '' ? undefined : Number(systemsCount),
        has_it_department: hasItDepartment !== null ? hasItDepartment : undefined,
      };

      if (clientToEdit) {
        await updateClient({
          id: clientToEdit.id,
          ...payload,
          status,
        });
        addNotification({
          type: 'success',
          title: 'Cliente Actualizado',
          message: `El cliente "${name.trim()}" se actualizó exitosamente.`,
          show_toast: true,
        });
      } else {
        await createClient(payload);
        addNotification({
          type: 'success',
          title: 'Cliente Registrado',
          message: `El cliente "${name.trim()}" ha sido registrado correctamente.`,
          show_toast: true,
        });
      }

      playNotificationSound('success');
      onClose();
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : err?.message || 'Error al guardar los datos del cliente en la base de datos.';
      setError(errMsg);
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error al Guardar Cliente',
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
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <Users size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              {clientToEdit ? 'Editar Ficha del Cliente' : 'Nuevo Cliente'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
          <button
            type="button"
            className={`btn-ghost ${activeSection === 'general' ? 'active' : ''}`}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: 0,
              fontSize: '0.8rem',
              fontWeight: activeSection === 'general' ? 700 : 500,
              color: activeSection === 'general' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeSection === 'general' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            }}
            onClick={() => setActiveSection('general')}
          >
            1. Datos Generales
          </button>
          <button
            type="button"
            className={`btn-ghost ${activeSection === 'profile' ? 'active' : ''}`}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: 0,
              fontSize: '0.8rem',
              fontWeight: activeSection === 'profile' ? 700 : 500,
              color: activeSection === 'profile' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeSection === 'profile' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            }}
            onClick={() => setActiveSection('profile')}
          >
            2. Matriz & Diagnóstico Corporativo
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
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

          <form id="client-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeSection === 'general' ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Nombre del Cliente / Contacto <span style={{ color: 'var(--status-critical)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="Ej. PREFIAUTO / Juan Pérez"
                    style={{
                      width: '100%',
                      border: fieldErrors.name ? '1.5px solid var(--status-critical)' : undefined,
                      boxShadow: fieldErrors.name ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                    }}
                  />
                  {fieldErrors.name && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={12} /> {fieldErrors.name}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Empresa / Razón Social
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Ej. Ochoa Hermanos S.A."
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      placeholder="contacto@cliente.com"
                      style={{
                        width: '100%',
                        border: fieldErrors.email ? '1.5px solid var(--status-critical)' : undefined,
                        boxShadow: fieldErrors.email ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                      }}
                    />
                    {fieldErrors.email && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertCircle size={12} /> {fieldErrors.email}
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 809 123 4567"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {clientToEdit && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Estado Operativo
                    </label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ width: '100%' }}>
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Categoría & Ticket Promedio */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Categoría / Rubro
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Ej. Financiera, Cooperativa, Administrativo, Educativo"
                      style={{ width: '100%' }}
                      list="categories-list"
                    />
                    <datalist id="categories-list">
                      <option value="Financiera" />
                      <option value="Financiera/Administrativo" />
                      <option value="Administrativo" />
                      <option value="Cooperativa" />
                      <option value="Educativo" />
                      <option value="Comercial" />
                      <option value="Industrial" />
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Ticket Promedio (Casos/Mes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={ticketAvg}
                      onChange={(e) => setTicketAvg(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Sin especificar"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Complejidad Ponderada & Complejidad Evaluada */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Complejidad Ponderada
                    </label>
                    <select
                      value={complexityWeighted}
                      onChange={(e) => setComplexityWeighted(e.target.value as ClientComplexity | '')}
                      style={{ width: '100%' }}
                    >
                      <option value="">(Sin definir)</option>
                      <option value="Alta">🔴 Alta</option>
                      <option value="Media">🟡 Media</option>
                      <option value="Baja">🟢 Baja</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Complejidad Evaluada
                    </label>
                    <select
                      value={complexityEvaluated}
                      onChange={(e) => setComplexityEvaluated(e.target.value as ClientComplexity | '')}
                      style={{ width: '100%' }}
                    >
                      <option value="">(Sin definir)</option>
                      <option value="Alta">🔴 Alta</option>
                      <option value="Media">🟡 Media</option>
                      <option value="Baja">🟢 Baja</option>
                    </select>
                  </div>
                </div>

                {/* Sucursales, Empleados, Sistemas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Cant. Sucursales
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={branchesCount}
                      onChange={(e) => setBranchesCount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Cant. Empleados
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={employeesCount}
                      onChange={(e) => setEmployeesCount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Cant. Sistemas
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={systemsCount}
                      onChange={(e) => setSystemsCount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* ¿Tiene Departamento de TI? */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    ¿Tiene Departamento de TI Propio?
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="hasItDepartment"
                        checked={hasItDepartment === true}
                        onChange={() => setHasItDepartment(true)}
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      <span>Sí, cuenta con TI</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="hasItDepartment"
                        checked={hasItDepartment === false}
                        onChange={() => setHasItDepartment(false)}
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      <span>No tiene TI</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="hasItDepartment"
                        checked={hasItDepartment === null}
                        onChange={() => setHasItDepartment(null)}
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      <span>Sin especificar</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="client-form"
            className="btn-primary"
            disabled={isSaving}
          >
            <Check size={16} />
            {isSaving ? 'Guardando...' : clientToEdit ? 'Actualizar Cliente' : 'Guardar Cliente'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
