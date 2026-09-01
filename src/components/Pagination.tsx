import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = 'registros',
}) => {
  if (totalItems === 0) return null;

  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  // Build page window: show up to 5 pages around current
  const pageNumbers: number[] = [];
  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - windowSize + 1);
  }
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '2rem',
    height: '2rem',
    padding: '0 0.4rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s ease',
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: 'var(--accent-primary)',
    color: '#fff',
    border: '1px solid var(--accent-primary)',
  };

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.35,
    cursor: 'not-allowed',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
      }}
    >
      {/* Left: info + page size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {from}–{to} de <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> {itemLabel}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Mostrar
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            style={{
              fontSize: '0.78rem',
              padding: '0.2rem 0.5rem',
              height: '1.9rem',
              minWidth: '64px',
            }}
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: navigation */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
          {/* First */}
          <button
            style={currentPage === 1 ? btnDisabled : btnBase}
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
            title="Primera página"
          >
            <ChevronsLeft size={14} />
          </button>

          {/* Prev */}
          <button
            style={currentPage === 1 ? btnDisabled : btnBase}
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            title="Página anterior"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Page numbers */}
          {start > 1 && (
            <>
              <button style={btnBase} onClick={() => onPageChange(1)}>1</button>
              {start > 2 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 0.15rem' }}>…</span>}
            </>
          )}

          {pageNumbers.map((p) => (
            <button
              key={p}
              style={p === currentPage ? btnActive : btnBase}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 0.15rem' }}>…</span>}
              <button style={btnBase} onClick={() => onPageChange(totalPages)}>{totalPages}</button>
            </>
          )}

          {/* Next */}
          <button
            style={currentPage === totalPages ? btnDisabled : btnBase}
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            title="Página siguiente"
          >
            <ChevronRight size={14} />
          </button>

          {/* Last */}
          <button
            style={currentPage === totalPages ? btnDisabled : btnBase}
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            title="Última página"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
