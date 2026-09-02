import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { generateMeetingPrepAI } from '../services/ai-copilot';
import type { Case } from '../types';

interface MeetingPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: Case | null;
}

export const MeetingPrepModal: React.FC<MeetingPrepModalProps> = ({
  isOpen,
  onClose,
  caseItem,
}) => {
  const { clients, commitments, notes, aiConfig, addNotification } = useStore();

  const [prepContent, setPrepContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && caseItem) {
      handleGenerate();
    }
  }, [isOpen, caseItem?.id]);

  if (!isOpen || !caseItem) return null;

  const client = clients.find((c) => c.id === caseItem.client_id);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCopied(false);
    try {
      const result = await generateMeetingPrepAI(
        caseItem,
        client,
        commitments,
        notes,
        aiConfig
      );
      setPrepContent(result);
    } catch (err: any) {
      addNotification({
        type: 'critical',
        title: 'Error Preparando Reunión',
        message: err.message || 'No se pudo generar la guía.',
        show_toast: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!prepContent) return;
    navigator.clipboard.writeText(prepContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification({
      type: 'success',
      title: 'Copiado al Portapapeles',
      message: 'La guía de reunión ha sido copiada.',
      show_toast: true,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-card animate-scale-up"
        style={{
          width: '750px',
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                padding: '0.4rem',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Preparación Estratégica de Reunión (IA Briefing)
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0' }}>
                {caseItem.title} • {client?.name || caseItem.client_name || 'Sin cliente'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.3rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {isGenerating ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1rem',
                color: 'var(--accent-primary)',
                gap: '1rem',
              }}
            >
              <Cpu size={32} className="animate-spin" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Generando Guía Táctica con IA...
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Analizando compromisos pendientes del cliente y antecedentes del caso
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: '0.86rem',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                backgroundColor: 'var(--bg-surface)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {prepContent}
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
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '0.78rem' }}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} /> Regenerar Guía
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCopy}
              disabled={!prepContent || isGenerating}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? '¡Copiado!' : 'Copiar Guía'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
