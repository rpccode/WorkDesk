import React, { useState } from 'react';
import { useStore } from '../store';
import {
  Sparkles,
  X,
  Check,
  Cpu,
} from 'lucide-react';
import { extractCommitmentsFromText } from '../services/ai-copilot';
import type { ExtractedCommitmentDraft, CommitmentOwner } from '../types';

interface CommitmentExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  defaultCaseId?: string;
}

export const CommitmentExtractorModal: React.FC<CommitmentExtractorModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  defaultCaseId,
}) => {
  const { cases, createCommitment, addNotification, aiConfig } = useStore();

  const [rawText, setRawText] = useState(initialText);
  const [selectedCaseId, setSelectedCaseId] = useState(defaultCaseId || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedDrafts, setExtractedDrafts] = useState<(ExtractedCommitmentDraft & { selected: boolean })[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!rawText.trim()) return;
    setIsExtracting(true);

    try {
      const drafts = await extractCommitmentsFromText(rawText, aiConfig);
      setExtractedDrafts(drafts.map((d) => ({ ...d, selected: true })));
      setHasExtracted(true);
    } catch (err: any) {
      addNotification({
        type: 'critical',
        title: 'Error en Extracción IA',
        message: err.message || 'No se pudieron extraer compromisos.',
        show_toast: true,
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCreateSelected = async () => {
    const toCreate = extractedDrafts.filter((d) => d.selected && d.description.trim());
    if (toCreate.length === 0) return;

    const targetCase = cases.find((c) => c.id === selectedCaseId);
    let count = 0;

    for (const item of toCreate) {
      try {
        await createCommitment({
          case_id: targetCase ? targetCase.id : (cases[0]?.id || ''),
          description: item.description,
          owner: item.owner as CommitmentOwner,
          due_date: item.dueDate || undefined,
        });
        count++;
      } catch (e) {
        console.error('Error creating extracted commitment:', e);
      }
    }

    addNotification({
      type: 'success',
      title: 'Compromisos Creados',
      message: `Se crearon ${count} compromiso(s) extraídos con IA.`,
      show_toast: true,
    });

    onClose();
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
                Extracción Inteligente de Compromisos
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0' }}>
                Pega notas de reunión o correos. La IA detectará acuerdos, responsables y plazos.
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

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Case selector */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Asociar al Caso / Proyecto
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              <option value="">Seleccionar caso (opcional)...</option>
              {cases.filter((c) => c.status !== 'closed').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.client_name || 'Sin cliente'})
                </option>
              ))}
            </select>
          </div>

          {/* Raw Text Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Texto de Entrada (Correo, Notas, Minuta)
              </label>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {rawText.length} caracteres
              </span>
            </div>
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Pega aquí el correo recibido o las notas de la reunión..."
              style={{
                width: '100%',
                marginTop: '0.25rem',
                fontSize: '0.82rem',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Extract Button */}
          <button
            type="button"
            className="btn-primary"
            onClick={handleExtract}
            disabled={!rawText.trim() || isExtracting}
            style={{
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.7rem',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)',
            }}
          >
            {isExtracting ? (
              <>
                <Cpu size={16} className="animate-spin" /> Analizando con IA...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Extraer Compromisos con IA
              </>
            )}
          </button>

          {/* Results List */}
          {hasExtracted && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Compromisos Detectados ({extractedDrafts.length})
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Desmarca los que no apliquen o edita el responsable
                </span>
              </div>

              {extractedDrafts.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  No se detectaron compromisos en el texto. Intenta pegar un extracto más específico.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {extractedDrafts.map((draft, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: draft.selected ? 'var(--bg-surface)' : 'rgba(0,0,0,0.1)',
                        border: `1px solid ${draft.selected ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={draft.selected}
                        onChange={(e) => {
                          const copy = [...extractedDrafts];
                          copy[idx].selected = e.target.checked;
                          setExtractedDrafts(copy);
                        }}
                        style={{ marginTop: '0.2rem' }}
                      />

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <input
                          type="text"
                          value={draft.description}
                          onChange={(e) => {
                            const copy = [...extractedDrafts];
                            copy[idx].description = e.target.value;
                            setExtractedDrafts(copy);
                          }}
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            width: '100%',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            padding: '0.2rem 0',
                          }}
                        />

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <select
                            value={draft.owner}
                            onChange={(e) => {
                              const copy = [...extractedDrafts];
                              copy[idx].owner = e.target.value as any;
                              setExtractedDrafts(copy);
                            }}
                            style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}
                          >
                            <option value="me">Responsable: Mío (Consultor)</option>
                            <option value="client">Responsable: Cliente</option>
                            <option value="third_party">Responsable: Tercero</option>
                          </select>

                          <input
                            type="date"
                            value={draft.dueDate || ''}
                            onChange={(e) => {
                              const copy = [...extractedDrafts];
                              copy[idx].dueDate = e.target.value;
                              setExtractedDrafts(copy);
                            }}
                            style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}
                          />

                          {draft.priority === 'urgent' && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--status-critical)', backgroundColor: 'var(--status-critical-bg)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              Urgente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreateSelected}
            disabled={extractedDrafts.filter((d) => d.selected).length === 0}
          >
            <Check size={15} /> Crear {extractedDrafts.filter((d) => d.selected).length} Compromiso(s)
          </button>
        </div>

      </div>
    </div>
  );
};
