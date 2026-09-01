import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import {
  FileText,
  FileBarChart2,
  Download,
  Printer,
  Copy,
  Check,
  Plus,
  Sparkles,
  Layers,
  Trash2,
  Calendar,
  Eye,
  Edit3,
  BookOpen,
  Save,
} from 'lucide-react';
import { buildWeeklyReport } from '../utils/report-builder';
import {
  loadSavedDocumentTemplates,
  injectTemplateTokens,
  deleteCustomDocumentTemplate,
  updateCustomDocumentTemplate,
  AVAILABLE_TOKENS,
  type DocumentTemplate,
} from '../utils/document-templates';
import {
  generateDocxBlobFromMarkdown,
  triggerFileDownload,
  printHtmlDocument,
} from '../utils/docx-generator';
import { CreateDocumentTemplateModal } from '../components/CreateDocumentTemplateModal';
import { FormattedDocumentPreview } from '../components/FormattedDocumentPreview';
import { playNotificationSound } from '../utils/live-alerts';

export const ReportsView: React.FC = () => {
  const {
    cases,
    clients,
    commitments,
    fetchCases,
    fetchClients,
    fetchCommitments,
    consultantProfile,
    addNotification,
  } = useStore();

  // Active top section
  const [activeMainTab, setActiveMainTab] = useState<'templates' | 'weekly'>('templates');

  // Templates state
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-diagnostico');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [templateContent, setTemplateContent] = useState<string>('');
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [editorMode, setEditorMode] = useState<'split' | 'preview' | 'edit'>('split');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const editorSectionRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Weekly Report state
  const [weeklyPeriod, setWeeklyPeriod] = useState('Semana en Curso');
  const [weeklyMarkdown, setWeeklyMarkdown] = useState('');
  const [copiedWeekly, setCopiedWeekly] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchCases();
    fetchCommitments();
    const loaded = loadSavedDocumentTemplates();
    setTemplates(loaded);
  }, []);

  // Sync selected template content when template changes
  useEffect(() => {
    const tmpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (tmpl) {
      setTemplateContent(tmpl.content);
      setTemplateTitle(tmpl.title);
    }
  }, [selectedTemplateId, templates]);

  // If clients load and none selected, auto-select first client if available
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients]);

  // Filter cases for the selected client
  const clientCases = cases.filter((c) => (selectedClientId ? c.client_id === selectedClientId : true));

  // If client changes, pick first matching case
  useEffect(() => {
    if (clientCases.length > 0 && (!selectedCaseId || !clientCases.some((c) => c.id === selectedCaseId))) {
      setSelectedCaseId(clientCases[0].id);
    } else if (clientCases.length === 0) {
      setSelectedCaseId('');
    }
  }, [selectedClientId, cases]);

  // Selected entities
  const currentClient = clients.find((c) => c.id === selectedClientId) || null;
  const currentCase = cases.find((c) => c.id === selectedCaseId) || null;
  const caseCommitments = commitments.filter((c) => (selectedCaseId ? c.case_id === selectedCaseId : true));
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Rendered document with dynamic values replaced
  const renderedDocument = injectTemplateTokens(templateContent, {
    client: currentClient,
    currentCase,
    commitments: caseCommitments,
    consultantProfile,
  });

  // Rebuild weekly report
  useEffect(() => {
    const activeCases = cases.filter((c) => c.status !== 'closed');
    const criticalCases = cases.filter((c) => c.status !== 'closed' && c.priority === 'critical');
    const completedCommitments = commitments.filter((c) => c.status === 'done');
    const pendingCommitments = commitments.filter((c) => c.status !== 'done' && c.owner === 'me');
    const waitingCommitments = commitments.filter((c) => c.status !== 'done' && c.owner !== 'me');

    const md = buildWeeklyReport({
      periodTitle: weeklyPeriod,
      activeCases,
      criticalCases,
      completedCommitments,
      pendingCommitments,
      waitingCommitments,
      consultantName: consultantProfile.name,
      consultantRole: `${consultantProfile.role_title} • ${consultantProfile.company}`,
    });

    setWeeklyMarkdown(md);
  }, [cases, commitments, weeklyPeriod, consultantProfile]);

  // Export handlers
  const handleExportDocx = async (targetContent?: string, customTitle?: string) => {
    try {
      setIsExportingDocx(true);
      const title = customTitle || currentTemplate?.title || 'Documento de Consultoría';
      const contentToExport = targetContent || renderedDocument;
      const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;

      const blob = await generateDocxBlobFromMarkdown(contentToExport, title);
      triggerFileDownload(blob, filename);
      playNotificationSound('success');

      addNotification({
        title: 'Documento Word (.docx) Exportado',
        message: `El archivo "${filename}" se descargó exitosamente listo para Word.`,
        type: 'success',
      });
    } catch (err: any) {
      alert('Error al exportar documento Word: ' + err.message);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handlePrintPdf = (contentToPrint?: string, customTitle?: string) => {
    const title = customTitle || currentTemplate?.title || 'Documento';
    playNotificationSound('info');
    printHtmlDocument(contentToPrint || renderedDocument, title);
  };

  const handleCopyDoc = () => {
    navigator.clipboard.writeText(renderedDocument);
    setCopiedDoc(true);
    playNotificationSound('success');
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleExportWeeklyDocx = async () => {
    try {
      const blob = await generateDocxBlobFromMarkdown(weeklyMarkdown, 'Informe Ejecutivo de Productividad');
      triggerFileDownload(blob, `informe_ejecutivo_${new Date().toISOString().split('T')[0]}.docx`);
      playNotificationSound('success');
    } catch (err: any) {
      alert('Error al exportar informe Word: ' + err.message);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla personalizada?')) {
      deleteCustomDocumentTemplate(id);
      const updated = loadSavedDocumentTemplates();
      setTemplates(updated);
      setSelectedTemplateId('tmpl-diagnostico');
      playNotificationSound('info');
    }
  };

  const handleSelectAndScrollToEdit = (template: DocumentTemplate) => {
    setSelectedTemplateId(template.id);
    setTemplateContent(template.content);
    setTemplateTitle(template.title);
    setEditorMode('split');
    playNotificationSound('info');

    // Smooth scroll down to the editor section
    setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      textareaRef.current?.focus();
    }, 150);
  };

  const handleSaveTemplateChanges = () => {
    if (!templateContent.trim()) {
      alert('El contenido no puede estar vacío.');
      return;
    }

    setIsSavingTemplate(true);
    try {
      updateCustomDocumentTemplate(selectedTemplateId, {
        title: templateTitle.trim() || currentTemplate?.title,
        content: templateContent,
      });

      const updated = loadSavedDocumentTemplates();
      setTemplates(updated);
      playNotificationSound('success');
      addNotification({
        title: 'Plantilla Actualizada',
        message: `Los cambios en "${templateTitle || currentTemplate?.title}" fueron guardados.`,
        type: 'success',
      });
    } catch (err: any) {
      alert('Error al guardar plantilla: ' + err.message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Filter templates list
  const filteredTemplates = templates.filter((t) => {
    if (filterCategory === 'all') return true;
    return t.category === filterCategory;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Centro de Documentos & Plantillas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Generación, autocompletado y exportación de documentos oficiales en Word (.docx) y PDF
          </p>
        </div>

        {/* Workspace Mode Switcher */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-main)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className={`btn-ghost ${activeMainTab === 'templates' ? 'active' : ''}`}
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: activeMainTab === 'templates' ? 700 : 500,
              backgroundColor: activeMainTab === 'templates' ? 'var(--bg-surface)' : 'transparent',
              color: activeMainTab === 'templates' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => setActiveMainTab('templates')}
          >
            <FileText size={15} /> 1. Plantillas Word & PDF
          </button>
          <button
            type="button"
            className={`btn-ghost ${activeMainTab === 'weekly' ? 'active' : ''}`}
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: activeMainTab === 'weekly' ? 700 : 500,
              backgroundColor: activeMainTab === 'weekly' ? 'var(--bg-surface)' : 'transparent',
              color: activeMainTab === 'weekly' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => setActiveMainTab('weekly')}
          >
            <FileBarChart2 size={15} /> 2. Informe Ejecutivo Periódico
          </button>
        </div>
      </div>

      {activeMainTab === 'templates' ? (
        /* ══════════════════════════════════════════════════════════ */
        /*  PESTAÑA 1: TABLA DE PLANTILLAS + WORKSPACE DE REDACCIÓN   */
        /* ══════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* ─── 1. TABLA DE DOCUMENTOS Y PLANTILLAS DISPONIBLES ─── */}
          <div className="glass-card" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                    Librería de Plantillas y Documentos
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Selecciona una plantilla para redactar o presiona Editar para personalizar su contenido
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                >
                  <option value="all">Todas las Categorías ({templates.length})</option>
                  <option value="Diagnóstico">Diagnóstico</option>
                  <option value="Minutas">Minutas</option>
                  <option value="Propuestas">Propuestas</option>
                  <option value="Cierre">Cierre</option>
                  <option value="Cartas">Cartas</option>
                  <option value="Personalizado">Personalizadas</option>
                </select>

                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus size={15} /> + Nueva Plantilla
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700 }}>Categoría</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700 }}>Título de la Plantilla</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700 }}>Descripción / Uso</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>Tipo</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((t) => {
                    const isSelected = t.id === selectedTemplateId;

                    return (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: isSelected ? 'var(--accent-glow)' : 'transparent',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span
                            style={{
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--accent-primary)',
                            }}
                          >
                            {t.category}
                          </span>
                        </td>

                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {t.title}
                        </td>

                        <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)', fontSize: '0.76rem', maxWidth: '300px' }}>
                          {t.description}
                        </td>

                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          {t.isDefault ? (
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Oficial</span>
                          ) : (
                            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>Personalizada</span>
                          )}
                        </td>

                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className={isSelected ? 'btn-primary' : 'btn-secondary'}
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                              onClick={() => {
                                setSelectedTemplateId(t.id);
                                setTemplateContent(t.content);
                                setTemplateTitle(t.title);
                                playNotificationSound('info');
                              }}
                            >
                              <Check size={12} /> {isSelected ? 'Activa' : 'Seleccionar'}
                            </button>

                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                              onClick={() => handleSelectAndScrollToEdit(t)}
                              title="Editar el contenido de esta plantilla"
                            >
                              <Edit3 size={12} /> Editar
                            </button>

                            {!t.isDefault && (
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem', color: 'var(--status-critical)' }}
                                onClick={() => handleDeleteTemplate(t.id)}
                                title="Eliminar plantilla"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 2. BARRA DE AUTOCOMPLETADO & DATOS DINÁMICOS ─── */}
          <div ref={editorSectionRef} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Generador de Documento: {currentTemplate?.title || 'Documento'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem' }}
                  onClick={handleCopyDoc}
                >
                  {copiedDoc ? <Check size={14} /> : <Copy size={14} />}
                  {copiedDoc ? '¡Copiado!' : 'Copiar Texto'}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handlePrintPdf()}
                >
                  <Printer size={14} /> Exportar PDF / Imprimir
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.78rem', backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' }}
                  onClick={() => handleExportDocx()}
                  disabled={isExportingDocx}
                >
                  <Download size={14} />
                  {isExportingDocx ? 'Generando Word...' : 'Descargar Word (.docx)'}
                </button>
              </div>
            </div>

            {/* Inyección de Datos: Cliente y Caso */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', backgroundColor: 'var(--bg-surface-elevated)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  🏢 Inyectar Datos de Cliente:
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  {clients.length === 0 ? (
                    <option value="">(No hay clientes registrados)</option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''} {c.complexity_evaluated ? `[${c.complexity_evaluated}]` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  💼 Inyectar Datos de Caso / Proyecto:
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  {clientCases.length === 0 ? (
                    <option value="">(Sin casos específicos para este cliente)</option>
                  ) : (
                    clientCases.map((cs) => (
                      <option key={cs.id} value={cs.id}>
                        {cs.title} [{cs.priority}]
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Consultor asignado: <strong style={{ color: 'var(--text-primary)' }}>{consultantProfile.name || 'Sin configurar'}</strong>
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Compromisos a incluir: <strong style={{ color: 'var(--accent-primary)' }}>{caseCommitments.length} acuerdos</strong>
                </span>
              </div>
            </div>
          </div>

          {/* ─── 3. WORKSPACE: EDITOR & PREVISUALIZADOR REAL DE DOCUMENTO ─── */}
          <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                className={`btn-ghost ${editorMode === 'split' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setEditorMode('split')}
              >
                <Layers size={13} /> Vista Dividida (Editor + Hoja Real)
              </button>
              <button
                type="button"
                className={`btn-ghost ${editorMode === 'preview' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setEditorMode('preview')}
              >
                <Eye size={13} /> Solo Hoja de Documento
              </button>
              <button
                type="button"
                className={`btn-ghost ${editorMode === 'edit' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setEditorMode('edit')}
              >
                <Edit3 size={13} /> Solo Editor de Texto
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                onClick={handleSaveTemplateChanges}
                disabled={isSavingTemplate}
              >
                <Save size={13} /> {isSavingTemplate ? 'Guardando...' : 'Guardar Cambios en Plantilla'}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                editorMode === 'split' ? '1fr 1.25fr' : '1fr',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* LEFT PANE: Editor with Token Palette */}
            {(editorMode === 'split' || editorMode === 'edit') && (
              <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Editor de Plantilla
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Haz clic en una variable para insertarla
                  </span>
                </div>

                {/* Variable Token Quick Palette */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.3rem',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    maxHeight: '95px',
                    overflowY: 'auto',
                  }}
                >
                  {AVAILABLE_TOKENS.map((t) => (
                    <button
                      key={t.token}
                      type="button"
                      title={t.description}
                      onClick={() => {
                        if (!textareaRef.current) {
                          setTemplateContent((prev) => prev + ' ' + t.token);
                          return;
                        }
                        const start = textareaRef.current.selectionStart;
                        const end = textareaRef.current.selectionEnd;
                        const current = templateContent;
                        const updated = current.substring(0, start) + t.token + current.substring(end);
                        setTemplateContent(updated);
                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.focus();
                            textareaRef.current.selectionStart = start + t.token.length;
                            textareaRef.current.selectionEnd = start + t.token.length;
                          }
                        }, 0);
                      }}
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '3px',
                        fontSize: '0.68rem',
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
                  rows={24}
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    lineHeight: 1.55,
                    resize: 'vertical',
                  }}
                />
              </div>
            )}

            {/* RIGHT PANE: Real Formatted Document Sheet */}
            {(editorMode === 'split' || editorMode === 'preview') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Previsualización Real (Hoja Word / PDF con Formato Oficial)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--status-low)', fontWeight: 700 }}>
                    ● Renderizado en vivo con datos reales
                  </span>
                </div>

                <FormattedDocumentPreview
                  markdownContent={renderedDocument}
                  docTitle={currentTemplate?.title || 'Documento'}
                  docCategory={currentTemplate?.category}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════ */
        /*  PESTAÑA 2: INFORME EJECUTIVO SEMANAL / MENSUAL            */
        /* ══════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header & Options */}
          <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={18} color="var(--accent-primary)" />
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Período del Reporte:
              </label>
              <input
                type="text"
                value={weeklyPeriod}
                onChange={(e) => setWeeklyPeriod(e.target.value)}
                placeholder="Ej. Semana del 1 al 7 de Septiembre"
                style={{ width: '280px', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={() => {
                  navigator.clipboard.writeText(weeklyMarkdown);
                  setCopiedWeekly(true);
                  setTimeout(() => setCopiedWeekly(false), 2000);
                }}
              >
                {copiedWeekly ? <Check size={14} /> : <Copy size={14} />}
                {copiedWeekly ? '¡Copiado!' : 'Copiar Markdown'}
              </button>

              <button
                className="btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={() => printHtmlDocument(weeklyMarkdown, 'Informe Ejecutivo')}
              >
                <Printer size={14} /> Imprimir / PDF
              </button>

              <button
                className="btn-primary"
                style={{ fontSize: '0.78rem', backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' }}
                onClick={handleExportWeeklyDocx}
              >
                <Download size={14} /> Descargar Word (.docx)
              </button>
            </div>
          </div>

          {/* Formatted Preview Sheet for Weekly Report */}
          <FormattedDocumentPreview
            markdownContent={weeklyMarkdown}
            docTitle="Informe Ejecutivo de Productividad"
            docCategory="Reportes"
          />
        </div>
      )}

      {/* Create / Upload Custom Template Modal */}
      <CreateDocumentTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newTmpl) => {
          const updated = loadSavedDocumentTemplates();
          setTemplates(updated);
          setSelectedTemplateId(newTmpl.id);
          setTemplateContent(newTmpl.content);
          setTemplateTitle(newTmpl.title);
          addNotification({
            title: 'Plantilla Guardada',
            message: `La plantilla "${newTmpl.title}" fue agregada a tu librería de documentos.`,
            type: 'success',
          });
          setTimeout(() => {
            editorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }}
      />
    </div>
  );
};
