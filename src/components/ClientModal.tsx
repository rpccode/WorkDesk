import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import { Users, X, Check } from 'lucide-react';
import type { Client, ClientComplexity } from '../types';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, clientToEdit }) => {
  const { createClient, updateClient } = useStore();
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
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del cliente o contacto es obligatorio.');
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
      } else {
        await createClient(payload);
      }
      onClose();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Error al guardar el cliente.');
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
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Ficha de contacto y diagnóstico corporativo
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
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
            1. Datos de Contacto
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
            <div style={{ padding: '0.6rem 0.85rem', marginBottom: '1rem', borderRadius: 'var(--radius-sm)', background: 'var(--status-critical-bg)', color: 'var(--status-critical)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <form id="client-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeSection === 'general' ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Nombre del Cliente / Contacto *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. PREFIAUTO / Juan Pérez"
                    style={{ width: '100%' }}
                    required
                  />
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
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contacto@cliente.com"
                      style={{ width: '100%' }}
                    />
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
                      Sucursales
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={branchesCount}
                      onChange={(e) => setBranchesCount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Sin especificar"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Empleados
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={employeesCount}
                      onChange={(e) => setEmployeesCount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Sin especificar"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Sistemas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={systemsCount}
                      onChange={(e) => setSystemsCount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Sin especificar"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Depto TI Selector */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>
                      ¿Cuenta con Departamento de TI?
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Indica si el cliente posee equipo técnico interno
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn-ghost ${hasItDepartment === true ? 'active' : ''}`}
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: hasItDepartment === true ? 'var(--status-low-bg)' : 'transparent',
                        color: hasItDepartment === true ? 'var(--status-low)' : 'var(--text-secondary)',
                        border: hasItDepartment === true ? '1px solid var(--status-low)' : '1px solid var(--border-subtle)',
                      }}
                      onClick={() => setHasItDepartment(hasItDepartment === true ? null : true)}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      className={`btn-ghost ${hasItDepartment === false ? 'active' : ''}`}
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: hasItDepartment === false ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        color: hasItDepartment === false ? 'var(--status-critical)' : 'var(--text-secondary)',
                        border: hasItDepartment === false ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
                      }}
                      onClick={() => setHasItDepartment(hasItDepartment === false ? null : false)}
                    >
                      No
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface-elevated)' }}>
          <div>
            {activeSection === 'general' ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={() => setActiveSection('profile')}
              >
                Siguiente: Diagnóstico Corporativo →
              </button>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: '0.78rem' }}
                onClick={() => setActiveSection('general')}
              >
                ← Volver a Contacto
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              form="client-form"
              className="btn-primary"
              disabled={isSaving || !name.trim()}
            >
              <Check size={16} />
              {isSaving ? 'Guardando...' : clientToEdit ? 'Actualizar cliente' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
