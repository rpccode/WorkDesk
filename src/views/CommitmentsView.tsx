import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store';
import {
  CheckSquare,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';
import { CommitmentModal } from '../components/CommitmentModal';
import { Pagination } from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { formatRelativeDate, formatDate, isOverdue } from '../utils/date';

export const CommitmentsView: React.FC = () => {
  const {
    commitments,
    commitmentFilter,
    setCommitmentFilter,
    fetchCommitments,
    markCommitmentDone,
    snoozeCommitment,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [snoozeId, setSnoozeId] = useState<string | null>(null);
  const [snoozeDate, setSnoozeDate] = useState('');

  useEffect(() => {
    fetchCommitments();
  }, []);

  const filteredCommitments = useMemo(() => commitments.filter((c) => {
    const matchesSearch =
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.case_title && c.case_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.client_name && c.client_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  }), [commitments, searchTerm]);

  const pagination = usePagination(filteredCommitments, { defaultPageSize: 25 });

  // Reset page on filter change
  React.useEffect(() => { pagination.resetPage(); }, [searchTerm, commitmentFilter]);

  const handleSnooze = async (id: string) => {
    if (!snoozeDate) return;
    await snoozeCommitment(id, snoozeDate);
    setSnoozeId(null);
    setSnoozeDate('');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Control de Compromisos & Entregas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Todo lo prometido a clientes y lo que clientes deben entregarte
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Nuevo Compromiso
        </button>
      </div>

      {/* Filter Tabs & Search */}
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
            placeholder="Buscar por compromiso, caso o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: 'var(--bg-main)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          <button
            onClick={() => setCommitmentFilter('all')}
            className={commitmentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', border: 'none' }}
          >
            Todos
          </button>
          <button
            onClick={() => setCommitmentFilter('pending')}
            className={commitmentFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', border: 'none' }}
          >
            <Clock size={14} /> Mis Pendientes
          </button>
          <button
            onClick={() => setCommitmentFilter('waiting')}
            className={commitmentFilter === 'waiting' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', border: 'none' }}
          >
            <UserCheck size={14} /> Me deben responder
          </button>
          <button
            onClick={() => setCommitmentFilter('done')}
            className={commitmentFilter === 'done' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', border: 'none' }}
          >
            <CheckCircle2 size={14} /> Completados
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pagination.paginatedItems.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: '3.5rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <CheckSquare size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No hay compromisos con los filtros seleccionados</p>
          </div>
        ) : (
          pagination.paginatedItems.map((com) => {
            const isDone = com.status === 'done';
            const overdue = !isDone && isOverdue(com.due_date);

            return (
              <div
                key={com.id}
                className="glass-card"
                style={{
                  padding: '1rem 1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  borderLeft: overdue
                    ? '4px solid var(--status-critical)'
                    : isDone
                    ? '4px solid var(--status-low)'
                    : com.owner !== 'me'
                    ? '4px solid var(--status-medium)'
                    : '4px solid var(--accent-primary)',
                  opacity: isDone ? 0.6 : 1,
                }}
              >
                <button
                  onClick={() => !isDone && markCommitmentDone(com.id)}
                  style={{
                    background: isDone ? 'var(--status-low-bg)' : 'transparent',
                    color: isDone ? 'var(--status-low)' : 'var(--text-muted)',
                    border: `1px solid ${isDone ? 'var(--status-low)' : 'var(--border-subtle)'}`,
                    padding: '0.5rem',
                    borderRadius: '50%',
                    cursor: isDone ? 'default' : 'pointer',
                  }}
                  title={isDone ? 'Completado' : 'Marcar como completado'}
                >
                  <CheckCircle2 size={18} />
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {com.client_name || 'Cliente'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      • {com.case_title || 'Caso'}
                    </span>
                    <span className={`badge ${com.owner === 'me' ? 'badge-low' : 'badge-medium'}`} style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
                      {com.owner === 'me' ? '🙋‍♂️ Entrega propia' : '🏢 Cliente debe responder'}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}
                  >
                    {com.description}
                  </p>

                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {com.due_date ? (
                      <span style={{ color: overdue ? 'var(--status-critical)' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
                        📅 {formatRelativeDate(com.due_date)} ({formatDate(com.due_date)})
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Sin fecha límite</span>
                    )}

                    {isDone && com.done_at && (
                      <span style={{ color: 'var(--status-low)' }}>
                        ✓ Completado el {formatDate(com.done_at)}
                      </span>
                    )}
                  </div>
                </div>

                {!isDone && (
                  <div>
                    {snoozeId === com.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="date"
                          value={snoozeDate}
                          onChange={(e) => setSnoozeDate(e.target.value)}
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                        />
                        <button
                          className="btn-primary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => handleSnooze(com.id)}
                        >
                          Guardar
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => setSnoozeId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          setSnoozeId(com.id);
                          setSnoozeDate(com.due_date || '');
                        }}
                      >
                        Reprogramar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredCommitments.length > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="compromisos"
        />
      )}

      <CommitmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
