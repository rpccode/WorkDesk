import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { SearchableCaseSelect } from '../components/SearchableCaseSelect';
import { formatDate } from '../utils/date';

export const NotesView: React.FC = () => {
  const { notes, cases, fetchNotes, fetchCases, createNote, deleteNote } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCaseFilter, setSelectedCaseFilter] = useState('');
  const [newContent, setNewContent] = useState('');
  const [targetCaseId, setTargetCaseId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchCases();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSaving(true);
    try {
      await createNote({
        content: newContent.trim(),
        case_id: targetCaseId || undefined,
      });
      setNewContent('');
      setTargetCaseId('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.case_title && n.case_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (n.client_name && n.client_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCase = !selectedCaseFilter || n.case_id === selectedCaseFilter;

    return matchesSearch && matchesCase;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Notas Rápidas & Bitácora Libre
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Captura ideas, recordatorios y apuntes rápidos vinculados a tus casos
        </p>
      </div>

      {/* Quick Entry Box */}
      <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--border-focus)' }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <textarea
            rows={3}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Escribe una nota o apunte rápido aquí..."
            style={{ width: '100%', resize: 'vertical' }}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div style={{ flex: '1 1 320px' }}>
              <SearchableCaseSelect
                cases={cases}
                selectedCaseId={targetCaseId}
                onChange={(id) => setTargetCaseId(id)}
                placeholder="Vincular a un caso (opcional)..."
                allowClear
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isSaving || !newContent.trim()}>
              <Plus size={16} /> {isSaving ? 'Guardando...' : 'Guardar Nota'}
            </button>
          </div>
        </form>
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
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Buscar en notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 1 auto' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            FILTRAR POR CASO:
          </span>
          <select
            value={selectedCaseFilter}
            onChange={(e) => setSelectedCaseFilter(e.target.value)}
            style={{ minWidth: '220px', maxWidth: '320px' }}
          >
            <option value="">-- Todos los casos --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filteredNotes.length === 0 ? (
          <div
            className="glass-card"
            style={{
              gridColumn: '1 / -1',
              padding: '3.5rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No hay notas registradas</p>
          </div>
        ) : (
          filteredNotes.map((n) => (
            <div
              key={n.id}
              className="glass-card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              {n.case_title && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                    {n.client_name || 'Cliente'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>• {n.case_title}</span>
                </div>
              )}

              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', flex: 1 }}>
                {n.content}
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.6rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>{formatDate(n.created_at)}</span>
                <button
                  onClick={() => deleteNote(n.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: '0.2rem',
                    cursor: 'pointer',
                  }}
                  title="Eliminar nota"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
