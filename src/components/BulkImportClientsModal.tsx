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
} from 'lucide-react';
import {
  parseClientSpreadsheet,
  generateClientTemplateExcel,
  generateClientTemplateCsv,
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
  const { clients, createClient, fetchClients, addNotification } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
        message: 'Se descargó "plantilla_clientes_workdesk.xlsx". Ábrela, ingresa tus clientes y súbela aquí.',
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
        message: 'Se descargó "plantilla_clientes_workdesk.csv". Ábrela, ingresa tus clientes y súbela aquí.',
        type: 'success',
      });
      setTimeout(() => setDownloadFeedback(null), 5000);
    } catch (err: any) {
      setErrorMessage('Error al generar plantilla CSV: ' + err.message);
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
      setErrorMessage('No hay clientes válidos para importar.');
      return;
    }

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const row of rowsToImport) {
        await createClient({
          name: row.name,
          company: row.company,
          email: row.email,
          phone: row.phone,
        });
        successCount++;
      }

      await fetchClients();

      addNotification({
        type: 'success',
        title: 'Carga Masiva Completada',
        message: `Se han importado ${successCount} cliente(s) exitosamente desde ${selectedFile?.name}.`,
        show_toast: true,
      });

      setImportedCount(successCount);
      if (onSuccess) onSuccess(successCount);
    } catch (err: any) {
      setErrorMessage(typeof err === 'string' ? err : 'Error al guardar clientes en la base de datos.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setParseResult(null);
    setErrorMessage(null);
    setImportedCount(null);
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
          maxWidth: '820px',
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
                Carga Masiva de Clientes
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Importa decenas o cientos de clientes desde una hoja de cálculo Excel (.xlsx, .xls) o CSV
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
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
                Los registros ya están disponibles en tu agenda, listos para crear casos, proyectos y registrar compromisos.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button className="btn-secondary" onClick={resetModal}>
                  Importar otro archivo
                </button>
                <button className="btn-primary" onClick={onClose}>
                  Cerrar
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

              {/* Template Download Banner */}
              <div
                style={{
                  padding: '0.9rem 1.25rem',
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
                      ¿Necesitas el formato modelo?
                    </h5>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Descarga nuestra plantilla con columnas pre-configuradas y datos de ejemplo.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                  <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <tr>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>#</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Nombre</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Empresa</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Email</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Teléfono</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.rows.map((row) => (
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
                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{row.rowIndex}</td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>
                              {row.name || <span style={{ color: 'var(--status-critical)', fontStyle: 'italic' }}>Sin nombre</span>}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{row.company || '—'}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{row.email || '—'}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{row.phone || '—'}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>
                              {!row.isValid ? (
                                <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>Inválido</span>
                              ) : row.isDuplicate ? (
                                <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>Duplicado</span>
                              ) : (
                                <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>Listo</span>
                              )}
                            </td>
                          </tr>
                        ))}
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
            {parseResult ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={resetModal}
              >
                Cambiar Archivo
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isImporting}
              >
                Cancelar
              </button>

              {parseResult && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleImport}
                  disabled={isImporting || parseResult.validCount === 0}
                >
                  {isImporting ? 'Importando...' : `Confirmar Importación (${parseResult.validCount + (importDuplicates ? parseResult.duplicateCount : 0)} Clientes)`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
