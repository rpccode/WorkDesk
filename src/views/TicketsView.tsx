import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import {
  Tag,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Clock,
  CheckCircle,
  Trash2,
  Edit2,
  Flame,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TicketModal } from '../components/TicketModal';
import { BulkImportTicketsModal } from '../components/BulkImportTicketsModal';
import { playNotificationSound } from '../utils/live-alerts';
import type {
  Ticket,
  TicketPriority,
  TicketStatus,
} from '../types';

export const TicketsView: React.FC = () => {
  const { tickets, clients, updateTicket, deleteTicket, addNotification } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const numMatch = t.ticket_number?.toLowerCase().includes(term);
        const titleMatch = t.title.toLowerCase().includes(term);
        const clientMatch = t.client_name ? t.client_name.toLowerCase().includes(term) : false;
        const reqMatch = t.requester_name ? t.requester_name.toLowerCase().includes(term) : false;
        if (!numMatch && !titleMatch && !clientMatch && !reqMatch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          if (t.status === 'resolved' || t.status === 'closed') return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Client filter
      if (clientFilter !== 'all' && t.client_id !== clientFilter) return false;

      return true;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter, categoryFilter, clientFilter]);

  // KPIs
  const totalCount = tickets.length;
  const activeCount = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
  const criticalCount = tickets.filter((t) => (t.priority === 'critical' || t.priority === 'high') && t.status !== 'closed').length;
  const resolvedThisMonthCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

  const handleStatusChange = async (ticket: Ticket, newStatus: TicketStatus) => {
    try {
      await updateTicket({
        id: ticket.id,
        status: newStatus,
      });
      playNotificationSound('success');
      addNotification({
        type: 'success',
        title: 'Estado de Ticket Actualizado',
        message: `El ticket ${ticket.ticket_number} ahora está "${newStatus}".`,
        show_toast: true,
      });
    } catch (e: any) {
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error al Cambiar Estado',
        message: e.message || 'No se pudo actualizar el estado del ticket.',
        show_toast: true,
      });
    }
  };

  const handleDeleteTicket = async (ticket: Ticket) => {
    if (!window.confirm(`¿Estás seguro de eliminar el ticket "${ticket.ticket_number || ticket.title}"?`)) {
      return;
    }
    try {
      await deleteTicket(ticket.id);
      playNotificationSound('success');
      addNotification({
        type: 'info',
        title: 'Ticket Eliminado',
        message: `El ticket ${ticket.ticket_number} ha sido eliminado.`,
        show_toast: true,
      });
    } catch (e: any) {
      addNotification({
        type: 'critical',
        title: 'Error al Eliminar',
        message: e.message || 'No se pudo eliminar el ticket.',
        show_toast: true,
      });
    }
  };

  const handleExportToExcel = () => {
    if (filteredTickets.length === 0) {
      alert('No hay tickets disponibles para exportar con los filtros actuales.');
      return;
    }

    const exportRows = filteredTickets.map((t) => ({
      'Código Ticket': t.ticket_number,
      'Cliente': t.client_name || 'Sin cliente',
      'Empresa': t.client_company || '',
      'Título / Asunto': t.title,
      'Detalle': t.description || '',
      'Categoría': t.category,
      'Prioridad': t.priority,
      'Estado': t.status,
      'Canal': t.channel,
      'Solicitante': t.requester_name,
      'Email Solicitante': t.requester_email || '',
      'Asignado a': t.assigned_to || '',
      'Fecha Límite SLA': t.sla_due_date || '',
      'Fecha Creación': t.created_at?.split('T')[0] || '',
      'Notas Solución': t.resolution || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    XLSX.writeFile(wb, `workdesk_tickets_${new Date().toISOString().split('T')[0]}.xlsx`);

    playNotificationSound('success');
    addNotification({
      type: 'success',
      title: 'Exportación Finalizada',
      message: `Se descargaron ${exportRows.length} tickets en formato Excel.`,
      show_toast: true,
    });
  };

  const renderPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--status-critical)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Flame size={12} /> Crítica
          </span>
        );
      case 'high':
        return (
          <span
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--status-medium)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            Alta
          </span>
        );
      case 'medium':
        return (
          <span
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Media
          </span>
        );
      case 'low':
        return (
          <span
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--status-low)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            Baja
          </span>
        );
    }
  };

  const renderStatusDropdown = (ticket: Ticket) => {
    return (
      <select
        value={ticket.status}
        onChange={(e) => handleStatusChange(ticket, e.target.value as TicketStatus)}
        style={{
          fontSize: '0.74rem',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontWeight: 700,
          border: '1px solid var(--border-medium)',
          backgroundColor:
            ticket.status === 'resolved' || ticket.status === 'closed'
              ? 'rgba(16, 185, 129, 0.1)'
              : ticket.status === 'in_progress'
              ? 'var(--accent-glow)'
              : ticket.status === 'waiting_client'
              ? 'rgba(245, 158, 11, 0.1)'
              : 'var(--bg-surface)',
          color:
            ticket.status === 'resolved' || ticket.status === 'closed'
              ? 'var(--status-low)'
              : ticket.status === 'in_progress'
              ? 'var(--accent-primary)'
              : ticket.status === 'waiting_client'
              ? 'var(--status-medium)'
              : 'var(--text-primary)',
        }}
      >
        <option value="open">Abierto</option>
        <option value="in_progress">En Progreso</option>
        <option value="waiting_client">Espera Cliente</option>
        <option value="resolved">Resuelto</option>
        <option value="closed">Cerrado</option>
      </select>
    );
  };

  const renderSlaIndicator = (slaDate?: string | null, status?: TicketStatus) => {
    if (!slaDate) {
      return <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>;
    }
    if (status === 'resolved' || status === 'closed') {
      return <span style={{ color: 'var(--status-low)', fontSize: '0.72rem' }}>✓ Cumplido ({slaDate})</span>;
    }

    const today = new Date().toISOString().split('T')[0];
    const isOverdue = slaDate < today;
    const isToday = slaDate === today;

    return (
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: isOverdue || isToday ? 800 : 600,
          color: isOverdue ? 'var(--status-critical)' : isToday ? 'var(--status-medium)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <Clock size={12} />
        {isOverdue ? `Vencido (${slaDate})` : isToday ? `Vence hoy (${slaDate})` : slaDate}
      </span>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <Tag size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
                Centro de Tickets & Soporte
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', margin: 0 }}>
                Control y trazabilidad de requerimientos, incidencias y nivel de servicio (SLA) por cliente
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem' }}
            onClick={() => setIsBulkImportOpen(true)}
          >
            <FileSpreadsheet size={15} color="var(--status-low)" /> Carga Masiva (Excel / CSV)
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem' }}
            onClick={handleExportToExcel}
          >
            <Download size={15} /> Exportar
          </button>

          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem' }}
            onClick={() => {
              setTicketToEdit(null);
              setIsCreateModalOpen(true);
            }}
          >
            <Plus size={16} /> + Nuevo Ticket
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Registrados
            </span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.15rem 0 0 0', color: 'var(--text-primary)' }}>
              {totalCount}
            </h3>
          </div>
          <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }}>
            <Tag size={20} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
              Abiertos / En Gestión
            </span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.15rem 0 0 0', color: 'var(--accent-primary)' }}>
              {activeCount}
            </h3>
          </div>
          <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--status-critical)', textTransform: 'uppercase' }}>
              Críticos / Alta Prioridad
            </span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.15rem 0 0 0', color: 'var(--status-critical)' }}>
              {criticalCount}
            </h3>
          </div>
          <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-critical)' }}>
            <Flame size={20} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--status-low)', textTransform: 'uppercase' }}>
              Resueltos / Cerrados
            </span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.15rem 0 0 0', color: 'var(--status-low)' }}>
              {resolvedThisMonthCount}
            </h3>
          </div>
          <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-low)' }}>
            <CheckCircle size={20} />
          </div>
        </div>

      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        {/* Row 1: Search & Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, asunto, cliente o solicitante..."
              style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.82rem' }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Client Filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            style={{ fontSize: '0.82rem', minWidth: '180px' }}
          >
            <option value="all">Todos los Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company})` : ''}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ fontSize: '0.82rem', minWidth: '140px' }}
          >
            <option value="all">Todas las Prioridades</option>
            <option value="critical">🔴 Crítica</option>
            <option value="high">🟠 Alta</option>
            <option value="medium">🟡 Media</option>
            <option value="low">🟢 Baja</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ fontSize: '0.82rem', minWidth: '150px' }}
          >
            <option value="all">Todas las Categorías</option>
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

        {/* Row 2: Status Quick Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          {[
            { key: 'all', label: `Todos (${tickets.length})` },
            { key: 'active', label: `Pendientes (${activeCount})` },
            { key: 'open', label: 'Abiertos' },
            { key: 'in_progress', label: 'En Progreso' },
            { key: 'waiting_client', label: 'Espera Cliente' },
            { key: 'resolved', label: 'Resueltos' },
            { key: 'closed', label: 'Cerrados' },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className="btn-ghost"
                style={{
                  fontSize: '0.76rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontWeight: isActive ? 800 : 500,
                  backgroundColor: isActive ? 'var(--accent-glow)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tickets Main Table ──────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredTickets.length === 0 ? (
          <div
            style={{
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}>
              <Tag size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                No se encontraron tickets con los filtros actuales
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                Crea un nuevo ticket o importa registros masivamente desde tu archivo Excel
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.8rem' }}
                onClick={() => {
                  setTicketToEdit(null);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus size={14} /> Crear Ticket
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.8rem' }}
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileSpreadsheet size={14} /> Importar Excel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '90px' }}>Código</th>
                  <th style={{ padding: '0.75rem 1rem', width: '180px' }}>Cliente / Empresa</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Asunto & Requerimiento</th>
                  <th style={{ padding: '0.75rem 1rem', width: '130px' }}>Categoría</th>
                  <th style={{ padding: '0.75rem 1rem', width: '95px' }}>Prioridad</th>
                  <th style={{ padding: '0.75rem 1rem', width: '140px' }}>Estado</th>
                  <th style={{ padding: '0.75rem 1rem', width: '130px' }}>SLA</th>
                  <th style={{ padding: '0.75rem 1rem', width: '90px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.15s',
                    }}
                    className="table-row-hover"
                  >
                    {/* Ticket Code */}
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {ticket.ticket_number}
                    </td>

                    {/* Client */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ticket.client_name || 'Cliente no asignado'}
                        </span>
                        {ticket.client_company && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {ticket.client_company}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Subject & Details */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                          {ticket.title}
                        </span>
                        {ticket.description && (
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                            {ticket.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          <span>👤 {ticket.requester_name}</span>
                          {ticket.channel && <span>• Canal: {ticket.channel}</span>}
                          {ticket.case_title && <span>• 💼 {ticket.case_title}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {ticket.category}
                      </span>
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {renderPriorityBadge(ticket.priority)}
                    </td>

                    {/* Status Dropdown */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {renderStatusDropdown(ticket)}
                    </td>

                    {/* SLA */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {renderSlaIndicator(ticket.sla_due_date, ticket.status)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '0.3rem', color: 'var(--text-secondary)' }}
                          title="Editar ticket"
                          onClick={() => {
                            setTicketToEdit(ticket);
                            setIsCreateModalOpen(true);
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '0.3rem', color: 'var(--status-critical)' }}
                          title="Eliminar ticket"
                          onClick={() => handleDeleteTicket(ticket)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <TicketModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTicketToEdit(null);
        }}
        ticketToEdit={ticketToEdit}
      />

      <BulkImportTicketsModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />

    </div>
  );
};
