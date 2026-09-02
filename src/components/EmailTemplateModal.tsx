import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  FileText,
  HelpCircle,
  FolderPlus,
} from 'lucide-react';
import {
  AVAILABLE_PLACEHOLDERS,
  loadCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  type CustomEmailTemplate,
} from '../utils/email-templates';
import { callAIGenerate } from '../services/ai-copilot';
import { useStore } from '../store';

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSaved?: (savedTemplateId: string) => void;
  initialTemplate?: CustomEmailTemplate | null;
}

export const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({
  isOpen,
  onClose,
  onTemplateSaved,
  initialTemplate,
}) => {
  const { aiConfig, addNotification } = useStore();

  const [customTemplates, setCustomTemplates] = useState<CustomEmailTemplate[]>(() => loadCustomTemplates());
  const [activeView, setActiveView] = useState<'editor' | 'list'>('editor');

  // Form State
  const [editingId, setEditingId] = useState<string | undefined>(initialTemplate?.id);
  const [name, setName] = useState(initialTemplate?.name || '');
  const [category, setCategory] = useState<CustomEmailTemplate['category']>(
    initialTemplate?.category || 'personalizado'
  );
  const [subjectPattern, setSubjectPattern] = useState(
    initialTemplate?.subjectPattern || 'Actualización: {{caseTitle}} — {{clientName}}'
  );
  const [bodyPattern, setBodyPattern] = useState(
    initialTemplate?.bodyPattern ||
      `Hola {{recipientName}},

Espero te encuentres muy bien.

Te comparto la actualización sobre "{{caseTitle}}":

{{caseDescription}}

Compromisos en curso:
{{myCommitments}}

Pendientes de su lado:
{{clientCommitments}}

Próximo paso:
{{nextSteps}}

Saludos cordiales,
{{signature}}`
  );

  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [focusedField, setFocusedField] = useState<'subject' | 'body'>('body');

  const refreshList = () => {
    setCustomTemplates(loadCustomTemplates());
  };

  const handleInsertPlaceholder = (tag: string) => {
    if (focusedField === 'subject') {
      setSubjectPattern((prev) => prev + ` ${tag} `);
    } else {
      setBodyPattern((prev) => prev + `\n${tag}\n`);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAI(true);

    const systemPrompt = `Eres un experto en operaciones de consultoría B2B y redacción corporativa para WorkDesk.
Genera una plantilla de correo electrónico reutilizable con variables en formato {{placeholder}}.
Los placeholders válidos son:
- {{clientName}}: Nombre del cliente o empresa
- {{recipientName}}: Nombre del destinatario
- {{caseTitle}}: Título del caso
- {{caseDescription}}: Descripción o alcance del caso
- {{myCommitments}}: Lista de compromisos del consultor
- {{clientCommitments}}: Solicitudes pendientes del cliente
- {{nextSteps}}: Siguiente paso o próximo hito
- {{extraNotes}}: Observaciones adicionales
- {{signature}}: Firma del consultor

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "name": "Nombre descriptivo de la plantilla",
  "category": "seguimiento" | "minuta" | "cierre" | "escalacion" | "personalizado",
  "subjectPattern": "Patrón del asunto con {{placeholders}}",
  "bodyPattern": "Cuerpo de la plantilla con {{placeholders}}"
}`;

    try {
      const response = await callAIGenerate(
        aiConfig,
        `Crea una plantilla de correo basada en esta solicitud: "${aiPrompt.trim()}"`,
        systemPrompt
      );

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.name) setName(parsed.name);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.subjectPattern) setSubjectPattern(parsed.subjectPattern);
        if (parsed.bodyPattern) setBodyPattern(parsed.bodyPattern);

        addNotification({
          type: 'success',
          title: 'Plantilla generada con IA',
          message: `Se generó la estructura para "${parsed.name || 'Nueva Plantilla'}".`,
          show_toast: true,
        });
      } else {
        throw new Error('Respuesta inválida de IA.');
      }
    } catch (e: any) {
      addNotification({
        type: 'warning',
        title: 'Generación con IA falló',
        message: e?.message || 'Verifica tu clave de API en Configuración.',
        show_toast: true,
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !subjectPattern.trim() || !bodyPattern.trim()) {
      addNotification({
        type: 'warning',
        title: 'Campos requeridos',
        message: 'Por favor ingresa un nombre, asunto y cuerpo para la plantilla.',
        show_toast: true,
      });
      return;
    }

    const saved = saveCustomTemplate({
      id: editingId,
      name,
      category,
      subjectPattern,
      bodyPattern,
    });

    refreshList();
    addNotification({
      type: 'success',
      title: 'Plantilla Guardada',
      message: `"${saved.name}" está disponible en el selector de correos.`,
      show_toast: true,
    });

    if (onTemplateSaved) {
      onTemplateSaved(saved.id);
    }
    onClose();
  };

  const handleEdit = (template: CustomEmailTemplate) => {
    setEditingId(template.id);
    setName(template.name);
    setCategory(template.category);
    setSubjectPattern(template.subjectPattern);
    setBodyPattern(template.bodyPattern);
    setActiveView('editor');
  };

  const handleDelete = (id: string, tplName: string) => {
    if (confirm(`¿Estás seguro de eliminar la plantilla "${tplName}"?`)) {
      deleteCustomTemplate(id);
      refreshList();
      if (editingId === id) {
        setEditingId(undefined);
        setName('');
      }
      addNotification({
        type: 'info',
        title: 'Plantilla Eliminada',
        message: `Se eliminó "${tplName}".`,
        show_toast: true,
      });
    }
  };

  const handleResetForm = () => {
    setEditingId(undefined);
    setName('');
    setCategory('personalizado');
    setSubjectPattern('Seguimiento: {{caseTitle}} — {{clientName}}');
    setBodyPattern(`Hola {{recipientName}},\n\n{{caseDescription}}\n\nCompromisos:\n{{myCommitments}}\n\nSaludos,\n{{signature}}`);
    setActiveView('editor');
  };

  if (!isOpen) return null;

  const content = (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 2100 }}
    >
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '840px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                padding: '0.45rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(147,51,234,0.2) 100%)',
                color: 'var(--accent-primary)',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                {editingId ? 'Editar Plantilla de Correo' : 'Generador y Gestor de Plantillas'}
              </h2>
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>
                Crea plantillas reutilizables con variables automáticas o genéralas con IA
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn-ghost ${activeView === 'editor' ? 'active' : ''}`}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                fontWeight: activeView === 'editor' ? 700 : 500,
                color: activeView === 'editor' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveView('editor')}
            >
              <Plus size={13} /> {editingId ? 'Editor' : 'Nueva'}
            </button>
            <button
              type="button"
              className={`btn-ghost ${activeView === 'list' ? 'active' : ''}`}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                fontWeight: activeView === 'list' ? 700 : 500,
                color: activeView === 'list' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => {
                refreshList();
                setActiveView('list');
              }}
            >
              Mis Plantillas ({customTemplates.length})
            </button>
            <button className="btn-ghost" onClick={onClose} style={{ padding: '0.35rem' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Modal Body ──────────────────────────────────────────────── */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeView === 'list' ? (
            /* ── VIEW: LIST OF TEMPLATES ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Plantillas personalizadas guardadas ({customTemplates.length})
                </span>
                <button type="button" className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }} onClick={handleResetForm}>
                  <Plus size={14} /> Crear Nueva Plantilla
                </button>
              </div>

              {customTemplates.length === 0 ? (
                <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                  <FolderPlus size={36} />
                  <h4 style={{ margin: '0.5rem 0 0.2rem', fontSize: '0.95rem' }}>No tienes plantillas personalizadas aún</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Crea tu primera plantilla o usa la IA para generarla en segundos.
                  </p>
                  <button type="button" className="btn-primary" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }} onClick={handleResetForm}>
                    <Sparkles size={14} /> Crear mi primera plantilla
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
                  {customTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="glass-card"
                      style={{
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                            {t.category}
                          </span>
                          <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>{t.name}</h4>
                        </div>
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 0.4rem', fontWeight: 600 }}>
                          Asunto: {t.subjectPattern}
                        </p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-line', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.bodyPattern}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '0.74rem', padding: '0.35rem 0.6rem' }}
                          onClick={() => handleEdit(t)}
                          title="Editar plantilla"
                        >
                          <Edit2 size={13} /> Editar
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: '0.74rem', padding: '0.35rem 0.5rem', color: 'var(--status-critical)' }}
                          onClick={() => handleDelete(t.id, t.name)}
                          title="Eliminar plantilla"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── VIEW: EDITOR / AI GENERATOR ── */
            <>
              {/* AI Generator Accordion Box */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(147,51,234,0.08) 100%)',
                  border: '1px solid var(--accent-border, rgba(59,130,246,0.3))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.84rem' }}>
                  <Sparkles size={16} /> Generar Plantilla con Inteligencia Artificial
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Escribe qué tipo de correo deseas (ej: <em>"Plantilla de cobranza preventiva cordial para clientes corporativos"</em> o <em>"Aprobación de orden de cambio con lista de compromisos"</em>) y la IA generará la estructura y variables automáticamente.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Describe la plantilla que necesitas..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGenerateWithAI();
                      }
                    }}
                    style={{ flex: 1, fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleGenerateWithAI}
                    disabled={isGeneratingAI || !aiPrompt.trim()}
                    style={{ fontSize: '0.82rem', padding: '0 1rem', whiteSpace: 'nowrap' }}
                  >
                    {isGeneratingAI ? 'Generando...' : '✨ Generar'}
                  </button>
                </div>
              </div>

              {/* Form fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Nombre de la Plantilla *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Notificación de Entrega Técnica"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    style={{ width: '100%' }}
                  >
                    <option value="personalizado">⭐ Personalizado</option>
                    <option value="seguimiento">📋 Seguimiento</option>
                    <option value="minuta">📝 Minuta</option>
                    <option value="escalacion">⚠️ Escalación</option>
                    <option value="cierre">✅ Cierre</option>
                  </select>
                </div>
              </div>

              {/* Variables Bar (Click to insert) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <HelpCircle size={13} /> Variables Disponibles (Haz clic para insertar en {focusedField === 'subject' ? 'Asunto' : 'Cuerpo'}):
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Se completan dinámicamente con los datos del caso
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {AVAILABLE_PLACEHOLDERS.map((p) => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => handleInsertPlaceholder(p.tag)}
                      className="btn-ghost"
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                      }}
                      title={`${p.description} (Ej: ${p.example})`}
                    >
                      + {p.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Pattern */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Patrón del Asunto *
                </label>
                <input
                  type="text"
                  value={subjectPattern}
                  onFocus={() => setFocusedField('subject')}
                  onChange={(e) => setSubjectPattern(e.target.value)}
                  placeholder="Ej: Estado de Caso: {{caseTitle}} — {{clientName}}"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
              </div>

              {/* Body Pattern */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Cuerpo de la Plantilla *
                </label>
                <textarea
                  rows={9}
                  value={bodyPattern}
                  onFocus={() => setFocusedField('body')}
                  onChange={(e) => setBodyPattern(e.target.value)}
                  placeholder="Escribe el texto de la plantilla utilizando los placeholders {{clientName}}, {{caseTitle}}, {{myCommitments}}, etc."
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.5 }}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Modal Footer ────────────────────────────────────────────── */}
        {activeView === 'editor' && (
          <div
            style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface-elevated)',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (customTemplates.length > 0) setActiveView('list');
                else onClose();
              }}
            >
              Cancelar
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                style={{ gap: '0.4rem' }}
              >
                <Check size={15} /> {editingId ? 'Guardar Cambios' : 'Guardar Plantilla'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};
