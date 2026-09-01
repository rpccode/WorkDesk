import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  parseClientSpreadsheet,
  generateClientTemplateExcel,
  generateClientTemplateCsv,
  SAMPLE_CLIENTS_MATRIX,
  type ImportValidationResult,
} from '../utils/excel-importer';
import { playNotificationSound } from '../utils/live-alerts';

interface BulkImportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

export const BulkImportClientsModal: React.FC<BulkImportClientsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { clients, createClient, updateClient, fetchClients, addNotification } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [_selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ImportValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importDuplicates, setImportDuplicates] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadExcelTemplate = () => {
    try {
      generateClientTemplateExcel();
      playNotificationSound('success');
      setDownloadFeedback('¡Plantilla Excel descargada! Búscala en tu carpeta de Descargas.');
      addNotification({
        title: 'Plantilla Excel Descargada',
        message: 'Se descargó "plantilla_matriz_clientes_workdesk.xlsx". Ábrela, edita tus clientes y arrástrala aquí.',
        type: 'success',
      });
      setTimeout(() => setDownloadFeedback(null), 5000);
    } catch (err: any) {
      setErrorMessage('Error al generar plantilla Excel: ' + err.message);
    }
  };

  const handleDownloadCsvTemplate = () => {
    try {
      generateClientTemplateCsv();
      playNotificationSound('success');
      setDownloadFeedback('¡Plantilla CSV descargada! Búscala en tu carpeta de Descargas.');
      addNotification({
        title: 'Plantilla CSV Descargada',
        message: 'Se descargó "plantilla_matriz_clientes_workdesk.csv". Ábrela, edita tus clientes y arrástrala aquí.',
        type: 'success',
      });
      setTimeout(() => setDownloadFeedback(null), 5000);
    } catch (err: any) {
      setErrorMessage('Error al generar plantilla CSV: ' + err.message);
    }
  };

  const handleLoadDemoDataset = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    try {
      let count = 0;
      for (const c of SAMPLE_CLIENTS_MATRIX) {
        await createClient({
          name: c.Cliente,
          complexity_weighted: c['Complejidad Ponderada'] as any,
          complexity_evaluated: c['Complejidad Evaluada'] as any,
          ticket_avg: c['Ticket Promedio'],
          category: c['Categoría'],
          branches_count: c['Cantidad Sucursales'],
          employees_count: c['Empleados'],
          systems_count: c['Cantidad de sistemas'],
          has_it_department: c['Depto. TI'].toLowerCase() === 'si',
        });
        count++;
      }
      await fetchClients();
      playNotificationSound('success');
      setImportedCount(count);
      addNotification({
        title: 'Matriz de Clientes Importada',
        message: `Se importaron ${count} cuentas corporativas con diagnóstico de complejidad.`,
        type: 'success',
      });
      if (onSuccess) onSuccess(count);
    } catch (err: any) {
      setErrorMessage('Error al cargar clientes modelo: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsLoading(true);
    setErrorMessage(null);
    setParseResult(null);

    try {
      const result = await parseClientSpreadsheet(file, clients);
      setParseResult(result);
      // If all rows are detected as existing duplicates, default to importing/updating them
      if (result.validCount === 0 && result.duplicateCount > 0) {
        setImportDuplicates(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al leer el archivo Excel/CSV.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;

    const rowsToImport = parseResult.rows.filter((r) => {
      if (!r.isValid) return false;
      if (r.isDuplicate && !importDuplicates) return false;
      return true;
    });

    if (rowsToImport.length === 0) {
      setErrorMessage('No hay clientes seleccionados para importar.');
      return;
    }

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const row of rowsToImport) {
        // If client already exists by name, update and enrich its corporate profile
        const existing = clients.find(
          (c) => c.name.toLowerCase().trim() === row.name.toLowerCase().trim()
        );

        if (existing) {
          await updateClient({
            id: existing.id,
            name: row.name,
            company: row.company || existing.company || undefined,
            email: row.email || existing.email || undefined,
            phone: row.phone || existing.phone || undefined,
            status: row.status || existing.status,
            category: row.category || existing.category || undefined,
            complexity_weighted: row.complexity_weighted || existing.complexity_weighted || undefined,
            complexity_evaluated: row.complexity_evaluated || existing.complexity_evaluated || undefined,
            ticket_avg: row.ticket_avg !== undefined ? row.ticket_avg : (existing.ticket_avg ?? undefined),
            branches_count: row.branches_count !== undefined ? row.branches_count : (existing.branches_count ?? undefined),
            employees_count: row.employees_count !== undefined ? row.employees_count : (existing.employees_count ?? undefined),
            systems_count: row.systems_count !== undefined ? row.systems_count : (existing.systems_count ?? undefined),
            has_it_department: row.has_it_department !== undefined ? row.has_it_department : (existing.has_it_department ?? undefined),
          });
        } else {
          await createClient({
            name: row.name,
            company: row.company,
            email: row.email,
            phone: row.phone,
            category: row.category,
            complexity_weighted: row.complexity_weighted,
            complexity_evaluated: row.complexity_evaluated,
            ticket_avg: row.ticket_avg,
            branches_count: row.branches_count,
            employees_count: row.employees_count,
            systems_count: row.systems_count,
            has_it_department: row.has_it_department,
          });
        }
        successCount++;
      }

      await fetchClients();
      playNotificationSound('success');
      setImportedCount(successCount);
      addNotification({
        title: 'Carga Masiva Exitosa',
        message: `Se procesaron e importaron ${successCount} clientes en la cartera.`,
        type: 'success',
      });
      if (onSuccess) onSuccess(successCount);
    } catch (err: any) {
      setErrorMessage('Error durante la importación: ' + (err.message || String(err)));
    } finally {
      setIsImporting(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setParseResult(null);
    setErrorMessage(null);
    setImportedCount(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          maxWidth: '920px',
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
        {/* Modal Header */}
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
                backgroundColor: 'rgba(5, 150, 105, 0.12)',
                color: '#059669',
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Carga Masiva de Clientes & Matriz de Complejidad
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Importa decenas o cientos de clientes con diagnóstico corporativo desde Excel (.xlsx, .xls) o CSV
              </p>
            </div>
          </div>

          <button
            className="btn-ghost"
            style={{ padding: '0.4rem', color: 'var(--text-muted)' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Success state */}
          {importedCount !== null ? (
            <div
              style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-low-bg)',
                  color: 'var(--status-low)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                ¡{importedCount} Clientes Importados con Éxito!
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '460px' }}>
                Los registros y su matriz de complejidad ya están disponibles en tu agenda, listos para crear casos, proyectos y compromisos.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button className="btn-secondary" onClick={resetModal}>
                  Importar otro archivo
                </button>
                <button className="btn-primary" onClick={onClose}>
                  Ver Clientes
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Download Notification Alert */}
              {downloadFeedback && (
                <div
                  className="animate-fade-in"
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--status-low-bg)',
                    border: '1px solid var(--status-low)',
                    color: 'var(--status-low)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                      {downloadFeedback}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDownloadFeedback(null)}
                    style={{ background: 'transparent', color: 'var(--status-low)', padding: '0.2rem' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Template Download & Quick Load Banner */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-glow)',
                  border: '1px solid rgba(37,99,235,0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Sparkles size={18} color="var(--accent-primary)" />
                  <div>
                    <h5 style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Planilla Modelo & Carga Rápida
                    </h5>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Descarga el formato con 9 columnas (Complejidad, Sucursales, Empleados, Depto TI, etc.) o carga los 17 clientes de prueba.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem' }}
                    onClick={handleLoadDemoDataset}
                    disabled={isImporting}
                  >
                    <Layers size={13} /> Cargar los 17 Clientes (Rudy)
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem' }}
                    onClick={handleDownloadExcelTemplate}
                  >
                    <Download size={13} /> Plantilla Excel (.xlsx)
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem' }}
                    onClick={handleDownloadCsvTemplate}
                  >
                    <Download size={13} /> Plantilla CSV (.csv)
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              {!parseResult && (
                <div
                  style={{
                    border: '2px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'border-color 0.2s',
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-glow)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UploadCloud size={26} />
                  </div>

                  <div>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                      {isLoading ? 'Leyendo archivo...' : 'Arrastra tu archivo aquí o haz clic para examinar'}
                    </p>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Formatos soportados: Microsoft Excel (.xlsx, .xls) o CSV (.csv)
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--status-critical-bg)',
                    border: '1px solid var(--status-critical-border)',
                    color: 'var(--status-critical)',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parseResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Summary Counters */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                    <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Leídos</span>
                      <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>{parseResult.totalRows}</p>
                    </div>

                    <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--status-low-bg)', border: '1px solid var(--status-low-border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--status-low)', fontWeight: 600 }}>Válidos</span>
                      <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--status-low)' }}>{parseResult.validCount}</p>
                    </div>

                    <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--status-medium-bg)', border: '1px solid var(--status-medium-border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--status-medium)', fontWeight: 600 }}>Duplicados</span>
                      <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--status-medium)' }}>{parseResult.duplicateCount}</p>
                    </div>

                    <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--status-critical-bg)', border: '1px solid var(--status-critical-border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--status-critical)', fontWeight: 600 }}>Inválidos</span>
                      <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--status-critical)' }}>{parseResult.invalidCount}</p>
                    </div>
                  </div>

                  {/* Duplicate Option */}
                  {parseResult.duplicateCount > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={importDuplicates}
                        onChange={(e) => setImportDuplicates(e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      Importar también los {parseResult.duplicateCount} registros identificados como posibles duplicados
                    </label>
                  )}

                  {/* Preview Rows Table */}
                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', zIndex: 2 }}>
                        <tr>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 700 }}>#</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 700 }}>Cliente</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 700 }}>Categoría</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 700 }}>Comp. Ponderada</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 700 }}>Comp. Evaluada</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>Tickets</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>Sucursales</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>Empleados</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>Sistemas</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>Depto TI</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>Validación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.rows.map((row) => {
                          const compW = row.complexity_weighted;
                          const compE = row.complexity_evaluated;

                          return (
                            <tr
                              key={row.rowIndex}
                              style={{
                                borderBottom: '1px solid var(--border-subtle)',
                                backgroundColor: !row.isValid
                                  ? 'var(--status-critical-bg)'
                                  : row.isDuplicate
                                  ? 'var(--status-medium-bg)'
                                  : undefined,
                              }}
                            >
                              <td style={{ padding: '0.45rem 0.6rem', color: 'var(--text-muted)' }}>{row.rowIndex}</td>
                              <td style={{ padding: '0.45rem 0.6rem', fontWeight: 700 }}>
                                {row.name || <span style={{ color: 'var(--status-critical)', fontStyle: 'italic' }}>Sin nombre</span>}
                              </td>
                              <td style={{ padding: '0.45rem 0.6rem' }}>{row.category || '—'}</td>
                              <td style={{ padding: '0.45rem 0.6rem' }}>
                                {compW ? (
                                  <span
                                    style={{
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      backgroundColor: compW === 'Alta' ? 'rgba(239, 68, 68, 0.15)' : compW === 'Media' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                      color: compW === 'Alta' ? 'var(--status-critical)' : compW === 'Media' ? 'var(--status-medium)' : 'var(--status-low)',
                                    }}
                                  >
                                    {compW}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ padding: '0.45rem 0.6rem' }}>
                                {compE ? (
                                  <span
                                    style={{
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      backgroundColor: compE === 'Alta' ? 'rgba(239, 68, 68, 0.15)' : compE === 'Media' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                      color: compE === 'Alta' ? 'var(--status-critical)' : compE === 'Media' ? 'var(--status-medium)' : 'var(--status-low)',
                                    }}
                                  >
                                    {compE}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', fontWeight: 600 }}>{row.ticket_avg ?? '—'}</td>
                              <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>{row.branches_count ?? '—'}</td>
                              <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>{row.employees_count ?? '—'}</td>
                              <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>{row.systems_count ?? '—'}</td>
                              <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>
                                {row.has_it_department === true ? 'Sí' : row.has_it_department === false ? 'No' : '—'}
                              </td>
                              <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>
                                {!row.isValid ? (
                                  <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>Inválido</span>
                                ) : row.isDuplicate ? (
                                  <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>Duplicado</span>
                                ) : (
                                  <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>Listo</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {importedCount === null && (
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
            <div>
              {parseResult && (
                <button type="button" className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={resetModal}>
                  Cambiar archivo
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={isImporting}>
                Cancelar
              </button>
              {parseResult && (() => {
                const totalToImport = parseResult.validCount + (importDuplicates ? parseResult.duplicateCount : 0);
                return (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleImport}
                    disabled={isImporting || totalToImport === 0}
                  >
                    <CheckCircle2 size={16} />
                    {isImporting ? 'Importando...' : `Confirmar e Importar (${totalToImport} clientes)`}
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
