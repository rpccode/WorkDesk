import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import {
  FileText,
  X,
  Download,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { generateCaseBrief, exportCaseBriefToDocx, formatCaseBriefEmailText } from '../utils/case-brief-generator';
import type { Case, EmailTone } from '../types';

interface CaseBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: Case | null;
}

export const CaseBriefModal: React.FC<CaseBriefModalProps> = ({ isOpen, onClose, caseItem }) => {
  const {
    commitments,
    followups,
    notes,
    consultantProfile,
    setCaseForEmail,
    addNotification,
  } = useStore();

  const [tone, setTone] = useState<EmailTone>('formal');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const brief = useMemo(() => {
    if (!caseItem) return null;
    return generateCaseBrief(caseItem, commitments, followups, notes);
  }, [caseItem, commitments, followups, notes]);

  const emailText = useMemo(() => {
    if (!brief) return '';
    return formatCaseBriefEmailText(brief, tone);
  }, [brief, tone]);

  if (!isOpen || !caseItem || !brief) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addNotification({
        type: 'success',
        title: 'Copiado al Portapapeles',
        message: 'El texto de la minuta ejecutiva está listo para pegar.',
        show_toast: true,
      });
    } catch (_) {}
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      await exportCaseBriefToDocx(brief, consultantProfile);
      addNotification({
        type: 'success',
        title: 'Word (.docx) Generado',
        message: `Minuta del caso "${brief.title}" descargada con éxito.`,
        show_toast: true,
      });
    } catch (err) {
      console.error(err);
      addNotification({
        type: 'critical',
        title: 'Error al exportar',
        message: 'No se pudo generar el archivo Word.',
        show_toast: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEmail = () => {
    setCaseForEmail(caseItem);
    onClose();
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 99990,
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
          maxWidth: '750px',
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
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <FileText size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                Consulting Intelligence • Minuta Ejecutiva
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.1rem 0 0' }}>
                {caseItem.title}
              </h3>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', padding: '0.3rem', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Tone Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Tono de Comunicación:
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn-ghost ${tone === 'formal' ? 'active' : ''}`}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  backgroundColor: tone === 'formal' ? 'var(--accent-glow)' : 'var(--bg-surface-elevated)',
                  color: tone === 'formal' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: tone === 'formal' ? 800 : 500,
                }}
                onClick={() => setTone('formal')}
              >
                👔 Ejecutivo / Formal
              </button>
              <button
                type="button"
                className={`btn-ghost ${tone === 'assertive' ? 'active' : ''}`}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  backgroundColor: tone === 'assertive' ? 'rgba(239,68,68,0.12)' : 'var(--bg-surface-elevated)',
                  color: tone === 'assertive' ? 'var(--status-critical)' : 'var(--text-secondary)',
                  fontWeight: tone === 'assertive' ? 800 : 500,
                }}
                onClick={() => setTone('assertive')}
              >
                ⚡ Firme / Bloqueos
              </button>
              <button
                type="button"
                className={`btn-ghost ${tone === 'technical' ? 'active' : ''}`}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  backgroundColor: tone === 'technical' ? 'rgba(16,185,129,0.12)' : 'var(--bg-surface-elevated)',
                  color: tone === 'technical' ? 'var(--status-low)' : 'var(--text-secondary)',
                  fontWeight: tone === 'technical' ? 800 : 500,
                }}
                onClick={() => setTone('technical')}
              >
                🛠️ Técnico / Detallado
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Cliente:</span>
              <strong style={{ color: 'var(--accent-primary)' }}>{brief.client_name}</strong>
            </div>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Compromisos:</span>
              <strong>{brief.pending_commitments.length} pendientes / {brief.completed_commitments.length} hechos</strong>
            </div>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Bloqueos Activos:</span>
              <strong style={{ color: brief.blockers.length > 0 ? 'var(--status-critical)' : 'var(--status-low)' }}>
                {brief.blockers.length > 0 ? `${brief.blockers.length} en espera` : 'Sin bloqueos'}
              </strong>
            </div>
          </div>

          {/* Text Preview Area */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
              Vista Previa del Mensaje / Minuta:
            </label>
            <textarea
              readOnly
              value={emailText}
              rows={11}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.84rem',
                lineHeight: 1.5,
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                resize: 'none',
                color: 'var(--text-primary)',
              }}
            />
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
            onClick={handleCopy}
          >
            {copied ? <Check size={14} color="var(--status-low)" /> : <Copy size={14} />}
            {copied ? '¡Copiado!' : 'Copiar Texto'}
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
              onClick={handleSendEmail}
            >
              <Mail size={14} color="var(--accent-primary)" /> Abrir en Correo
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.5rem 1.15rem' }}
              onClick={handleExportDocx}
              disabled={isExporting}
            >
              <Download size={14} /> {isExporting ? 'Generando Word...' : 'Descargar Word (.docx)'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
