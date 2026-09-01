import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FileText, X, Check, UploadCloud, AlertCircle } from 'lucide-react';
import {
  AVAILABLE_TOKENS,
  saveCustomDocumentTemplate,
  type DocumentTemplate,
} from '../utils/document-templates';
import { parseDocumentTemplateFile } from '../utils/docx-parser';
import { playNotificationSound } from '../utils/live-alerts';
import { useStore } from '../store';

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
  const { addNotification } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentTemplate['category']>('Personalizado');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState<string | undefined>(undefined);
  const [isHtmlFormat, setIsHtmlFormat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: '' }));

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
      setHtmlContent(parsed.htmlContent);
      setIsHtmlFormat(parsed.isHtmlFormat ?? false);
      setUploadedFileName(file.name);
      if (!title.trim()) {
        setTitle(parsed.title);
      }
      setFieldErrors({});
      playNotificationSound('success');
      addNotification({
        type: 'success',
        title: 'Archivo Word Importado',
        message: `El contenido de "${file.name}" se cargó preservando el formato original.`,
        show_toast: true,
      });
    } catch (err: any) {
      const msg = 'Error al leer el documento de Word: ' + err.message;
      setError(msg);
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error de Lectura Word',
        message: msg,
        show_toast: true,
      });
    } finally {
      setIsReadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = 'El título de la plantilla es obligatorio.';
    }
    if (!content.trim()) {
      errors.content = 'El contenido de la plantilla no puede estar vacío.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setError('Por favor completa el título y contenido de la plantilla.');
      playNotificationSound('critical');
      addNotification({
        type: 'warning',
        title: 'Plantilla Incompleta',
        message: 'Debes especificar un título y redactar el contenido del documento.',
        show_toast: true,
      });
      return;
    }

    try {
      const created = saveCustomDocumentTemplate({
        title: title.trim(),
        description: description.trim() || 'Plantilla personalizada de consultoría',
        category,
        content,
        htmlContent: isHtmlFormat ? htmlContent : undefined,
        isHtmlFormat,
      });

      playNotificationSound('success');
      addNotification({
        type: 'success',
        title: 'Plantilla Guardada',
        message: `La plantilla "${title.trim()}" está disponible en la librería.`,
        show_toast: true,
      });
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const msg = 'Error al guardar plantilla: ' + err.message;
      setError(msg);
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error al Guardar',
        message: msg,
        show_toast: true,
      });
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
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Cargar o Crear Plantilla de Documento
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Sube un documento de Word (.docx) existente o redacta una plantilla desde cero
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--status-critical)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
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
          </div>

          <form id="template-create-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Título de la Plantilla <span style={{ color: 'var(--status-critical)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder="Ej. Propuesta de Arquitectura y Auditoría"
                  style={{
                    width: '100%',
                    border: fieldErrors.title ? '1.5px solid var(--status-critical)' : undefined,
                    boxShadow: fieldErrors.title ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                  }}
                />
                {fieldErrors.title && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {fieldErrors.title}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="Propuesta">Propuesta</option>
                  <option value="Auditoría">Auditoría</option>
                  <option value="Informe">Informe</option>
                  <option value="Carta">Carta</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Descripción Breve
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve explicación del objetivo de este documento..."
                style={{ width: '100%' }}
              />
            </div>

            {/* Variable Tokens Helper */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Variables Dinámicas Disponibles (Haz clic para insertar):
                </label>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.65rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                {AVAILABLE_TOKENS.map((token) => (
                  <button
                    key={token.token}
                    type="button"
                    className="btn-ghost"
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '4px',
                      color: 'var(--accent-primary)',
                      fontFamily: 'monospace',
                    }}
                    onClick={() => handleInsertToken(token.token)}
                    title={token.label}
                  >
                    + {token.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Editor */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Contenido Markdown del Documento <span style={{ color: 'var(--status-critical)' }}>*</span>
              </label>
              <textarea
                ref={textareaRef}
                rows={12}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: '' }));
                }}
                placeholder="# Título del Documento&#10;&#10;Estimado/a {{CLIENTE_NOMBRE}},&#10;&#10;Por medio de la presente..."
                style={{
                  width: '100%',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.84rem',
                  lineHeight: '1.5',
                  border: fieldErrors.content ? '1.5px solid var(--status-critical)' : undefined,
                  boxShadow: fieldErrors.content ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                }}
              />
              {fieldErrors.content && (
                <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} /> {fieldErrors.content}
                </span>
              )}
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
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="template-create-form" className="btn-primary">
            <Check size={16} /> Guardar en Plantillas
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
