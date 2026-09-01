import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Building2 } from 'lucide-react';
import type { Client, ClientComplexity } from '../types';

interface SearchableClientSelectProps {
  clients: Client[];
  selectedClientId: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  required?: boolean;
  label?: string;
  disabled?: boolean;
}

export const SearchableClientSelect: React.FC<SearchableClientSelectProps> = ({
  clients,
  selectedClientId,
  onChange,
  placeholder = 'Buscar o seleccionar un cliente...',
  allowClear = false,
  required = false,
  label,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  // Filter clients based on search query
  const filteredClients = clients.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(term);
    const companyMatch = c.company ? c.company.toLowerCase().includes(term) : false;
    const categoryMatch = c.category ? c.category.toLowerCase().includes(term) : false;
    const complexityMatch =
      (c.complexity_evaluated && c.complexity_evaluated.toLowerCase().includes(term)) ||
      (c.complexity_weighted && c.complexity_weighted.toLowerCase().includes(term));
    return nameMatch || companyMatch || categoryMatch || complexityMatch;
  });

  // Focus search input when opening dropdown
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (clientId: string) => {
    onChange(clientId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredClients.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredClients.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredClients[highlightedIndex]) {
        handleSelect(filteredClients[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const renderComplexityBadge = (val?: ClientComplexity | null) => {
    if (!val) return null;
    const bg =
      val === 'Alta'
        ? 'rgba(239, 68, 68, 0.15)'
        : val === 'Media'
        ? 'rgba(245, 158, 11, 0.15)'
        : 'rgba(16, 185, 129, 0.15)';
    const color =
      val === 'Alta'
        ? 'var(--status-critical)'
        : val === 'Media'
        ? 'var(--status-medium)'
        : 'var(--status-low)';

    return (
      <span
        style={{
          padding: '0.1rem 0.4rem',
          borderRadius: '4px',
          fontSize: '0.65rem',
          fontWeight: 800,
          backgroundColor: bg,
          color,
          marginLeft: '0.35rem',
        }}
      >
        {val}
      </span>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            marginBottom: '0.35rem',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          {label} {required && <span style={{ color: 'var(--status-critical)' }}>*</span>}
        </label>
      )}

      {/* Main Select Button Trigger */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: isOpen
            ? '1.5px solid var(--accent-primary)'
            : '1px solid var(--border-medium)',
          boxShadow: isOpen ? '0 0 0 3px var(--accent-glow)' : 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s ease',
          minHeight: '38px',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', flex: 1 }}>
          <Building2 size={15} style={{ color: selectedClient ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
          {selectedClient ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedClient.name}
              </span>
              {selectedClient.company && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  ({selectedClient.company})
                </span>
              )}
              {renderComplexityBadge(selectedClient.complexity_evaluated || selectedClient.complexity_weighted)}
            </div>
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {placeholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          {allowClear && selectedClient && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '0.15rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Quitar selección"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={15}
            style={{
              color: 'var(--text-muted)',
              transition: 'transform 0.2s',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu with Search Input */}
      {isOpen && (
        <div
          className="glass-card animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            minWidth: '300px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 99999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Box Header */}
          <div
            style={{
              padding: '0.6rem 0.75rem',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe para buscar por nombre, empresa o categoría..."
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '0.82rem',
                color: 'var(--text-primary)',
                width: '100%',
                padding: 0,
                boxShadow: 'none',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0.1rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            style={{
              maxHeight: '230px',
              overflowY: 'auto',
              padding: '0.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem',
            }}
          >
            {filteredClients.length === 0 ? (
              <div
                style={{
                  padding: '1.25rem 0.75rem',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                No se encontraron clientes que coincidan con "{searchTerm}"
              </div>
            ) : (
              filteredClients.map((c, index) => {
                const isSelected = c.id === selectedClientId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected
                        ? 'var(--accent-glow)'
                        : isHighlighted
                        ? 'var(--bg-surface-elevated)'
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span
                          style={{
                            fontSize: '0.84rem',
                            fontWeight: isSelected ? 800 : 600,
                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                          }}
                        >
                          {c.name}
                        </span>
                        {renderComplexityBadge(c.complexity_evaluated || c.complexity_weighted)}
                      </div>
                      {(c.company || c.category) && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {c.company} {c.company && c.category ? '•' : ''} {c.category}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginLeft: '0.5rem' }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer count indicator */}
          <div
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{filteredClients.length} de {clients.length} clientes</span>
            <span>Usa ↑↓ y Enter para seleccionar</span>
          </div>
        </div>
      )}
    </div>
  );
};
