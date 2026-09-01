import { useState, useMemo } from 'react';

export interface UsePaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

export interface UsePaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageSizeOptions: number[];
  paginatedItems: T[];
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  /** Call this when filters change to reset to page 1 */
  resetPage: () => void;
}

/**
 * Generic pagination hook. Accepts any filtered array and returns the
 * current page slice plus all controls needed by the <Pagination> component.
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { defaultPageSize = 25, pageSizeOptions = [10, 25, 50, 100] } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp current page whenever total changes (e.g. after a filter)
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const handleSetPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const resetPage = () => setCurrentPage(1);

  return {
    currentPage: safePage,
    pageSize,
    totalPages,
    totalItems,
    pageSizeOptions,
    paginatedItems,
    setCurrentPage: handleSetPage,
    setPageSize: handleSetPageSize,
    resetPage,
  };
}
