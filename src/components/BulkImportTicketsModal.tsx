import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  CheckCircle,
  Download,
  AlertCircle,
} from 'lucide-react';
import {
  parseTicketExcelFile,
  convertRowsToCreateTicketInputs,
  generateTicketExcelTemplate,
  type TicketImportValidationResult,
} from '../utils/excel-ticket-importer';
import { playNotificationSound } from '../utils/live-alerts';

interface BulkImportTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BulkImportTicketsModal: React.FC<BulkImportTicketsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { clients, tickets, bulkCreateTickets, addNotification } = useStore();

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<TicketImportValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setError(null);
    setValidationResult(null);

    try {
      const result = await parseTicketExcelFile(selectedFile, clients, tickets);
      setValidationResult(result);
      if (result.validCount > 0) {
        playNotificationSound('success');
      } else {
        playNotificationSound('critical');
      }
    } catch (err: any) {
      const msg = err.message || 'Error al procesar el archivo Excel.';
      setError(msg);
      playNotificationSound('critical');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.validCount === 0) return;

    setIsImporting(true);
    setImportProgress(10);

    try {
      const fallbackClientId = clients[0]?.id || '';
      const inputs = convertRowsToCreateTicketInputs(validationResult.rows, fallbackClientId);

      setImportProgress(50);
      const created = await bulkCreateTickets(inputs);
      setImportProgress(100);

      playNotificationSound('success');
      addNotification({
        type: 'success',
        title: 'Carga Masiva Exitosa',
        message: `Se importaron ${created.length} tickets correctamente.`,
        show_toast: true,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Ocurrió un error durante la importación masiva.';
      setError(msg);
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error de Importación',
        message: msg,
        show_toast: true,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const displayedRows = validationResult
    ? validationResult.rows.filter((r) => {
        if (filterMode === 'valid') return r.isValid && !r.isDuplicate;
        if (filterMode === 'invalid') return !r.isValid || r.isDuplicate;
        return true;
      })
    : [];

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
          boxShadow: 'var(--shadow-xl)',
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
                padding: '0.45rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--status-low)',
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Carga Masiva de Tickets (Excel / CSV)
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Importa decenas de tickets e incidencias simultáneamente con vinculación automática de clientes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

          {/* Upload Drop Zone & Template Download */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--accent-primary)',
                backgroundColor: 'var(--accent-glow)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div style={{ padding: '0.65rem', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', color: 'var(--accent-primary)' }}>
                <UploadCloud size={24} />
              </div>

              <div>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                  {isParsing ? 'Analizando archivo...' : file ? `Archivo: ${file.name}` : 'Seleccionar o Arrastrar Archivo Excel / CSV'}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Formatos soportados: .xlsx, .xls o .csv
                </span>
              </div>
            </div>

            {/* Template Card */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Download size={14} color="var(--accent-primary)" /> Plantilla Oficial
                </span>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem', margin: 0 }}>
                  Descarga el formato de ejemplo con columnas estándar para preparar tus tickets.
                </p>
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.5rem 0.8rem', justifyContent: 'center' }}
                onClick={generateTicketExcelTemplate}
              >
                <Download size={13} /> Descargar Plantilla (.xlsx)
              </button>
            </div>
          </div>

          {/* Validation Summary Bar */}
          {validationResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--status-low)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      fontWeight: 700,
                    }}
                  >
                    ✓ {validationResult.validCount} Válidos
                  </span>

                  {validationResult.invalidCount > 0 && (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--status-critical)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontWeight: 700,
                      }}
                    >
                      ✕ {validationResult.invalidCount} Con Errores
                    </span>
                  )}

                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Total analizado: {validationResult.totalRows} filas
                  </span>
                </div>

                {/* Filter Buttons */}
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      fontWeight: filterMode === 'all' ? 800 : 500,
                      color: filterMode === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      backgroundColor: filterMode === 'all' ? 'var(--accent-glow)' : 'transparent',
                    }}
                    onClick={() => setFilterMode('all')}
                  >
                    Todos ({validationResult.totalRows})
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      fontWeight: filterMode === 'valid' ? 800 : 500,
                      color: filterMode === 'valid' ? 'var(--status-low)' : 'var(--text-secondary)',
                      backgroundColor: filterMode === 'valid' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    }}
                    onClick={() => setFilterMode('valid')}
                  >
                    Válidos ({validationResult.validCount})
                  </button>
                  {validationResult.invalidCount > 0 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.5rem',
                        fontWeight: filterMode === 'invalid' ? 800 : 500,
                        color: filterMode === 'invalid' ? 'var(--status-critical)' : 'var(--text-secondary)',
                        backgroundColor: filterMode === 'invalid' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                      }}
                      onClick={() => setFilterMode('invalid')}
                    >
                      Errores ({validationResult.invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Data Preview Table */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.55rem 0.75rem', width: '50px' }}>Fila</th>
                      <th style={{ padding: '0.55rem 0.75rem', width: '90px' }}>Código</th>
                      <th style={{ padding: '0.55rem 0.75rem' }}>Cliente</th>
                      <th style={{ padding: '0.55rem 0.75rem' }}>Título / Asunto</th>
                      <th style={{ padding: '0.55rem 0.75rem', width: '90px' }}>Prioridad</th>
                      <th style={{ padding: '0.55rem 0.75rem', width: '90px' }}>Estado</th>
                      <th style={{ padding: '0.55rem 0.75rem', width: '120px' }}>Solicitante</th>
                      <th style={{ padding: '0.55rem 0.75rem', width: '80px' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((r) => (
                      <tr
                        key={r.rowNumber}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: !r.isValid ? 'rgba(239, 68, 68, 0.04)' : undefined,
                        }}
                      >
                        <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)' }}>#{r.rowNumber}</td>
                        <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                          {r.ticket_number || <span style={{ color: 'var(--text-muted)' }}>Auto</span>}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          <span style={{ fontWeight: 700, color: r.matched_client_id ? 'var(--text-primary)' : 'var(--status-medium)' }}>
                            {r.client_raw_name}
                          </span>
                          {!r.matched_client_id && (
                            <span style={{ fontSize: '0.68rem', display: 'block', color: 'var(--text-muted)' }}>
                              (Asignará cliente general)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</span>
                          {r.errors.length > 0 && (
                            <div style={{ color: 'var(--status-critical)', fontSize: '0.68rem', marginTop: '0.15rem' }}>
                              {r.errors.join(', ')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor:
                                r.priority === 'critical'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : r.priority === 'high'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'var(--bg-main)',
                              color:
                                r.priority === 'critical'
                                  ? 'var(--status-critical)'
                                  : r.priority === 'high'
                                  ? 'var(--status-medium)'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            {r.priority}
                          </span>
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.status}</span>
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)' }}>{r.requester_name}</td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          {r.isValid && !r.isDuplicate ? (
                            <span style={{ color: 'var(--status-low)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 700 }}>
                              <CheckCircle size={13} /> Listo
                            </span>
                          ) : (
                            <span style={{ color: 'var(--status-critical)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 700 }}>
                              <AlertCircle size={13} /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isImporting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                <span>Importando registros a la base de datos...</span>
                <span>{importProgress}%</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${importProgress}%`, backgroundColor: 'var(--accent-primary)', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
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
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isImporting}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!validationResult || validationResult.validCount === 0 || isImporting}
            onClick={handleConfirmImport}
          >
            <CheckCircle size={16} />
            {isImporting
              ? 'Importando...'
              : validationResult
              ? `Importar ${validationResult.validCount} Tickets Válidos`
              : 'Selecciona un archivo'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
