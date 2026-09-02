import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Filter,
  RotateCcw,
  CheckSquare,
  Square,
  ChevronDown,
  User,
  Layers,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TicketModal } from '../components/TicketModal';
import { BulkImportTicketsModal } from '../components/BulkImportTicketsModal';
import { Pagination } from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { playNotificationSound } from '../utils/live-alerts';
import type {
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketCategory,
  TicketChannel,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface BulkEditValues {
  status: TicketStatus | '';
  priority: TicketPriority | '';
  category: TicketCategory | '';
  channel: TicketChannel | '';
  assigned_to: string;
}

export const TicketsView: React.FC = () => {
  const { tickets, clients, updateTicket, deleteTicket, deleteAllTickets, addNotification } = useStore();

  // ── Filter State ────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]         = useState('');
  const [statusFilter, setStatusFilter]     = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [clientFilter, setClientFilter]     = useState<string>('all');
  const [channelFilter, setChannelFilter]   = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [slaFilter, setSlaFilter]           = useState<string>('all');   // all | overdue | today | upcoming | no_sla
  const [dateFrom, setDateFrom]             = useState('');
  const [dateTo, setDateTo]                 = useState('');
  const [showAdvanced, setShowAdvanced]     = useState(false);

  // ── Modal / Edit State ──────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen]   = useState(false);
  const [ticketToEdit, setTicketToEdit]           = useState<Ticket | null>(null);

  // ── Bulk Edit State ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkValues, setBulkValues] = useState<BulkEditValues>({
    status: '', priority: '', category: '', channel: '', assigned_to: '',
  });
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // ── Derived unique values for filter dropdowns ──────────────────────────────
  const uniqueAssignees = useMemo(() =>
    Array.from(new Set(tickets.map((t) => t.assigned_to).filter((v): v is string => !!v))).sort(),
    [tickets]
  );

  const today = new Date().toISOString().split('T')[0];

  // ── Filtered tickets ────────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Free text search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const numMatch    = t.ticket_number?.toLowerCase().includes(term);
        const titleMatch  = t.title.toLowerCase().includes(term);
        const clientMatch = t.client_name ? t.client_name.toLowerCase().includes(term) : false;
        const reqMatch    = t.requester_name ? t.requester_name.toLowerCase().includes(term) : false;
        const descMatch   = t.description ? t.description.toLowerCase().includes(term) : false;
        const assignMatch = t.assigned_to ? t.assigned_to.toLowerCase().includes(term) : false;
        if (!numMatch && !titleMatch && !clientMatch && !reqMatch && !descMatch && !assignMatch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          if (t.status === 'resolved' || t.status === 'closed') return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // Priority
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      // Category
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Client
      if (clientFilter !== 'all' && t.client_id !== clientFilter) return false;

      // Channel
      if (channelFilter !== 'all' && t.channel !== channelFilter) return false;

      // Assigned to
      if (assignedFilter === 'unassigned') {
        if (t.assigned_to) return false;
      } else if (assignedFilter !== 'all' && t.assigned_to !== assignedFilter) {
        return false;
      }

      // SLA status
      if (slaFilter !== 'all') {
        if (slaFilter === 'no_sla') {
          if (t.sla_due_date) return false;
        } else if (slaFilter === 'overdue') {
          if (!t.sla_due_date || t.sla_due_date >= today || t.status === 'resolved' || t.status === 'closed') return false;
        } else if (slaFilter === 'today') {
          if (t.sla_due_date !== today) return false;
        } else if (slaFilter === 'upcoming') {
          if (!t.sla_due_date || t.sla_due_date <= today) return false;
        } else if (slaFilter === 'ok') {
          if (!t.sla_due_date || t.sla_due_date <= today) return false;
        }
      }

      // Date range (Apertura)
      if (dateFrom) {
        const createdDate = t.created_at ? t.created_at.split('T')[0] : '';
        if (createdDate < dateFrom) return false;
      }
      if (dateTo) {
        const createdDate = t.created_at ? t.created_at.split('T')[0] : '';
        if (createdDate > dateTo) return false;
      }

      return true;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter, categoryFilter, clientFilter, channelFilter, assignedFilter, slaFilter, dateFrom, dateTo]);

  const pagination = usePagination(filteredTickets, { defaultPageSize: 25 });

  const filterDeps = [searchTerm, statusFilter, priorityFilter, categoryFilter, clientFilter, channelFilter, assignedFilter, slaFilter, dateFrom, dateTo];
  useEffect(() => { pagination.resetPage(); setSelectedIds(new Set()); }, filterDeps);

  // Active filter count badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (clientFilter !== 'all') count++;
    if (channelFilter !== 'all') count++;
    if (assignedFilter !== 'all') count++;
    if (slaFilter !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, filterDeps);

  const resetAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setClientFilter('all');
    setChannelFilter('all');
    setAssignedFilter('all');
    setSlaFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalCount         = tickets.length;
  const activeCount        = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
  const criticalCount      = tickets.filter((t) => (t.priority === 'critical' || t.priority === 'high') && t.status !== 'closed').length;
  const resolvedCount      = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const overdueCount       = tickets.filter((t) => t.sla_due_date && t.sla_due_date < today && t.status !== 'resolved' && t.status !== 'closed').length;

  // ── Selection helpers ───────────────────────────────────────────────────────
  const visibleIds = pagination.paginatedItems.map((t) => t.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredTickets.map((t) => t.id)));
  };

  // ── Single status/delete ────────────────────────────────────────────────────
  const handleStatusChange = async (ticket: Ticket, newStatus: TicketStatus) => {
    try {
      await updateTicket({ id: ticket.id, status: newStatus });
      playNotificationSound('success');
      addNotification({ type: 'success', title: 'Estado Actualizado', message: `${ticket.ticket_number} → "${newStatus}"`, show_toast: true });
    } catch (e: any) {
      playNotificationSound('critical');
      addNotification({ type: 'critical', title: 'Error', message: e.message, show_toast: true });
    }
  };

  const handleDeleteTicket = async (ticket: Ticket) => {
    if (!window.confirm(`¿Eliminar ticket "${ticket.ticket_number || ticket.title}"?`)) return;
    try {
      await deleteTicket(ticket.id);
      playNotificationSound('success');
      addNotification({ type: 'info', title: 'Ticket Eliminado', message: `${ticket.ticket_number} eliminado.`, show_toast: true });
    } catch (e: any) {
      addNotification({ type: 'critical', title: 'Error', message: e.message, show_toast: true });
    }
  };

  // ── Bulk edit ───────────────────────────────────────────────────────────────
  const handleBulkSave = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBulkSaving(true);

    const toUpdate: Partial<BulkEditValues> = {};
    if (bulkValues.status)      toUpdate.status      = bulkValues.status;
    if (bulkValues.priority)    toUpdate.priority    = bulkValues.priority;
    if (bulkValues.category)    toUpdate.category    = bulkValues.category;
    if (bulkValues.channel)     toUpdate.channel     = bulkValues.channel;
    if (bulkValues.assigned_to) toUpdate.assigned_to = bulkValues.assigned_to;

    if (Object.keys(toUpdate).length === 0) {
      setIsBulkSaving(false);
      return;
    }

    let successCount = 0;
    for (const id of Array.from(selectedIds)) {
      try {
        await updateTicket({ id, ...toUpdate } as any);
        successCount++;
      } catch { /* continue */ }
    }

    playNotificationSound('success');
    addNotification({
      type: 'success',
      title: 'Modificación Masiva Completada',
      message: `${successCount} de ${selectedIds.size} tickets actualizados.`,
      show_toast: true,
    });

    setSelectedIds(new Set());
    setIsBulkEditing(false);
    setBulkValues({ status: '', priority: '', category: '', channel: '', assigned_to: '' });
    setIsBulkSaving(false);
  }, [selectedIds, bulkValues, updateTicket, addNotification]);

  const handleBulkDelete = useCallback(async () => {
    if (!window.confirm(`¿Eliminar los ${selectedIds.size} tickets seleccionados? Esta acción no se puede deshacer.`)) return;
    setIsBulkSaving(true);
    let successCount = 0;
    for (const id of Array.from(selectedIds)) {
      try { await deleteTicket(id); successCount++; } catch { /* continue */ }
    }
    playNotificationSound('success');
    addNotification({
      type: 'info',
      title: 'Eliminación Masiva',
      message: `${successCount} tickets eliminados.`,
      show_toast: true,
    });
    setSelectedIds(new Set());
    setIsBulkEditing(false);
    setIsBulkSaving(false);
  }, [selectedIds, deleteTicket, addNotification]);

  const handleDeleteAllTickets = useCallback(async () => {
    if (tickets.length === 0) return;
    const count = tickets.length;
    const confirmMessage = `¿Estás completamente seguro de BORRAR TODOS los ${count} tickets registrados?\n\nEsta acción es irreversible y eliminará todos los registros y su historial.`;
    if (!window.confirm(confirmMessage)) return;

    setIsBulkSaving(true);
    try {
      await deleteAllTickets();
      setSelectedIds(new Set());
      setIsBulkEditing(false);
      playNotificationSound('success');
      addNotification({
        type: 'success',
        title: 'Tickets Eliminados',
        message: `Se eliminaron correctamente todos los ${count} tickets.`,
        show_toast: true,
      });
    } catch (err: any) {
      addNotification({
        type: 'critical',
        title: 'Error al eliminar',
        message: err?.message || 'No se pudieron eliminar los tickets.',
        show_toast: true,
      });
    } finally {
      setIsBulkSaving(false);
    }
  }, [tickets, deleteAllTickets, addNotification]);

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExportToExcel = () => {
    const exportSource = someSelected
      ? tickets.filter((t) => selectedIds.has(t.id))
      : filteredTickets;

    if (exportSource.length === 0) {
      alert('No hay tickets para exportar.');
      return;
    }
    const exportRows = exportSource.map((t) => ({
      'Identificador': t.ticket_number,
      'Cliente': t.client_name || 'Sin cliente',
      'Empresa': t.client_company || '',
      'Contacto': t.requester_name,
      'Email Contacto': t.requester_email || '',
      'Título / Asunto': t.title,
      'Descripción': t.description || '',
      'Respuesta / Resolución': t.resolution || '',
      'Tipo / Categoría': t.category,
      'Prioridad': t.priority,
      'Estado': t.status,
      'Medio / Canal': t.channel || '',
      'Usuario Asignado': t.assigned_to || '',
      'SLA / Fecha Límite': t.sla_due_date || '',
      'Apertura': t.created_at?.split('T')[0] || '',
      'Cierre': t.closed_at || '',
      'Caso Asociado': t.case_title || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    XLSX.writeFile(wb, `workdesk_tickets_${new Date().toISOString().split('T')[0]}.xlsx`);
    playNotificationSound('success');
    addNotification({ type: 'success', title: 'Exportación Lista', message: `${exportRows.length} tickets exportados.`, show_toast: true });
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderPriorityBadge = (priority: TicketPriority) => {
    const map: Record<TicketPriority, { label: string; bg: string; color: string }> = {
      critical: { label: '🔥 Crítica', bg: 'rgba(239,68,68,0.15)', color: 'var(--status-critical)' },
      high:     { label: '⚠ Alta',   bg: 'rgba(245,158,11,0.15)', color: 'var(--status-medium)' },
      medium:   { label: 'Media',     bg: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)' },
      low:      { label: 'Baja',      bg: 'rgba(16,185,129,0.12)', color: 'var(--status-low)' },
    };
    const s = map[priority] || map.medium;
    return (
      <span style={{ padding: '0.18rem 0.5rem', borderRadius: '4px', fontSize: '0.71rem', fontWeight: 800, backgroundColor: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const renderStatusDropdown = (ticket: Ticket) => (
    <select
      value={ticket.status}
      onChange={(e) => handleStatusChange(ticket, e.target.value as TicketStatus)}
      style={{
        fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 700,
        background:
          ticket.status === 'closed' ? 'rgba(100,116,139,0.15)' :
          ticket.status === 'resolved' ? 'rgba(16,185,129,0.12)' :
          ticket.status === 'in_progress' ? 'rgba(99,102,241,0.12)' :
          ticket.status === 'waiting_client' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
        color:
          ticket.status === 'closed' ? 'var(--text-muted)' :
          ticket.status === 'resolved' ? 'var(--status-low)' :
          ticket.status === 'in_progress' ? 'var(--accent-primary)' :
          ticket.status === 'waiting_client' ? 'var(--status-medium)' : 'var(--status-critical)',
        border: '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
    >
      <option value="open">Abierto</option>
      <option value="in_progress">En Progreso</option>
      <option value="waiting_client">Espera Cliente</option>
      <option value="resolved">Resuelto</option>
      <option value="closed">Cerrado</option>
    </select>
  );

  const renderSlaIndicator = (slaDate?: string | null, status?: TicketStatus) => {
    if (!slaDate) return <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>;
    if (status === 'resolved' || status === 'closed') {
      return <span style={{ color: 'var(--status-low)', fontSize: '0.72rem' }}>✓ {slaDate}</span>;
    }
    const isOverdue = slaDate < today;
    const isToday   = slaDate === today;
    return (
      <span style={{ fontSize: '0.72rem', fontWeight: isOverdue || isToday ? 800 : 500, color: isOverdue ? 'var(--status-critical)' : isToday ? 'var(--status-medium)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Clock size={12} />
        {isOverdue ? `Vencido (${slaDate})` : isToday ? `Hoy (${slaDate})` : slaDate}
      </span>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', paddingBottom: '3rem' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '1.35rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
            <Tag size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
              Centro de Tickets &amp; Soporte
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
              Control, trazabilidad y nivel de servicio (SLA) por cliente
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {someSelected && (
            <>
              <button type="button" className="btn-secondary" style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }} onClick={() => setIsBulkEditing(true)}>
                <Layers size={15} /> Editar {selectedIds.size} seleccionados
              </button>
              <button type="button" className="btn-danger" style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={handleBulkDelete} disabled={isBulkSaving}>
                <Trash2 size={15} /> Eliminar ({selectedIds.size})
              </button>
            </>
          )}
          <button type="button" className="btn-secondary" style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem' }} onClick={() => setIsBulkImportOpen(true)}>
            <FileSpreadsheet size={15} color="var(--status-low)" /> Carga Masiva (Excel / CSV)
          </button>
          <button type="button" className="btn-secondary" style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem' }} onClick={handleExportToExcel}>
            <Download size={15} /> {someSelected ? `Exportar ${selectedIds.size}` : 'Exportar'}
          </button>
          {tickets.length > 0 && !someSelected && (
            <button
              type="button"
              className="btn-danger"
              style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={handleDeleteAllTickets}
              disabled={isBulkSaving}
              title="Eliminar todos los tickets registrados"
            >
              <Trash2 size={15} /> Borrar Todo ({tickets.length})
            </button>
          )}
          <button type="button" className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem' }} onClick={() => { setTicketToEdit(null); setIsCreateModalOpen(true); }}>
            <Plus size={16} /> + Nuevo Ticket
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
        {[
          { label: 'Total Registrados', value: totalCount, color: 'var(--text-primary)', icon: <Tag size={18} />, bg: 'var(--bg-surface-elevated)' },
          { label: 'Abiertos / En Gestión', value: activeCount, color: 'var(--accent-primary)', icon: <Clock size={18} />, bg: 'var(--accent-glow)' },
          { label: 'Críticos / Alta Prior.', value: criticalCount, color: 'var(--status-critical)', icon: <Flame size={18} />, bg: 'rgba(239,68,68,0.15)' },
          { label: 'Resueltos / Cerrados', value: resolvedCount, color: 'var(--status-low)', icon: <CheckCircle size={18} />, bg: 'rgba(16,185,129,0.15)' },
          { label: 'SLA Vencido', value: overdueCount, color: overdueCount > 0 ? '#f87171' : 'var(--text-muted)', icon: <AlertCircle size={18} />, bg: overdueCount > 0 ? 'rgba(239,68,68,0.15)' : 'var(--bg-surface-elevated)' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card" style={{ padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: kpi.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</span>
              <h3 style={{ fontSize: '1.55rem', fontWeight: 800, margin: '0.1rem 0 0', color: kpi.color }}>{kpi.value}</h3>
            </div>
            <div style={{ padding: '0.55rem', borderRadius: '9px', backgroundColor: kpi.bg, color: kpi.color, flexShrink: 0 }}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* ── Filter Toolbar ───────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* Row 1: Search + Main Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>

          {/* Search */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, asunto, cliente, solicitante, descripción..."
              style={{ width: '100%', paddingLeft: '2.2rem', paddingRight: '2rem', fontSize: '0.82rem' }}
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Client */}
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} style={{ fontSize: '0.82rem', minWidth: '170px' }}>
            <option value="all">Todos los Clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
          </select>

          {/* Priority */}
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ fontSize: '0.82rem', minWidth: '130px' }}>
            <option value="all">Toda Prioridad</option>
            <option value="critical">🔴 Crítica</option>
            <option value="high">🟠 Alta</option>
            <option value="medium">🟡 Media</option>
            <option value="low">🟢 Baja</option>
          </select>

          {/* Category */}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ fontSize: '0.82rem', minWidth: '140px' }}>
            <option value="all">Toda Categoría</option>
            <option value="Soporte TI">Soporte TI</option>
            <option value="Incidencia">Incidencia</option>
            <option value="Requerimiento">Requerimiento</option>
            <option value="Consultoría">Consultoría</option>
            <option value="Facturación">Facturación</option>
            <option value="Infraestructura">Infraestructura</option>
            <option value="Configuración">Configuración</option>
            <option value="Otro">Otro</option>
          </select>

          {/* Advanced toggle */}
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem', position: 'relative', color: showAdvanced ? 'var(--accent-primary)' : undefined }}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <Filter size={13} /> Más filtros
            {activeFilterCount > 0 && !showAdvanced && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--accent-primary)', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={12} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </button>

          {activeFilterCount > 0 && (
            <button type="button" className="btn-ghost" style={{ fontSize: '0.77rem', padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }} onClick={resetAllFilters}>
              <RotateCcw size={13} /> Limpiar
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>

            {/* Channel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Canal</label>
              <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} style={{ fontSize: '0.82rem', minWidth: '130px' }}>
                <option value="all">Todos los Canales</option>
                <option value="Email">📧 Email</option>
                <option value="Teléfono">📞 Teléfono</option>
                <option value="WhatsApp">💬 WhatsApp</option>
                <option value="Portal">🌐 Portal</option>
                <option value="Reunión">🤝 Reunión</option>
              </select>
            </div>

            {/* Assigned To */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Asignado a</label>
              <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} style={{ fontSize: '0.82rem', minWidth: '150px' }}>
                <option value="all">Todos</option>
                <option value="unassigned">Sin asignar</option>
                {uniqueAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* SLA Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado SLA</label>
              <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} style={{ fontSize: '0.82rem', minWidth: '150px' }}>
                <option value="all">Todos los SLA</option>
                <option value="overdue">🔴 Vencidos</option>
                <option value="today">🟠 Vence hoy</option>
                <option value="upcoming">🟢 Por vencer</option>
                <option value="no_sla">— Sin SLA</option>
              </select>
            </div>

            {/* Date From */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Apertura desde</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }} />
            </div>

            {/* Date To */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Apertura hasta</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }} />
            </div>
          </div>
        )}

        {/* Row 2: Status Quick Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', paddingTop: '0.3rem', borderTop: '1px solid var(--border-subtle)' }}>
          {[
            { key: 'all',            label: `Todos (${tickets.length})` },
            { key: 'active',         label: `Pendientes (${activeCount})` },
            { key: 'open',           label: 'Abiertos' },
            { key: 'in_progress',    label: 'En Progreso' },
            { key: 'waiting_client', label: 'Espera Cliente' },
            { key: 'resolved',       label: 'Resueltos' },
            { key: 'closed',         label: 'Cerrados' },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button key={tab.key} type="button" className="btn-ghost" style={{ fontSize: '0.74rem', padding: '0.3rem 0.7rem', borderRadius: '6px', fontWeight: isActive ? 800 : 500, backgroundColor: isActive ? 'var(--accent-glow)' : 'transparent', color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }} onClick={() => setStatusFilter(tab.key)}>
                {tab.label}
              </button>
            );
          })}

          {/* Results counter */}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingLeft: '0.5rem' }}>
            {filteredTickets.length} resultado{filteredTickets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Bulk Selection Banner ─────────────────────────────────────────── */}
      {someSelected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(99,102,241,0.06))', border: '1px solid rgba(99,102,241,0.3)', flexWrap: 'wrap' }}>
          <CheckSquare size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.88rem' }}>
            {selectedIds.size} ticket{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>

          {selectedIds.size < filteredTickets.length && (
            <button type="button" className="btn-ghost" style={{ fontSize: '0.77rem', padding: '0.3rem 0.6rem', color: 'var(--accent-primary)' }} onClick={selectAllFiltered}>
              Seleccionar todos ({filteredTickets.length})
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }} onClick={() => setIsBulkEditing(true)}>
              <Edit2 size={14} /> Modificar seleccionados
            </button>
            <button type="button" className="btn-ghost" style={{ fontSize: '0.8rem', color: 'var(--status-critical)' }} onClick={handleBulkDelete}>
              <Trash2 size={14} /> Eliminar seleccionados
            </button>
            <button type="button" className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setSelectedIds(new Set())}>
              <X size={14} /> Limpiar selección
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk Edit Panel ──────────────────────────────────────────────── */}
      {isBulkEditing && (
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', border: '2px solid var(--accent-primary)', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), var(--bg-surface))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--accent-primary)" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-primary)' }}>
                Modificación Masiva — {selectedIds.size} ticket{selectedIds.size !== 1 ? 's' : ''}
              </span>
            </div>
            <button type="button" className="btn-ghost" style={{ padding: '0.3rem' }} onClick={() => setIsBulkEditing(false)}>
              <X size={16} />
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: 0 }}>
            Completa solo los campos que deseas modificar. Los campos en blanco no se cambiarán.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</label>
              <select value={bulkValues.status} onChange={(e) => setBulkValues((p) => ({ ...p, status: e.target.value as TicketStatus | '' }))} style={{ fontSize: '0.85rem' }}>
                <option value="">— Sin cambio —</option>
                <option value="open">Abierto</option>
                <option value="in_progress">En Progreso</option>
                <option value="waiting_client">Espera Cliente</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prioridad</label>
              <select value={bulkValues.priority} onChange={(e) => setBulkValues((p) => ({ ...p, priority: e.target.value as TicketPriority | '' }))} style={{ fontSize: '0.85rem' }}>
                <option value="">— Sin cambio —</option>
                <option value="critical">🔴 Crítica</option>
                <option value="high">🟠 Alta</option>
                <option value="medium">🟡 Media</option>
                <option value="low">🟢 Baja</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categoría</label>
              <select value={bulkValues.category} onChange={(e) => setBulkValues((p) => ({ ...p, category: e.target.value as TicketCategory | '' }))} style={{ fontSize: '0.85rem' }}>
                <option value="">— Sin cambio —</option>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Canal</label>
              <select value={bulkValues.channel} onChange={(e) => setBulkValues((p) => ({ ...p, channel: e.target.value as TicketChannel | '' }))} style={{ fontSize: '0.85rem' }}>
                <option value="">— Sin cambio —</option>
                <option value="Email">Email</option>
                <option value="Teléfono">Teléfono</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Portal">Portal</option>
                <option value="Reunión">Reunión</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Asignado a</label>
              <input
                type="text"
                value={bulkValues.assigned_to}
                onChange={(e) => setBulkValues((p) => ({ ...p, assigned_to: e.target.value }))}
                placeholder="Nombre del responsable..."
                style={{ fontSize: '0.85rem' }}
                list="assignees-list"
              />
              <datalist id="assignees-list">
                {uniqueAssignees.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button type="button" className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem' }} onClick={handleBulkSave} disabled={isBulkSaving}>
              {isBulkSaving ? 'Guardando...' : `✓ Aplicar a ${selectedIds.size} tickets`}
            </button>
            <button type="button" className="btn-ghost" style={{ fontSize: '0.85rem' }} onClick={() => { setIsBulkEditing(false); setBulkValues({ status: '', priority: '', category: '', channel: '', assigned_to: '' }); }} disabled={isBulkSaving}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Main Table ──────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredTickets.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}>
              <Tag size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>No se encontraron tickets</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                {activeFilterCount > 0 ? 'Ajusta los filtros para ver más resultados' : 'Crea un nuevo ticket o importa desde Excel'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
              {activeFilterCount > 0
                ? <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={resetAllFilters}><RotateCcw size={14} /> Limpiar filtros</button>
                : (
                  <>
                    <button type="button" className="btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => { setTicketToEdit(null); setIsCreateModalOpen(true); }}><Plus size={14} /> Crear Ticket</button>
                    <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => setIsBulkImportOpen(true)}><FileSpreadsheet size={14} /> Importar Excel</button>
                  </>
                )
              }
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  {/* Checkbox column */}
                  <th style={{ padding: '0.75rem 0.75rem 0.75rem 1rem', width: '40px' }}>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: allVisibleSelected ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex' }}
                      title={allVisibleSelected ? 'Deseleccionar página' : 'Seleccionar página'}
                    >
                      {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </th>
                  <th style={{ padding: '0.75rem 0.75rem', width: '90px' }}>Código</th>
                  <th style={{ padding: '0.75rem 0.75rem', width: '170px' }}>Cliente / Empresa</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Asunto &amp; Requerimiento</th>
                  <th style={{ padding: '0.75rem 0.75rem', width: '120px' }}>Categoría</th>
                  <th style={{ padding: '0.75rem 0.75rem', width: '90px' }}>Prioridad</th>
                  <th style={{ padding: '0.75rem 0.75rem', width: '145px' }}>Estado</th>
                  <th style={{ padding: '0.75rem 0.75rem', width: '120px' }}>SLA</th>
                  <th style={{ padding: '0.75rem 0.75rem', width: '80px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((ticket) => {
                  const isSelected = selectedIds.has(ticket.id);
                  return (
                    <tr
                      key={ticket.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.12s',
                        backgroundColor: isSelected ? 'rgba(99,102,241,0.07)' : undefined,
                      }}
                      className="table-row-hover"
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '0.75rem 0.75rem 0.75rem 1rem' }}>
                        <button
                          type="button"
                          onClick={() => toggleSelect(ticket.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex' }}
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>

                      {/* Code */}
                      <td style={{ padding: '0.75rem 0.75rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.78rem' }}>
                        {ticket.ticket_number || '—'}
                      </td>

                      {/* Client */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.83rem' }}>{ticket.client_name || 'Sin cliente'}</span>
                          {ticket.client_company && <span style={{ fontSize: '0.69rem', color: 'var(--text-muted)' }}>{ticket.client_company}</span>}
                        </div>
                      </td>

                      {/* Subject */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.12rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.84rem' }}>{ticket.title}</span>
                          {ticket.description && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                              {ticket.description}
                            </p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.67rem', color: 'var(--text-secondary)', marginTop: '0.1rem', flexWrap: 'wrap' }}>
                            <span>👤 {ticket.requester_name}</span>
                            {ticket.assigned_to && <span style={{ color: 'var(--accent-primary)' }}>• <User size={10} style={{ display: 'inline', marginRight: '0.15rem' }} />{ticket.assigned_to}</span>}
                            {ticket.channel && <span>• {ticket.channel}</span>}
                            {ticket.case_title && <span>• 💼 {ticket.case_title}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                          {ticket.category}
                        </span>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {renderPriorityBadge(ticket.priority)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {renderStatusDropdown(ticket)}
                      </td>

                      {/* SLA */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {renderSlaIndicator(ticket.sla_due_date, ticket.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.3rem' }}>
                          <button type="button" className="btn-ghost" style={{ padding: '0.3rem', color: 'var(--text-secondary)' }} title="Editar" onClick={() => { setTicketToEdit(ticket); setIsCreateModalOpen(true); }}>
                            <Edit2 size={14} />
                          </button>
                          <button type="button" className="btn-ghost" style={{ padding: '0.3rem', color: 'var(--status-critical)' }} title="Eliminar" onClick={() => handleDeleteTicket(ticket)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredTickets.length > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="tickets"
          />
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <TicketModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setTicketToEdit(null); }}
        ticketToEdit={ticketToEdit}
      />
      <BulkImportTicketsModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />
    </div>
  );
};
