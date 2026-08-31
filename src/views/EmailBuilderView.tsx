import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Mail, Copy, Check, Sparkles } from 'lucide-react';
import { EMAIL_TEMPLATES, buildEmail } from '../utils/email-templates';

export const EmailBuilderView: React.FC = () => {
  const { cases, caseForEmail, commitments, fetchCommitments } = useStore();

  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseForEmail?.id || (cases[0]?.id || ''));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(EMAIL_TEMPLATES[0].id);
  const [recipientName, setRecipientName] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  const currentCase = cases.find((c) => c.id === selectedCaseId);

  useEffect(() => {
    if (caseForEmail) {
      setSelectedCaseId(caseForEmail.id);
    }
  }, [caseForEmail]);

  useEffect(() => {
    if (selectedCaseId) {
      fetchCommitments(selectedCaseId);
    }
  }, [selectedCaseId]);

  // Rebuild preview whenever inputs change
  useEffect(() => {
    if (!currentCase) {
      setSubject('');
      setBody('Selecciona un caso para generar la plantilla.');
      return;
    }

    const caseCommitments = commitments.filter((c) => c.case_id === currentCase.id && c.status !== 'done');
    const myCommitments = caseCommitments.filter((c) => c.owner === 'me');
    const clientCommitments = caseCommitments.filter((c) => c.owner !== 'me');

    const generated = buildEmail(selectedTemplateId, {
      clientName: currentCase.client_name,
      caseTitle: currentCase.title,
      caseDescription: currentCase.description,
      recipientName: recipientName || undefined,
      myCommitments,
      clientCommitments,
      nextSteps: nextSteps || undefined,
      extraNotes: extraNotes || undefined,
    });

    setSubject(generated.subject);
    setBody(generated.body);
  }, [selectedCaseId, selectedTemplateId, recipientName, extraNotes, nextSteps, commitments, currentCase]);

  const handleCopy = () => {
    const fullText = `Asunto: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Generador de Correos & Minutas
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Redacta comunicaciones profesionales en segundos con datos pre-cargados de tus casos
        </p>
      </div>

      {/* Grid: Left Settings, Right Live Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.2fr)', gap: '1.5rem' }}>
        {/* Left Form */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" /> Configuración de Plantilla
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              1. Selecciona el Caso de Referencia
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              style={{ width: '100%' }}
            >
              {cases.length === 0 ? (
                <option value="">No hay casos activos</option>
              ) : (
                cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.client_name || 'Cliente'}] {c.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              2. Tipo de Plantilla
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {EMAIL_TEMPLATES.map((t) => {
                const isActive = selectedTemplateId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      fontSize: '0.82rem',
                      padding: '0.55rem 0.85rem',
                      fontWeight: isActive ? 600 : 500,
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(37,99,235,0.05))'
                        : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(37,99,235,0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      transition: 'var(--transition-fast)',
                      gap: '0.6rem',
                      whiteSpace: 'normal',
                      lineHeight: 1.3,
                    }}
                  >
                    <span style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: isActive ? 'var(--accent-primary)' : 'var(--border-medium)',
                      flexShrink: 0,
                      display: 'inline-block',
                      marginRight: '0.1rem',
                    }} />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Nombre del Destinatario (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Ing. Carlos Rodríguez / Lic. María"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Próximo Hito / Siguiente Paso (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Sesión de validación técnica el próximo martes"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Notas u Observaciones Adicionales
            </label>
            <textarea
              rows={3}
              placeholder="Cualquier aclaración o detalle extra..."
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Right Live Preview */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={18} color="var(--accent-primary)" /> Vista Previa & Copia
            </h3>

            <button className={copied ? 'btn-success' : 'btn-primary'} onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '¡Copiado al Portapapeles!' : 'Copiar Correo'}
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              ASUNTO:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: '100%', fontWeight: 600 }}
            />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              CUERPO DEL MENSAJE:
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                width: '100%',
                flex: 1,
                minHeight: '340px',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                resize: 'none',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
