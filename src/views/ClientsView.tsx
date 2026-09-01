import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Building,
  Briefcase,
  FileSpreadsheet,
  LayoutGrid,
  Table as TableIcon,
  ShieldAlert,
  Building2,
  Cpu,
  Trash2,
} from 'lucide-react';
import { ClientModal } from '../components/ClientModal';
import { CaseModal } from '../components/CaseModal';
import { BulkImportClientsModal } from '../components/BulkImportClientsModal';
import { Pagination } from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { playNotificationSound } from '../utils/live-alerts';
import { calculateClientHealth } from '../utils/client-health';
import type { Client, ClientComplexity, ClientHealthReport } from '../types';

export const ClientsView: React.FC = () => {
  const { clients, cases, commitments, tickets, fetchClients, fetchCases, deleteAllClients, addNotification } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('matrix');

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchCases();
  }, []);

  // Compute health for each client
  const clientHealthMap = useMemo(() => {
    const map = new Map<string, ClientHealthReport>();
    clients.forEach((c) => {
      map.set(c.id, calculateClientHealth(c, cases, commitments, tickets));
    });
    return map;
  }, [clients, cases, commitments, tickets]);

  const getHealthBadge = (report?: ClientHealthReport) => {
    if (!report) return null;
    if (report.level === 'critical') {
      return (
        <span
          title={report.recommendations[0]}
          style={{
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 800,
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--status-critical)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          🚨 Riesgo {report.score}/100
        </span>
      );
    }
    if (report.level === 'warning') {
      return (
        <span
          title={report.recommendations[0]}
          style={{
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 800,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--status-medium)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          ⚠️ Observación {report.score}/100
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '0.2rem 0.55rem',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontWeight: 800,
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: 'var(--status-low)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          whiteSpace: 'nowrap',
        }}
      >
        ✓ Saludable
      </span>
    );
  };

  // Filter logic
  const filteredClients = useMemo(() => clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.category && c.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || (c.category && c.category.toLowerCase() === selectedCategory.toLowerCase());

    const matchesComplexity =
      selectedComplexity === 'all' ||
      c.complexity_evaluated === selectedComplexity ||
      c.complexity_weighted === selectedComplexity;

    const report = clientHealthMap.get(c.id);
    const matchesRisk =
      selectedRisk === 'all' ||
      (selectedRisk === 'critical' && report?.level === 'critical') ||
      (selectedRisk === 'warning' && report?.level === 'warning') ||
      (selectedRisk === 'healthy' && report?.level === 'healthy');

    return matchesSearch && matchesCategory && matchesComplexity && matchesRisk;
  }), [clients, searchTerm, selectedCategory, selectedComplexity, selectedRisk, clientHealthMap]);

  const pagination = usePagination(filteredClients, { defaultPageSize: 25 });

  React.useEffect(() => { pagination.resetPage(); }, [searchTerm, selectedCategory, selectedComplexity, viewMode]);

  // Extract unique categories for filter
  const uniqueCategories = Array.from(
    new Set(clients.map((c) => c.category).filter(Boolean) as string[])
  );

  // Executive Metrics (KPIs)
  const totalClients = clients.length;
  const complexClients = clients.filter(
    (c) => c.complexity_evaluated === 'Alta' || c.complexity_weighted === 'Alta'
  ).length;
  const complexPercent = totalClients > 0 ? ((complexClients / totalClients) * 100).toFixed(1) : '0';
  const totalBranches = clients.reduce((acc, c) => acc + (c.branches_count || 0), 0);
  const totalEmployees = clients.reduce((acc, c) => acc + (c.employees_count || 0), 0);

  const getComplexityBadge = (val?: ClientComplexity | null) => {
    if (!val) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    if (val === 'Alta') {
      return (
        <span
          style={{
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 800,
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--status-critical)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          Alta
        </span>
      );
    }
    if (val === 'Media') {
      return (
        <span
          style={{
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 800,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--status-medium)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          Media
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '0.2rem 0.55rem',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontWeight: 800,
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: 'var(--status-low)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        }}
      >
        Baja
      </span>
    );
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar permanentemente los ${clients.length} clientes de la cartera?\n\nEsta acción vaciará la lista y te permitirá realizar una carga masiva limpia desde Excel o CSV.`
      )
    ) {
      return;
    }

    try {
      await deleteAllClients();
      playNotificationSound('info');
      addNotification({
        title: 'Cartera de Clientes Vaciada',
        message: 'Se han eliminado todos los clientes de la base de datos.',
        type: 'info',
      });
    } catch (err: any) {
      alert('Error al vaciar clientes: ' + err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Cartera de Clientes & Matriz de Complejidad
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Diagnóstico corporativo, dotación, sucursales y clasificación de cuentas consultivas
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {clients.length > 0 && (
            <button
              className="btn-ghost"
              style={{ fontSize: '0.82rem', color: 'var(--status-critical)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              onClick={handleDeleteAll}
              title="Borrar todos los clientes para cargarlos de nuevo"
            >
              <Trash2 size={15} /> Vaciar Cartera ({clients.length})
            </button>
          )}
          <button
            className="btn-secondary"
            style={{ fontSize: '0.82rem', fontWeight: 600 }}
            onClick={() => setIsBulkImportOpen(true)}
          >
            <FileSpreadsheet size={16} /> Carga Masiva (Excel / CSV)
          </button>
          <button className="btn-primary" onClick={() => setIsClientModalOpen(true)}>
            <Plus size={16} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Clientes
            </span>
            <p style={{ fontSize: '1.45rem', fontWeight: 800 }}>{totalClients}</p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--status-critical)' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Clientes Complejos
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <p style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--status-critical)' }}>{complexClients}</p>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                ({complexPercent}%)
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}>
            <Building2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Sucursales Atendidas
            </span>
            <p style={{ fontSize: '1.45rem', fontWeight: 800 }}>{totalBranches}</p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}>
            <Cpu size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Empleados Impactados
            </span>
            <p style={{ fontSize: '1.45rem', fontWeight: 800 }}>{totalEmployees.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Category + Complexity + View Mode */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Buscar cliente, empresa o rubro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.4rem', fontSize: '0.85rem' }}
            />
          </div>

          {uniqueCategories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            >
              <option value="all">Todas las Categorías ({clients.length})</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedComplexity}
            onChange={(e) => setSelectedComplexity(e.target.value)}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
          >
            <option value="all">Toda Complejidad</option>
            <option value="Alta">🔴 Alta</option>
            <option value="Media">🟡 Media</option>
            <option value="Baja">🟢 Baja</option>
          </select>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
          >
            <option value="all">Todo Estado Salud</option>
            <option value="critical">🚨 Riesgo Crítico</option>
            <option value="warning">⚠️ En Observación</option>
            <option value="healthy">🟢 Saludable</option>
          </select>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-main)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className={`btn-ghost ${viewMode === 'matrix' ? 'active' : ''}`}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'matrix' ? 700 : 500,
              backgroundColor: viewMode === 'matrix' ? 'var(--bg-surface)' : 'transparent',
              color: viewMode === 'matrix' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-xs)',
            }}
            onClick={() => setViewMode('matrix')}
          >
            <TableIcon size={14} /> Matriz Ejecutiva
          </button>
          <button
            type="button"
            className={`btn-ghost ${viewMode === 'cards' ? 'active' : ''}`}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'cards' ? 700 : 500,
              backgroundColor: viewMode === 'cards' ? 'var(--bg-surface)' : 'transparent',
              color: viewMode === 'cards' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-xs)',
            }}
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid size={14} /> Tarjetas
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredClients.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '4rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <Users size={48} style={{ opacity: 0.35 }} />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              No se encontraron clientes
            </h3>
            <p style={{ fontSize: '0.84rem', marginTop: '0.25rem' }}>
              {clients.length === 0
                ? 'Comienza creando tu primer cliente o importa la matriz corporativa en Excel.'
                : 'Ningún cliente coincide con los filtros aplicados.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={() => setIsBulkImportOpen(true)}>
              <FileSpreadsheet size={15} /> Cargar Matriz Excel
            </button>
            <button className="btn-primary" onClick={() => setIsClientModalOpen(true)}>
              <Plus size={15} /> Crear Cliente
            </button>
          </div>
        </div>
      ) : viewMode === 'matrix' ? (
        /* ─── VISTA MATRIZ DE COMPLEJIDAD (TABLA EJECUTIVA) ─── */
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#f8fafc', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Cliente / Cuenta
                  </th>
                  <th style={{ padding: '0.85rem 0.85rem', textAlign: 'center', fontWeight: 800 }}>
                    Salud & Riesgo
                  </th>
                  <th style={{ padding: '0.85rem 0.85rem', textAlign: 'center', fontWeight: 800 }}>
                    Complejidad Ponderada
                  </th>
                  <th style={{ padding: '0.85rem 0.85rem', textAlign: 'center', fontWeight: 800 }}>
                    Complejidad Evaluada
                  </th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>
                    Ticket Promedio
                  </th>
                  <th style={{ padding: '0.85rem 0.85rem', textAlign: 'left', fontWeight: 800 }}>
                    Categoría
                  </th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>
                    Sucursales
                  </th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>
                    Empleados
                  </th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>
                    Sistemas
                  </th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>
                    Depto. TI
                  </th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800 }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((c, idx) => {
                  const health = clientHealthMap.get(c.id);
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{c.name}</span>
                          {c.company && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                              {c.company}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center' }}>
                        {getHealthBadge(health)}
                      </td>

                      <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center' }}>
                        {getComplexityBadge(c.complexity_weighted)}
                      </td>

                      <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center' }}>
                        {getComplexityBadge(c.complexity_evaluated)}
                      </td>

                      <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                        {c.ticket_avg !== undefined && c.ticket_avg !== null ? c.ticket_avg : '—'}
                      </td>

                      <td style={{ padding: '0.8rem 0.85rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {c.category || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                        {c.branches_count !== undefined && c.branches_count !== null ? c.branches_count : '—'}
                      </td>

                      <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>
                        {c.employees_count !== undefined && c.employees_count !== null ? c.employees_count.toLocaleString() : '—'}
                      </td>

                      <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                        {c.systems_count !== undefined && c.systems_count !== null ? c.systems_count : '—'}
                      </td>

                      <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                        {c.has_it_department === true ? (
                          <span style={{ color: 'var(--status-low)', fontWeight: 800, fontSize: '0.75rem' }}>Sí</span>
                        ) : c.has_it_department === false ? (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>No</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                            onClick={() => setClientToEdit(c)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-primary"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                            onClick={() => setIsCaseModalOpen(true)}
                          >
                            + Caso
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer Totals Row */}
              <tfoot>
                <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', fontWeight: 800, borderTop: '2px solid rgba(255,255,255,0.15)' }}>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    Total: {filteredClients.length} Clientes
                  </td>
                  <td colSpan={2} style={{ padding: '0.85rem 0.85rem', textAlign: 'center', color: '#f87171' }}>
                    {complexClients} Clientes complejos
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: 'var(--accent-primary)' }}>
                    {complexPercent}%
                  </td>
                  <td style={{ padding: '0.85rem 0.85rem' }} />
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                    {totalBranches > 0 ? totalBranches : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                    {totalEmployees > 0 ? totalEmployees.toLocaleString() : '—'}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination - Matrix View */}
          {filteredClients.length > 0 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="clientes"
            />
          )}
        </div>
      ) : (
        /* ─── VISTA TARJETAS (DIRECTORIO) ─── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {pagination.paginatedItems.map((c) => {
            const clientCases = cases.filter((item) => item.client_id === c.id);
            const activeCases = clientCases.filter((item) => item.status !== 'closed');

            return (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {c.name}
                    </h3>
                    {c.company && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.2rem' }}>
                        <Building size={13} /> {c.company}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                    {getComplexityBadge(c.complexity_evaluated || c.complexity_weighted)}
                    <span className={`badge ${c.status === 'active' ? 'badge-low' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                      {c.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                {/* Categoría & Diagnóstico */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.72rem' }}>
                  {c.category && (
                    <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontWeight: 600 }}>
                      🏷️ {c.category}
                    </span>
                  )}
                  {c.branches_count && c.branches_count > 1 && (
                    <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                      🏢 {c.branches_count} sucursales
                    </span>
                  )}
                  {c.employees_count && c.employees_count > 0 && (
                    <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                      👥 {c.employees_count} colaboradores
                    </span>
                  )}
                  {c.has_it_department && (
                    <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: 'rgba(5, 150, 105, 0.1)', color: 'var(--status-low)', border: '1px solid rgba(5, 150, 105, 0.2)', fontWeight: 700 }}>
                      ✓ Depto. TI
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Mail size={13} color="var(--text-muted)" /> {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={13} color="var(--text-muted)" /> {c.phone}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <Briefcase size={14} color="var(--text-muted)" />
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>{activeCases.length}</strong> caso(s) activo(s)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => setClientToEdit(c)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-primary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => setIsCaseModalOpen(true)}
                    >
                      + Caso
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>

          {/* Pagination - Cards View */}
          {filteredClients.length > 0 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              pageSizeOptions={[12, 24, 48, 96]}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="clientes"
            />
          )}
        </div>
      )}

      <ClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} />
      <ClientModal
        isOpen={!!clientToEdit}
        onClose={() => setClientToEdit(null)}
        clientToEdit={clientToEdit}
      />
      <CaseModal isOpen={isCaseModalOpen} onClose={() => setIsCaseModalOpen(false)} />
      <BulkImportClientsModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />
    </div>
  );
};
