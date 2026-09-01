import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import {
  FileBarChart2,
  Download,
  Printer,
  Copy,
  Check,
  Plus,
  Sparkles,
  Trash2,
  Calendar,
  Edit3,
  BookOpen,
  Save,
  ArrowLeft,
  Search,
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

type DocumentCenterTab = 'library' | 'generator' | 'editor' | 'weekly';

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

  // Active Screen Tab
  const [activeTab, setActiveTab] = useState<DocumentCenterTab>('library');

  // Templates state
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-diagnostico');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Editor screen state
  const [editingTemplateId, setEditingTemplateId] = useState<string>('tmpl-diagnostico');
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<DocumentTemplate['category']>('Diagnóstico');
  const [editingContent, setEditingContent] = useState<string>('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Modals & export state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Sync editor fields when editing template changes
  useEffect(() => {
    const tmpl = templates.find((t) => t.id === editingTemplateId) || templates[0];
    if (tmpl) {
      setEditingTitle(tmpl.title);
      setEditingDescription(tmpl.description);
      setEditingCategory(tmpl.category);
      setEditingContent(tmpl.content);
    }
  }, [editingTemplateId, templates]);

  // If clients load and none selected, auto-select first client
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

  // Selected entities for Generator
  const currentClient = clients.find((c) => c.id === selectedClientId) || null;
  const currentCase = cases.find((c) => c.id === selectedCaseId) || null;
  const caseCommitments = commitments.filter((c) => (selectedCaseId ? c.case_id === selectedCaseId : true));
  const activeGeneratorTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Rendered document with dynamic values replaced
  const renderedDocument = injectTemplateTokens(activeGeneratorTemplate?.content || '', {
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

  // Actions
  const handleExportDocx = async (targetContent?: string, customTitle?: string) => {
    try {
      setIsExportingDocx(true);
      const title = customTitle || activeGeneratorTemplate?.title || 'Documento de Consultoría';
      const contentToExport = targetContent || renderedDocument;
      const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;

      const blob = await generateDocxBlobFromMarkdown(contentToExport, title);
      triggerFileDownload(blob, filename);
      playNotificationSound('success');

      addNotification({
        title: 'Documento Word (.docx) Exportado',
        message: `El archivo "${filename}" se descargó exitosamente listo para Microsoft Word.`,
        type: 'success',
      });
    } catch (err: any) {
      alert('Error al exportar documento Word: ' + err.message);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handlePrintPdf = (contentToPrint?: string, customTitle?: string) => {
    const title = customTitle || activeGeneratorTemplate?.title || 'Documento';
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

  const handleGoToGenerator = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveTab('generator');
    playNotificationSound('info');
  };

  const handleGoToEditor = (templateId: string) => {
    setEditingTemplateId(templateId);
    setActiveTab('editor');
    playNotificationSound('info');
  };

  const handleSaveEditorChanges = () => {
    if (!editingContent.trim()) {
      alert('El contenido no puede estar vacío.');
      return;
    }

    setIsSavingTemplate(true);
    try {
      updateCustomDocumentTemplate(editingTemplateId, {
        title: editingTitle.trim() || 'Plantilla Sin Título',
        description: editingDescription.trim(),
        category: editingCategory,
        content: editingContent,
      });

      const updated = loadSavedDocumentTemplates();
      setTemplates(updated);
      playNotificationSound('success');

      addNotification({
        title: 'Plantilla Guardada',
        message: `Los cambios en "${editingTitle}" se guardaron exitosamente.`,
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
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesSearch =
      !searchFilter.trim() ||
      t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Main Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Centro de Documentos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Catálogo de plantillas, redactor con autocompletado y editor especializado de formatos Word y PDF
          </p>
        </div>

        {/* 4 Dedicated Screens / Tabs */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-main)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.2rem' }}>
          <button
            type="button"
            className={`btn-ghost ${activeTab === 'library' ? 'active' : ''}`}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'library' ? 700 : 500,
              backgroundColor: activeTab === 'library' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'library' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => setActiveTab('library')}
          >
            <BookOpen size={14} /> 1. Librería de Plantillas
          </button>

          <button
            type="button"
            className={`btn-ghost ${activeTab === 'generator' ? 'active' : ''}`}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'generator' ? 700 : 500,
              backgroundColor: activeTab === 'generator' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'generator' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => setActiveTab('generator')}
          >
            <Sparkles size={14} /> 2. Generar & Previsualizar
          </button>

          <button
            type="button"
            className={`btn-ghost ${activeTab === 'editor' ? 'active' : ''}`}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'editor' ? 700 : 500,
              backgroundColor: activeTab === 'editor' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'editor' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => setActiveTab('editor')}
          >
            <Edit3 size={14} /> 3. Editor de Plantillas
          </button>

          <button
            type="button"
            className={`btn-ghost ${activeTab === 'weekly' ? 'active' : ''}`}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'weekly' ? 700 : 500,
              backgroundColor: activeTab === 'weekly' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'weekly' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => setActiveTab('weekly')}
          >
            <FileBarChart2 size={14} /> 4. Informe Ejecutivo
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/*  PANTALLA 1: TABLA Y CATÁLOGO DE PLANTILLAS                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'library' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                    Catálogo de Plantillas Corporativas
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {templates.length} formatos oficiales y personalizados disponibles para redactar y exportar
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Buscar plantilla..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{ paddingLeft: '2rem', fontSize: '0.8rem', width: '200px' }}
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  <option value="all">Todas las Categorías ({templates.length})</option>
                  <option value="Diagnóstico">Diagnóstico</option>
                  <option value="Minutas">Minutas</option>
                  <option value="Propuestas">Propuestas</option>
                  <option value="Cierre">Cierre</option>
                  <option value="Cartas">Cartas</option>
                  <option value="Personalizado">Personalizadas</option>
                </select>

                {/* Create / Upload Word Button */}
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus size={15} /> + Nueva Plantilla / Subir Word (.docx)
                </button>
              </div>
            </div>

            {/* Main Templates Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Categoría</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Nombre del Formato / Plantilla</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Descripción de Uso</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>Tipo</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron plantillas coincidentes.
                      </td>
                    </tr>
                  ) : (
                    filteredTemplates.map((t, idx) => {
                      return (
                        <tr
                          key={t.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)',
                            transition: 'background-color 0.15s',
                          }}
                        >
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backgroundColor: 'var(--accent-glow)',
                                color: 'var(--accent-primary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {t.category}
                            </span>
                          </td>

                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                            {t.title}
                          </td>

                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.78rem', maxWidth: '340px' }}>
                            {t.description}
                          </td>

                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>
                            {t.isDefault ? (
                              <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>Oficial</span>
                            ) : (
                              <span className="badge badge-low" style={{ fontSize: '0.68rem' }}>Personalizada</span>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              {/* Redactar y Generar */}
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
                                onClick={() => handleGoToGenerator(t.id)}
                              >
                                <Sparkles size={13} /> Redactar
                              </button>

                              {/* Editar Plantilla */}
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
                                onClick={() => handleGoToEditor(t.id)}
                                title="Editar la estructura y texto de esta plantilla"
                              >
                                <Edit3 size={13} /> Editar
                              </button>

                              {!t.isDefault && (
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ padding: '0.3rem 0.45rem', fontSize: '0.74rem', color: 'var(--status-critical)' }}
                                  onClick={() => handleDeleteTemplate(t.id)}
                                  title="Eliminar plantilla personalizada"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/*  PANTALLA 2: GENERADOR & REDACTOR CON AUTOCOMPLETADO Y HOJA REAL     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'generator' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Action Ribbon & Navigation */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                onClick={() => setActiveTab('library')}
              >
                <ArrowLeft size={14} /> Volver a Librería
              </button>

              <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Plantilla Activa:
                </span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  style={{ fontSize: '0.82rem', fontWeight: 700, padding: '0.35rem 0.65rem' }}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.category}] {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Export Controls */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={() => handleGoToEditor(selectedTemplateId)}
              >
                <Edit3 size={14} /> Modificar Plantilla Base
              </button>

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

          {/* Dynamic Data Injection Card */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                Inyección de Datos Dinámicos al Documento
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  🏢 Seleccionar Cliente / Razón Social:
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.84rem' }}
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
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  💼 Seleccionar Caso / Proyecto Vinculado:
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.84rem' }}
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

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'var(--bg-surface-elevated)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Consultor asignado: <strong style={{ color: 'var(--text-primary)' }}>{consultantProfile.name || 'Sin configurar'}</strong>
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Compromisos a inyectar: <strong style={{ color: 'var(--accent-primary)' }}>{caseCommitments.length} acuerdos</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Real Formatted Document Sheet Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Previsualización de Documento Formal (Renderizado Oficial)
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--status-low)', fontWeight: 700 }}>
                ● Todos los marcadores dinámicos resueltos en vivo
              </span>
            </div>

            <FormattedDocumentPreview
              markdownContent={renderedDocument}
              docTitle={activeGeneratorTemplate?.title || 'Documento'}
              docCategory={activeGeneratorTemplate?.category}
            />
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/*  PANTALLA 3: EDITOR Y DISEÑADOR DE PLANTILLAS                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'editor' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Top Bar for Editor */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                onClick={() => setActiveTab('library')}
              >
                <ArrowLeft size={14} /> Volver a Librería
              </button>

              <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Editando Plantilla:
                </span>
                <select
                  value={editingTemplateId}
                  onChange={(e) => setEditingTemplateId(e.target.value)}
                  style={{ fontSize: '0.82rem', fontWeight: 700, padding: '0.35rem 0.65rem' }}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.category}] {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Editor Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={() => handleGoToGenerator(editingTemplateId)}
              >
                <Sparkles size={14} /> Probar en Generador →
              </button>

              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.78rem' }}
                onClick={handleSaveEditorChanges}
                disabled={isSavingTemplate}
              >
                <Save size={14} /> {isSavingTemplate ? 'Guardando...' : 'Guardar Cambios en Plantilla'}
              </button>
            </div>
          </div>

          {/* Form & Editor Layout */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Metadata Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Título de la Plantilla
                </label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  placeholder="Ej. Minuta Ejecutiva de Reunión"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Categoría
                </label>
                <select
                  value={editingCategory}
                  onChange={(e) => setEditingCategory(e.target.value as any)}
                  style={{ width: '100%', fontSize: '0.84rem' }}
                >
                  <option value="Diagnóstico">Diagnóstico</option>
                  <option value="Minutas">Minutas</option>
                  <option value="Propuestas">Propuestas</option>
                  <option value="Cierre">Cierre</option>
                  <option value="Cartas">Cartas</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Descripción de Uso
                </label>
                <input
                  type="text"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  placeholder="Breve explicación del propósito de este documento..."
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>
            </div>

            {/* Variable Insertion Palette */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Marcadores Dinámicos Disponibles (Haz clic para insertar en el cursor):
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Soporta encabezados (#), tablas Markdown (|), negritas (**), y citas (&gt;)
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.35rem',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '110px',
                  overflowY: 'auto',
                }}
              >
                {AVAILABLE_TOKENS.map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    title={t.description}
                    onClick={() => {
                      if (!editorTextareaRef.current) {
                        setEditingContent((prev) => prev + ' ' + t.token);
                        return;
                      }
                      const start = editorTextareaRef.current.selectionStart;
                      const end = editorTextareaRef.current.selectionEnd;
                      const current = editingContent;
                      const updated = current.substring(0, start) + t.token + current.substring(end);
                      setEditingContent(updated);
                      setTimeout(() => {
                        if (editorTextareaRef.current) {
                          editorTextareaRef.current.focus();
                          editorTextareaRef.current.selectionStart = start + t.token.length;
                          editorTextareaRef.current.selectionEnd = start + t.token.length;
                        }
                      }, 0);
                    }}
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
            </div>

            {/* Split Editor and Live Syntax View */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
              {/* Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Código Fuente de la Plantilla
                </label>
                <textarea
                  ref={editorTextareaRef}
                  rows={26}
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '0.84rem',
                    lineHeight: 1.6,
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Formatted Preview Side */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Estructura Visual Preliminar
                </label>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <FormattedDocumentPreview
                    markdownContent={editingContent}
                    docTitle={editingTitle || 'Plantilla'}
                    docCategory={editingCategory}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/*  PANTALLA 4: INFORME EJECUTIVO SEMANAL / MENSUAL                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'weekly' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header & Options */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
          setEditingTemplateId(newTmpl.id);
          addNotification({
            title: 'Plantilla Agregada',
            message: `La plantilla "${newTmpl.title}" fue añadida a tu catálogo de documentos.`,
            type: 'success',
          });
        }}
      />
    </div>
  );
};
