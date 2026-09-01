import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store';
import {
  Search,
  Building2,
  Briefcase,
  CheckSquare,
  Tag,
  FileText,
  Sun,
  Inbox,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { ActiveTab } from '../types';

interface CommandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResultItem {
  id: string;
  type: 'navigation' | 'client' | 'case' | 'commitment' | 'ticket' | 'note';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandCenterModal: React.FC<CommandCenterModalProps> = ({ isOpen, onClose }) => {
  const {
    clients,
    cases,
    commitments,
    tickets,
    notes,
    setActiveTab,
    setSelectedCaseId,
  } = useStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const results: SearchResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: SearchResultItem[] = [];

    // 1. Navigation / Quick Commands
    const navCommands: { title: string; subtitle: string; tab: ActiveTab; icon: React.ReactNode }[] = [
      { title: 'Mi Día', subtitle: 'Centro de Operaciones y Morning Brief', tab: 'my_day', icon: <Sun size={16} /> },
      { title: 'Bandeja de Entrada (Inbox)', subtitle: 'Captura y clasificación rápida GTD', tab: 'inbox', icon: <Inbox size={16} /> },
      { title: 'Esperando de Otros', subtitle: 'Bloqueos y dependencias de clientes/terceros', tab: 'waiting_on', icon: <Clock size={16} /> },
      { title: 'Casos y Proyectos', subtitle: 'Directorio y seguimiento de casos', tab: 'cases', icon: <Briefcase size={16} /> },
      { title: 'Compromisos & Tareas', subtitle: 'Matriz de compromisos y plazos', tab: 'commitments', icon: <CheckSquare size={16} /> },
      { title: 'Tickets & Soporte', subtitle: 'Centro de incidencias y SLA', tab: 'tickets', icon: <Tag size={16} /> },
      { title: 'Clientes & Contactos', subtitle: 'Directorio y complejidad de clientes', tab: 'clients', icon: <Building2 size={16} /> },
      { title: 'Centro de Documentos', subtitle: 'Generador de Word (.docx) y plantillas', tab: 'reports', icon: <FileText size={16} /> },
    ];

    navCommands.forEach((cmd) => {
      if (!q || cmd.title.toLowerCase().includes(q) || cmd.subtitle.toLowerCase().includes(q)) {
        items.push({
          id: `nav_${cmd.tab}`,
          type: 'navigation',
          title: cmd.title,
          subtitle: cmd.subtitle,
          icon: cmd.icon,
          badge: 'Módulo',
          action: () => {
            setActiveTab(cmd.tab);
            onClose();
          },
        });
      }
    });

    if (!q) return items.slice(0, 8);

    // 2. Clients
    clients.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q))) {
        items.push({
          id: `cli_${c.id}`,
          type: 'client',
          title: c.name,
          subtitle: c.company ? `${c.company} • ${c.category || 'Cliente'}` : (c.category || 'Cliente'),
          icon: <Building2 size={16} color="var(--accent-primary)" />,
          badge: 'Cliente',
          action: () => {
            setActiveTab('clients');
            onClose();
          },
        });
      }
    });

    // 3. Cases
    cases.forEach((c) => {
      if (c.title.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))) {
        items.push({
          id: `case_${c.id}`,
          type: 'case',
          title: c.title,
          subtitle: `Cliente: ${c.client_name || 'Sin asignar'} • Estado: ${c.status}`,
          icon: <Briefcase size={16} color="var(--accent-primary)" />,
          badge: 'Caso',
          action: () => {
            setSelectedCaseId(c.id);
            setActiveTab('cases');
            onClose();
          },
        });
      }
    });

    // 4. Commitments
    commitments.forEach((comm) => {
      if (comm.description.toLowerCase().includes(q)) {
        items.push({
          id: `comm_${comm.id}`,
          type: 'commitment',
          title: comm.description,
          subtitle: `Caso: ${comm.case_title || 'General'} • Vence: ${comm.due_date ? comm.due_date.split('T')[0] : 'Sin fecha'}`,
          icon: <CheckSquare size={16} color="var(--status-low)" />,
          badge: 'Compromiso',
          action: () => {
            setActiveTab('commitments');
            onClose();
          },
        });
      }
    });

    // 5. Tickets
    tickets.forEach((t) => {
      if (t.title.toLowerCase().includes(q) || t.ticket_number.toLowerCase().includes(q) || t.requester_name.toLowerCase().includes(q)) {
        items.push({
          id: `tck_${t.id}`,
          type: 'ticket',
          title: `[${t.ticket_number}] ${t.title}`,
          subtitle: `Cliente: ${t.client_name || 'General'} • Solicitante: ${t.requester_name}`,
          icon: <Tag size={16} color="var(--accent-primary)" />,
          badge: 'Ticket',
          action: () => {
            setActiveTab('tickets');
            onClose();
          },
        });
      }
    });

    // 6. Notes
    notes.forEach((n) => {
      if (n.content.toLowerCase().includes(q)) {
        items.push({
          id: `note_${n.id}`,
          type: 'note',
          title: n.content.substring(0, 60),
          subtitle: n.case_title ? `Caso: ${n.case_title}` : 'Nota rápida',
          icon: <FileText size={16} color="var(--text-muted)" />,
          badge: 'Nota',
          action: () => {
            setActiveTab('notes');
            onClose();
          },
        });
      }
    });

    return items.slice(0, 20);
  }, [query, clients, cases, commitments, tickets, notes, setActiveTab, setSelectedCaseId, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '620px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          border: '1px solid rgba(59,130,246,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <Search size={18} color="var(--accent-primary)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar clientes, casos, compromisos, tickets o comandos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '1rem',
              color: 'var(--text-primary)',
              outline: 'none',
              padding: 0,
            }}
          />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
          {results.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              No se encontraron resultados para "{query}".
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--accent-glow)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={item.action}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                      {item.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.badge && (
                      <span className="badge" style={{ fontSize: '0.65rem', backgroundColor: 'var(--bg-surface)' }}>
                        {item.badge}
                      </span>
                    )}
                    {isSelected && <ArrowRight size={13} color="var(--accent-primary)" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.6rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>Navega con <strong>↑</strong> <strong>↓</strong> y presiona <strong>Enter</strong></span>
          <span>Command Center • WorkDesk 0.3</span>
        </div>
      </div>
    </div>
  );
};
