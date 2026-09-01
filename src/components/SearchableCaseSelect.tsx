import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Briefcase } from 'lucide-react';
import type { Case } from '../types';

interface SearchableCaseSelectProps {
  cases: Case[];
  selectedCaseId: string;
  onChange: (caseId: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  required?: boolean;
  label?: string;
  disabled?: boolean;
}

export const SearchableCaseSelect: React.FC<SearchableCaseSelectProps> = ({
  cases,
  selectedCaseId,
  onChange,
  placeholder = 'Buscar o seleccionar un caso...',
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

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || null;

  const filteredCases = cases.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const titleMatch = c.title.toLowerCase().includes(term);
    const clientMatch = c.client_name ? c.client_name.toLowerCase().includes(term) : false;
    const priorityMatch = c.priority ? c.priority.toLowerCase().includes(term) : false;
    return titleMatch || clientMatch || priorityMatch;
  });

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

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

  const handleSelect = (caseId: string) => {
    onChange(caseId);
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
      setHighlightedIndex((prev) => (prev < filteredCases.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCases.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCases[highlightedIndex]) {
        handleSelect(filteredCases[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
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
          <Briefcase size={15} style={{ color: selectedCase ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
          {selectedCase ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedCase.title}
              </span>
              {selectedCase.client_name && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  [{selectedCase.client_name}]
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {placeholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          {allowClear && selectedCase && !disabled && (
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="glass-card animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            minWidth: '280px',
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
          {/* Search Header */}
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
              placeholder="Buscar por caso o cliente..."
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

          {/* List */}
          <div
            ref={listRef}
            style={{
              maxHeight: '210px',
              overflowY: 'auto',
              padding: '0.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem',
            }}
          >
            {filteredCases.length === 0 ? (
              <div
                style={{
                  padding: '1.25rem 0.75rem',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                No se encontraron casos
              </div>
            ) : (
              filteredCases.map((cs, index) => {
                const isSelected = cs.id === selectedCaseId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={cs.id}
                    onClick={() => handleSelect(cs.id)}
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
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                      <span
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                        }}
                      >
                        {cs.title}
                      </span>
                      {cs.client_name && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Cliente: {cs.client_name}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
