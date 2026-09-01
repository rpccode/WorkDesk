import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FileText, X, Check, UploadCloud, FileCode, Sparkles } from 'lucide-react';
import {
  AVAILABLE_TOKENS,
  saveCustomDocumentTemplate,
  type DocumentTemplate,
} from '../utils/document-templates';
import { parseDocumentTemplateFile } from '../utils/docx-parser';
import { playNotificationSound } from '../utils/live-alerts';

interface CreateDocumentTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTemplate: DocumentTemplate) => void;
}

export const CreateDocumentTemplateModal: React.FC<CreateDocumentTemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentTemplate['category']>('Personalizado');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const handleInsertToken = (token: string) => {
    if (!textareaRef.current) {
      setContent((prev) => prev + ' ' + token);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = content;
    const updated = current.substring(0, start) + token + current.substring(end);
    setContent(updated);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = start + token.length;
        textareaRef.current.selectionEnd = start + token.length;
      }
    }, 0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    setError(null);

    try {
      const parsed = await parseDocumentTemplateFile(file);
      setContent(parsed.content);
      setUploadedFileName(file.name);
      if (!title.trim()) {
        setTitle(parsed.title);
      }
      playNotificationSound('success');
    } catch (err: any) {
      setError('Error al leer el documento de Word: ' + err.message);
      playNotificationSound('critical');
    } finally {
      setIsReadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título de la plantilla es obligatorio.');
      return;
    }
    if (!content.trim()) {
      setError('El contenido de la plantilla no puede estar vacío.');
      return;
    }

    try {
      const created = saveCustomDocumentTemplate({
        title: title.trim(),
        description: description.trim() || 'Plantilla personalizada de consultoría',
        category,
        content,
      });

      playNotificationSound('success');
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError('Error al guardar plantilla: ' + err.message);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                padding: '0.5rem',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                Cargar o Crear Plantilla de Documento
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Sube un documento de Word (.docx) existente o redacta una plantilla desde cero
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--status-critical-bg)', color: 'var(--status-critical)', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          {/* Upload Area for Word .docx */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '2px dashed var(--accent-primary)',
              backgroundColor: 'var(--accent-glow)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.txt,.md"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            <div style={{ padding: '0.65rem', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', color: 'var(--accent-primary)' }}>
              <UploadCloud size={24} />
            </div>

            <div>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                {isReadingFile ? 'Procesando documento Word...' : uploadedFileName ? `Archivo cargado: ${uploadedFileName}` : 'Subir Documento Word (.docx)'}
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Haz clic para seleccionar tu archivo .docx de Word o plantilla existente
              </span>
            </div>

            {uploadedFileName && (
              <span className="badge badge-low" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                ✓ Documento importado y convertido a plantilla editable
              </span>
            )}
          </div>

          <form id="create-template-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Nombre de la Plantilla *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Plan de Mitigación / Acta de Conformidad"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="Diagnóstico">Diagnóstico</option>
                  <option value="Minutas">Minutas</option>
                  <option value="Propuestas">Propuestas</option>
                  <option value="Cierre">Cierre</option>
                  <option value="Cartas">Cartas</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Descripción u Objetivo de Uso
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción del propósito de este documento..."
                style={{ width: '100%' }}
              />
            </div>

            {/* Variable insertion buttons */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Contenido de la Plantilla con Variables *
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Sparkles size={12} /> Marcadores Dinámicos Disponibles
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.35rem',
                  padding: '0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  marginBottom: '0.6rem',
                  maxHeight: '90px',
                  overflowY: 'auto',
                }}
              >
                {AVAILABLE_TOKENS.map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    title={t.description}
                    onClick={() => handleInsertToken(t.token)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    + {t.label}
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# {{caso_titulo}}&#10;&#10;Estimado/a {{cliente_nombre}},&#10;&#10;Presentamos el informe de seguimiento..."
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                }}
                required
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '0.78rem' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileCode size={15} /> Cargar otro archivo Word (.docx)
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              form="create-template-form"
              className="btn-primary"
              disabled={isReadingFile || !title.trim() || !content.trim()}
            >
              <Check size={16} /> Guardar Plantilla en Librería
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
