import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store';
import { Briefcase, Plus, Search, Mail, FileText } from 'lucide-react';
import { CaseDetailsDrawer } from '../components/CaseDetailsDrawer';
import { CaseModal } from '../components/CaseModal';
import { CaseBriefModal } from '../components/CaseBriefModal';
import { Pagination } from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { formatDate } from '../utils/date';
import type { Case } from '../types';

export const CasesView: React.FC = () => {
  const { cases, caseFilter, setCaseFilter, fetchCases, setCaseForEmail } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [caseToEdit, setCaseToEdit] = useState<Case | null>(null);
  const [caseForBrief, setCaseForBrief] = useState<Case | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const filteredCases = useMemo(() => cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.client_name && c.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
    const matchesStatus =
      caseFilter === 'all' ||
      (caseFilter === 'active' ? c.status !== 'closed' : c.status === caseFilter);

    return matchesSearch && matchesPriority && matchesStatus;
  }), [cases, searchTerm, priorityFilter, caseFilter]);

  const pagination = usePagination(filteredCases, { defaultPageSize: 25 });

  // Reset page when filters change
  useEffect(() => { pagination.resetPage(); }, [searchTerm, priorityFilter, caseFilter]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="badge badge-critical">🚨 Crítica</span>;
      case 'high':
        return <span className="badge badge-high">Alta</span>;
      case 'medium':
        return <span className="badge badge-medium">Media</span>;
      default:
        return <span className="badge badge-low">Baja</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'closed':
        return <span className="badge badge-neutral">Cerrado</span>;
      case 'in_progress':
        return <span className="badge badge-low">En Progreso</span>;
      case 'waiting':
        return <span className="badge badge-medium">En Espera</span>;
      default:
        return <span className="badge badge-high">Abierto</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Gestión de Casos &amp; Proyectos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Expedientes de consultoría, hitos y control de entregables
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsNewCaseModalOpen(true)}>
          <Plus size={16} /> Nuevo Caso
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Buscar por caso, cliente o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ESTADO:</span>
          <select value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="active">Activos únicamente</option>
            <option value="closed">Cerrados</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRIORIDAD:</span>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">Todas</option>
            <option value="critical">🚨 Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filteredCases.length} caso{filteredCases.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid of Cases */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {pagination.paginatedItems.length === 0 ? (
          <div
            className="glass-card"
            style={{
              gridColumn: '1 / -1',
              padding: '3.5rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Briefcase size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No se encontraron casos con los filtros aplicados</p>
            <button
              className="btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => setIsNewCaseModalOpen(true)}
            >
              <Plus size={16} /> Crear nuevo caso
            </button>
          </div>
        ) : (
          pagination.paginatedItems.map((c) => (
            <div
              key={c.id}
              className="glass-card"
              style={{
                padding: '1.35rem',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={() => setSelectedCase(c)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  {c.client_name || 'Cliente'}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {getPriorityBadge(c.priority)}
                  {getStatusBadge(c.status)}
                </div>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                {c.title}
              </h3>

              <p
                style={{
                  fontSize: '0.83rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '0.5rem',
                }}
              >
                {c.description || 'Sin descripción detallada.'}
              </p>

              {/* Próxima Acción Indicator */}
              {c.next_action?.description ? (
                <div
                  style={{
                    margin: '0.25rem 0 0.75rem',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.25)',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 900 }}>➔</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.next_action.description}
                    </span>
                  </div>
                  {c.next_action.due_date && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {c.next_action.due_date}
                    </span>
                  )}
                </div>
              ) : c.status !== 'closed' ? (
                <div
                  style={{
                    margin: '0.25rem 0 0.75rem',
                    padding: '0.35rem 0.55rem',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(245,158,11,0.08)',
                    border: '1px dashed rgba(245,158,11,0.4)',
                    fontSize: '0.72rem',
                    color: 'var(--status-medium)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>⚠️ Sin próxima acción definida</span>
                </div>
              ) : null}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>Creado: {formatDate(c.created_at)}</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-primary)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCaseForBrief(c);
                    }}
                    title="Generar minuta ejecutiva o resumen en Word"
                  >
                    <FileText size={13} /> Minuta
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCaseForEmail(c);
                    }}
                    title="Redactar correo con este caso"
                  >
                    <Mail size={13} /> Correo
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCaseToEdit(c);
                    }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredCases.length > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          pageSizeOptions={[12, 24, 48, 96]}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="casos"
        />
      )}

      <CaseDetailsDrawer c={selectedCase} onClose={() => setSelectedCase(null)} />
      <CaseModal isOpen={isNewCaseModalOpen} onClose={() => setIsNewCaseModalOpen(false)} />
      <CaseModal
        isOpen={!!caseToEdit}
        onClose={() => setCaseToEdit(null)}
        caseToEdit={caseToEdit}
      />
      <CaseBriefModal
        isOpen={!!caseForBrief}
        onClose={() => setCaseForBrief(null)}
        caseItem={caseForBrief}
      />
    </div>
  );
};
