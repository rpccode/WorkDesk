import React, { useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';
import {
  Mail,
  X,
  Upload,
  Briefcase,
  CheckSquare,
  Link2,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import {
  parseEmailText,
  emailToCase,
  emailToCommitments,
  matchClientByEmail,
  getEmailPreview,
  type ParsedEmail,
  type EmailToCommitmentInput,
} from '../utils/email-parser';
import { SearchableCaseSelect } from './SearchableCaseSelect';

interface EmailImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Si se abre desde el drawer de un caso, preseleccionar ese caso */
  defaultCaseId?: string;
  /** Modo inicial */
  defaultMode?: 'paste' | 'upload';
}

type ConvertMode = 'case' | 'commitment' | 'evidence';

export const EmailImportModal: React.FC<EmailImportModalProps> = ({
  isOpen,
  onClose,
  defaultCaseId,
  defaultMode = 'paste',
}) => {
  const {
    clients,
    cases,
    createCase,
    createCommitment,
    createFollowup,
    addCaseEmail,
    addNotification,
  } = useStore();

  // ── Step state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<'input' | 'review' | 'convert' | 'done'>('input');
  const [inputMode, setInputMode] = useState<'paste' | 'upload'>(defaultMode);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedEmail | null>(null);
  const [convertMode, setConvertMode] = useState<ConvertMode>('case');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── File upload ──────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawText(text);
      setInputMode('paste'); // switch to paste-mode now that content is loaded
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  // ── Parse ────────────────────────────────────────────────────────────────
  const handleParse = useCallback(() => {
    if (!rawText.trim()) return;
    const result = parseEmailText(rawText.trim());
    setParsed(result);
    setStep('review');
  }, [rawText]);

  // ── Conversion state ─────────────────────────────────────────────────────
  const matchedClient = parsed ? matchClientByEmail(parsed.from, clients) : undefined;

  // Case conversion fields
  const [casePriority, setCasePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [caseTitle, setCaseTitle] = useState('');
  const [caseClientId, setCaseClientId] = useState(matchedClient?.id || '');
  const [caseDescription, setCaseDescription] = useState('');

  // Commitment fields
  const [commitmentDrafts, setCommitmentDrafts] = useState<(EmailToCommitmentInput & { selected: boolean })[]>([]);
  const [selectedCaseForCommitment, setSelectedCaseForCommitment] = useState(defaultCaseId || '');

  // Evidence fields
  const [evidenceCaseId, setEvidenceCaseId] = useState(defaultCaseId || '');

  // Pre-fill when review step loads
  const handleOpenConvert = useCallback((mode: ConvertMode) => {
    if (!parsed) return;
    setConvertMode(mode);

    if (mode === 'case') {
      const draft = emailToCase(parsed, matchedClient);
      setCaseTitle(draft.title);
      setCaseDescription(draft.description);
      setCasePriority(draft.priority);
      setCaseClientId(matchedClient?.id || '');
    }
    if (mode === 'commitment') {
      const drafts = emailToCommitments(parsed);
      setCommitmentDrafts(drafts.map((d) => ({ ...d, selected: true })));
      setSelectedCaseForCommitment(defaultCaseId || '');
    }
    if (mode === 'evidence') {
      setEvidenceCaseId(defaultCaseId || '');
    }

    setStep('convert');
  }, [parsed, matchedClient, defaultCaseId]);

  // ── Execute conversion ───────────────────────────────────────────────────
  const handleExecute = async () => {
    if (!parsed) return;
    setIsProcessing(true);

    try {
      if (convertMode === 'case') {
        await createCase({
          client_id: caseClientId,
          title: caseTitle,
          description: caseDescription,
          priority: casePriority,
        });

        addNotification({
          type: 'success',
          title: 'Caso creado desde Correo',
          message: `"${caseTitle}" se creó exitosamente con el correo como evidencia inicial.`,
          show_toast: true,
        });
      }

      if (convertMode === 'commitment') {
        const selectedDrafts = commitmentDrafts.filter((d) => d.selected);
        for (const draft of selectedDrafts) {
          await createCommitment({
            case_id: selectedCaseForCommitment,
            description: draft.description,
            owner: draft.owner,
            due_date: draft.due_date,
          });
        }

        addNotification({
          type: 'success',
          title: `${selectedDrafts.length} Compromisos Creados`,
          message: `Extraídos del correo "${parsed.subject}"`,
          show_toast: true,
        });
      }

      if (convertMode === 'evidence') {
        await addCaseEmail({
          case_id: evidenceCaseId,
          direction: 'inbound',
          sender: parsed.from,
          recipient: parsed.to || 'yo',
          subject: parsed.subject,
          body_text: parsed.bodyText.slice(0, 3000),
          date: parsed.date,
        });

        // Log actividad en bitácora
        const targetCase = cases.find((c) => c.id === evidenceCaseId);
        await createFollowup({
          case_id: evidenceCaseId,
          type: 'email',
          summary: `📎 Correo adjuntado como evidencia: "${parsed.subject}" — De: ${parsed.from}`,
          date: parsed.date,
        });

        addNotification({
          type: 'success',
          title: 'Correo adjuntado como Evidencia',
          message: `Vinculado al caso "${targetCase?.title || evidenceCaseId}"`,
          show_toast: true,
        });
      }

      setStep('done');
    } catch (err: any) {
      addNotification({
        type: 'critical',
        title: 'Error al convertir el correo',
        message: err?.message || 'No se pudo completar la operación.',
        show_toast: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setRawText('');
    setParsed(null);
    setCaseTitle('');
    setCaseDescription('');
    setCasePriority('medium');
    setCaseClientId('');
    setCommitmentDrafts([]);
    setSelectedCaseForCommitment(defaultCaseId || '');
    setEvidenceCaseId(defaultCaseId || '');
  };

  if (!isOpen) return null;

  const content = (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 2000 }}
    >
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: '680px', width: '95vw', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ padding: '1.5rem 1.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '10px', background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(147,51,234,0.15))' }}>
              <Mail size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                {step === 'input' && 'Importar Correo'}
                {step === 'review' && 'Revisar Correo Importado'}
                {step === 'convert' && (
                  convertMode === 'case' ? '📁 Convertir en Caso' :
                  convertMode === 'commitment' ? '📋 Convertir en Compromisos' :
                  '📎 Adjuntar como Evidencia'
                )}
                {step === 'done' && '✅ Conversión Completada'}
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.05rem 0 0' }}>
                {step === 'input' && 'Pega el texto o sube un archivo .eml'}
                {step === 'review' && parsed?.subject}
                {step === 'convert' && 'Configura y confirma la conversión'}
                {step === 'done' && 'El correo fue procesado exitosamente'}
              </p>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div style={{ padding: '1.5rem 1.75rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* STEP: INPUT ─────────────────────────────────────────────── */}
          {step === 'input' && (
            <>
              {/* Mode toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: 'var(--bg-surface-elevated)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  style={{ padding: '0.45rem', fontSize: '0.8rem', fontWeight: inputMode === 'paste' ? 700 : 500, backgroundColor: inputMode === 'paste' ? 'var(--accent-primary)' : 'transparent', color: inputMode === 'paste' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                >
                  📋 Pegar texto
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '0.45rem', fontSize: '0.8rem', fontWeight: inputMode === 'upload' ? 700 : 500, backgroundColor: inputMode === 'upload' ? 'var(--accent-primary)' : 'transparent', color: inputMode === 'upload' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                >
                  <Upload size={13} /> Subir .eml
                </button>
                <input ref={fileInputRef} type="file" accept=".eml,.txt,message/rfc822,text/plain" style={{ display: 'none' }} onChange={handleFileLoad} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Contenido del correo
                </label>
                <textarea
                  rows={12}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Pega aquí el contenido del correo. Puedes incluir las cabeceras (From:, To:, Subject:, Date:) o solo el cuerpo del mensaje.

Ejemplo:
From: Juan García <jgarcia@cliente.com>
To: yo@workdesk.app
Subject: Urgente - Error en producción
Date: Mon, 02 Sep 2026 09:00:00 -0400

Necesitamos resolver el error 500 en el módulo de pagos antes de las 6pm de hoy.
Por favor validen el acceso al servidor de producción.`}
                  style={{ width: '100%', fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--accent-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-border)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                💡 <strong>Tip:</strong> En Outlook, usa <em>Ctrl+Alt+F</em> para reenviar como archivo adjunto. En Gmail, usa el menú ⋮ → "Mostrar original" para copiar el texto completo.
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleParse}
                disabled={!rawText.trim()}
                style={{ justifyContent: 'center', padding: '0.7rem', fontSize: '0.9rem', gap: '0.5rem' }}
              >
                <Sparkles size={16} /> Analizar Correo <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* STEP: REVIEW ────────────────────────────────────────────── */}
          {step === 'review' && parsed && (
            <>
              {/* Metadata card */}
              <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>De:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {parsed.fromName ? `${parsed.fromName} <${parsed.from}>` : parsed.from}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Para:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{parsed.to}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Asunto:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{parsed.subject}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Fecha:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{new Date(parsed.date).toLocaleString('es-ES')}</span>
                  {matchedClient && (
                    <>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Cliente:</span>
                      <span style={{ color: 'var(--status-low)', fontWeight: 700 }}>✓ {matchedClient.name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Body preview */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Cuerpo del Correo
                </label>
                <div style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-subtle)' }}>
                  {getEmailPreview(parsed, 800)}
                </div>
              </div>

              {parsed.attachments.length > 0 && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {parsed.attachments.map((att, i) => (
                    <span key={i} className="badge" style={{ fontSize: '0.68rem', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                      📎 {att.filename}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>¿Qué quieres hacer con este correo?</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                  {[
                    { mode: 'case' as ConvertMode, icon: <Briefcase size={20} />, label: 'Convertir en Caso', desc: 'Abre un nuevo caso con el correo como contexto inicial' },
                    { mode: 'commitment' as ConvertMode, icon: <CheckSquare size={20} />, label: 'Extraer Compromisos', desc: 'Detecta tareas y responsables del correo' },
                    { mode: 'evidence' as ConvertMode, icon: <Link2 size={20} />, label: 'Adjuntar como Evidencia', desc: 'Vincula el correo a un caso existente' },
                  ].map(({ mode, icon, label, desc }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleOpenConvert(mode)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '1rem 0.75rem',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-glow)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface-elevated)';
                      }}
                    >
                      <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP: CONVERT — CASE ────────────────────────────────────── */}
          {step === 'convert' && parsed && convertMode === 'case' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Título del Caso
                </label>
                <input
                  type="text"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Cliente
                  </label>
                  <select
                    value={caseClientId}
                    onChange={(e) => setCaseClientId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">— Sin cliente —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Prioridad
                  </label>
                  <select
                    value={casePriority}
                    onChange={(e) => setCasePriority(e.target.value as any)}
                    style={{ width: '100%' }}
                  >
                    <option value="critical">🔴 Crítica</option>
                    <option value="high">🟠 Alta</option>
                    <option value="medium">🟡 Media</option>
                    <option value="low">🟢 Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Descripción del Caso
                </label>
                <textarea
                  rows={6}
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', lineHeight: 1.5 }}
                />
              </div>
            </>
          )}

          {/* STEP: CONVERT — COMMITMENTS ─────────────────────────────── */}
          {step === 'convert' && parsed && convertMode === 'commitment' && (
            <>
              <div>
                <SearchableCaseSelect
                  label="Caso al que se vinculan los compromisos"
                  cases={cases}
                  selectedCaseId={selectedCaseForCommitment}
                  onChange={setSelectedCaseForCommitment}
                  placeholder="Buscar caso..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Compromisos detectados (selecciona los que quieras crear)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {commitmentDrafts.map((draft, idx) => (
                    <div
                      key={idx}
                      className="glass-card"
                      style={{
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        borderLeft: `3px solid ${draft.owner === 'me' ? 'var(--accent-primary)' : 'var(--status-medium)'}`,
                        opacity: draft.selected ? 1 : 0.5,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={draft.selected}
                        onChange={(e) => {
                          const updated = [...commitmentDrafts];
                          updated[idx] = { ...updated[idx], selected: e.target.checked };
                          setCommitmentDrafts(updated);
                        }}
                        style={{ marginTop: '0.15rem', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          type="text"
                          value={draft.description}
                          onChange={(e) => {
                            const updated = [...commitmentDrafts];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setCommitmentDrafts(updated);
                          }}
                          style={{ width: '100%', fontSize: '0.8rem', fontWeight: 600 }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                          <select
                            value={draft.owner}
                            onChange={(e) => {
                              const updated = [...commitmentDrafts];
                              updated[idx] = { ...updated[idx], owner: e.target.value as any };
                              setCommitmentDrafts(updated);
                            }}
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.35rem', width: 'auto' }}
                          >
                            <option value="me">👤 Yo</option>
                            <option value="client">🏢 Cliente</option>
                            <option value="third_party">🔗 Tercero</option>
                          </select>
                          {draft.due_date && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                              📅 {draft.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP: CONVERT — EVIDENCE ────────────────────────────────── */}
          {step === 'convert' && parsed && convertMode === 'evidence' && (
            <>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--accent-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-border)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <strong>Se adjuntará el correo completo como evidencia en la pestaña "Correos" del caso y se registrará en la Bitácora.</strong>
              </div>

              <SearchableCaseSelect
                label="Caso al que se adjunta el correo"
                cases={cases}
                selectedCaseId={evidenceCaseId}
                onChange={setEvidenceCaseId}
                placeholder="Buscar caso..."
              />

              {evidenceCaseId && parsed && (
                <div className="glass-card" style={{ padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Se vinculará:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{parsed.subject}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>De: {parsed.from} · {new Date(parsed.date).toLocaleDateString('es-ES')}</span>
                </div>
              )}
            </>
          )}

          {/* STEP: DONE ─────────────────────────────────────────────── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--status-low-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={32} color="var(--status-low)" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>¡Correo procesado exitosamente!</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '380px', lineHeight: 1.5 }}>
                {convertMode === 'case' && `El caso "${caseTitle}" fue creado.`}
                {convertMode === 'commitment' && `${commitmentDrafts.filter((d) => d.selected).length} compromisos creados desde el correo.`}
                {convertMode === 'evidence' && 'El correo quedó vinculado en la pestaña Correos y en la Bitácora del caso.'}
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={handleReset}>
                  Importar otro correo
                </button>
                <button type="button" className="btn-primary" onClick={onClose}>
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        {(step === 'convert') && (
          <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexShrink: 0 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep('review')}
              disabled={isProcessing}
            >
              ← Volver
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleExecute}
              disabled={isProcessing || (convertMode === 'commitment' && !selectedCaseForCommitment) || (convertMode === 'evidence' && !evidenceCaseId)}
              style={{ gap: '0.5rem' }}
            >
              {isProcessing ? 'Procesando...' : (
                <>
                  <Check size={15} />
                  {convertMode === 'case' && 'Crear Caso'}
                  {convertMode === 'commitment' && `Crear ${commitmentDrafts.filter(d => d.selected).length} Compromiso(s)`}
                  {convertMode === 'evidence' && 'Adjuntar Evidencia'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};
