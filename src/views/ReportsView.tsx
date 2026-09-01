import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { buildWeeklyReport } from '../utils/report-builder';
import {
  loadSavedDocumentTemplates,
  injectTemplateTokens,
  deleteCustomDocumentTemplate,
  AVAILABLE_TOKENS,
  type DocumentTemplate,
} from '../utils/document-templates';
import {
  generateDocxBlobFromMarkdown,
  triggerFileDownload,
  printHtmlDocument,
} from '../utils/docx-generator';
import { CreateDocumentTemplateModal } from '../components/CreateDocumentTemplateModal';
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [editorMode, setEditorMode] = useState<'split' | 'preview' | 'edit'>('split');

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
  const handleExportDocx = async () => {
    try {
      setIsExportingDocx(true);
      const currentTmpl = templates.find((t) => t.id === selectedTemplateId);
      const title = currentTmpl?.title || 'Documento de Consultoría';
      const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;

      const blob = await generateDocxBlobFromMarkdown(renderedDocument, title);
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

  const handlePrintPdf = () => {
    const currentTmpl = templates.find((t) => t.id === selectedTemplateId);
    const title = currentTmpl?.title || 'Documento';
    playNotificationSound('info');
    printHtmlDocument(renderedDocument, title);
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Centro de Documentos & Informes
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Generación y exportación de documentos ejecutivos en Word (.docx) y PDF con datos dinámicos
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
        /*  PESTAÑA 1: GENERADOR DE DOCUMENTOS CON PLANTILLAS WORD/PDF */
        /* ══════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Control Bar: Template Selector + Client/Case Binding */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Configuración de Autocompletado Dinámico
                </span>
              </div>

              <button
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={14} /> + Nueva / Subir Plantilla
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {/* Template Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  📄 Plantilla de Documento:
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.category}] {t.title} {t.isDefault ? '' : '★'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  🏢 Cliente / Organización:
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

              {/* Case Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  💼 Caso / Proyecto Vinculado:
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
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            {/* View layout toggle */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                className={`btn-ghost ${editorMode === 'split' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setEditorMode('split')}
              >
                <Layers size={13} /> Vista Dividida
              </button>
              <button
                type="button"
                className={`btn-ghost ${editorMode === 'preview' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setEditorMode('preview')}
              >
                <Eye size={13} /> Solo Vista Previa
              </button>
              <button
                type="button"
                className={`btn-ghost ${editorMode === 'edit' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setEditorMode('edit')}
              >
                <Edit3 size={13} /> Solo Editor
              </button>
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                onClick={handlePrintPdf}
              >
                <Printer size={14} /> Exportar PDF / Imprimir
              </button>

              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.78rem', backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' }}
                onClick={handleExportDocx}
                disabled={isExportingDocx}
              >
                <Download size={14} />
                {isExportingDocx ? 'Generando Word...' : 'Descargar Word (.docx)'}
              </button>
            </div>
          </div>

          {/* Document Workspace Area */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                editorMode === 'split' ? '1fr 1.2fr' : '1fr',
              gap: '1.25rem',
              alignItems: 'start',
            }}
          >
            {/* LEFT PANE: Markdown / Variables Editor */}
            {(editorMode === 'split' || editorMode === 'edit') && (
              <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Editor de Plantilla (Marcadores Dinámicos)
                  </span>
                  {templates.find((t) => t.id === selectedTemplateId && !t.isDefault) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(selectedTemplateId)}
                      style={{ background: 'transparent', color: 'var(--status-critical)', padding: '0.2rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Trash2 size={13} /> Eliminar plantilla
                    </button>
                  )}
                </div>

                {/* Variable Token Quick Palette */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.3rem',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    maxHeight: '90px',
                    overflowY: 'auto',
                  }}
                >
                  {AVAILABLE_TOKENS.slice(0, 10).map((t) => (
                    <button
                      key={t.token}
                      type="button"
                      title={t.description}
                      onClick={() => setTemplateContent((prev) => prev + ' ' + t.token)}
                      style={{
                        padding: '0.15rem 0.4rem',
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
                  rows={20}
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

            {/* RIGHT PANE: Rendered Executive Document Sheet */}
            {(editorMode === 'split' || editorMode === 'preview') && (
              <div
                className="glass-card"
                style={{
                  padding: '2rem',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-md)',
                  minHeight: '600px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a', margin: 0 }}>
                      WorkDesk • Consultoría Operativa
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Documento Oficial de Trabajo
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                    {new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div style={{ fontSize: '0.86rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {renderedDocument}
                </div>
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

          {/* Preview Sheet */}
          <div
            className="glass-card"
            style={{
              padding: '2.5rem',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #cbd5e1',
            }}
          >
            <div style={{ fontSize: '0.86rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
              {weeklyMarkdown}
            </div>
          </div>
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
          addNotification({
            title: 'Plantilla Guardada',
            message: `La plantilla "${newTmpl.title}" fue agregada a tu librería de documentos.`,
            type: 'success',
          });
        }}
      />
    </div>
  );
};
