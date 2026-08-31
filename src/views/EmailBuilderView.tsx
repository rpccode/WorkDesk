import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import {
  Mail,
  Copy,
  Check,
  Sparkles,
  Send,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import { EMAIL_TEMPLATES, buildEmail } from '../utils/email-templates';
import { launchEmailClient, type EmailProvider } from '../utils/email-launcher';

const EMAIL_PROVIDER_KEY = 'workdesk_preferred_email_provider';

export const EmailBuilderView: React.FC = () => {
  const { cases, caseForEmail, commitments, fetchCommitments, clients, fetchClients, createFollowup } = useStore();

  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseForEmail?.id || (cases[0]?.id || ''));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(EMAIL_TEMPLATES[0].id);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [launchedMessage, setLaunchedMessage] = useState<string | null>(null);
  const [autoLogFollowup, setAutoLogFollowup] = useState(true);

  // Email provider preference
  const [emailProvider, setEmailProvider] = useState<EmailProvider>(() => {
    return (localStorage.getItem(EMAIL_PROVIDER_KEY) as EmailProvider) || 'default';
  });

  const currentCase = cases.find((c) => c.id === selectedCaseId);
  const currentClient = clients.find((cl) => cl.id === currentCase?.client_id);

  useEffect(() => {
    if (clients.length === 0) {
      fetchClients();
    }
  }, [clients.length, fetchClients]);

  useEffect(() => {
    if (caseForEmail) {
      setSelectedCaseId(caseForEmail.id);
    }
  }, [caseForEmail]);

  useEffect(() => {
    if (selectedCaseId) {
      fetchCommitments(selectedCaseId);
    }
  }, [selectedCaseId, fetchCommitments]);

  // Auto-fill recipient email when client changes
  useEffect(() => {
    if (currentClient?.email) {
      setRecipientEmail(currentClient.email);
    }
  }, [currentClient]);

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

  const handleProviderChange = (provider: EmailProvider) => {
    setEmailProvider(provider);
    localStorage.setItem(EMAIL_PROVIDER_KEY, provider);
  };

  const handleCopy = () => {
    const fullText = `Para: ${recipientEmail || '(Destinatario)'}\nAsunto: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchEmail = async (overrideProvider?: EmailProvider) => {
    const providerToUse = overrideProvider || emailProvider;
    
    // 1. Launch in client
    launchEmailClient(providerToUse, {
      to: recipientEmail,
      subject,
      body,
    });

    // 2. Automatically log to case followup if active
    let logNotice = '';
    if (autoLogFollowup && currentCase) {
      try {
        const tplName = EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name || 'Comunicación';
        await createFollowup({
          case_id: currentCase.id,
          type: 'email',
          summary: `Envío de correo [${tplName}] a ${recipientEmail || currentCase.client_name || 'cliente'}: "${subject}"`,
          date: new Date().toISOString(),
        });
        logNotice = ' y registrado en la bitácora';
      } catch (err) {
        console.error('Error logging email followup:', err);
      }
    }

    const providerNames = {
      default: 'Outlook / App del Sistema',
      gmail: 'Gmail Web',
      outlook: 'Outlook 365 Web',
    };

    setLaunchedMessage(`✓ Abierto en ${providerNames[providerToUse]}${logNotice}`);
    setTimeout(() => setLaunchedMessage(null), 4000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Generador de Correos & Minutas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Redacta, abre en tu cliente de correo favorito y registra el seguimiento con 1 clic
          </p>
        </div>
      </div>

      {/* Grid: Left Settings, Right Live Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(440px, 1.3fr)', gap: '1.5rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
                      padding: '0.5rem 0.85rem',
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
                    }} />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Email & Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Correo del Destinatario
              </label>
              <input
                type="email"
                placeholder="ejemplo@empresa.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Nombre (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Ing. Carlos"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
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
              rows={2}
              placeholder="Cualquier aclaración o detalle extra..."
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Right Live Preview & Actions */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Top Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={18} color="var(--accent-primary)" /> Vista Previa & Envío
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 0.8rem' }}
                onClick={handleCopy}
              >
                {copied ? <Check size={14} color="var(--status-low)" /> : <Copy size={14} />}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>

              <button
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', fontWeight: 600 }}
                onClick={() => handleLaunchEmail()}
              >
                <Send size={14} />
                {emailProvider === 'gmail'
                  ? 'Abrir en Gmail'
                  : emailProvider === 'outlook'
                  ? 'Abrir en Outlook 365'
                  : 'Abrir en Mi Correo (App)'}
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {launchedMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--status-low-bg)',
              color: 'var(--status-low)',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid var(--status-low-border)',
            }}>
              <CheckCircle2 size={16} />
              {launchedMessage}
            </div>
          )}

          {/* Email Client Provider Picker */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.6rem 0.85rem',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <Settings2 size={14} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600 }}>Integración:</span>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => handleProviderChange('default')}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.25rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: emailProvider === 'default' ? 'var(--accent-primary)' : 'transparent',
                  color: emailProvider === 'default' ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${emailProvider === 'default' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                }}
              >
                Outlook / App Sistema
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('gmail')}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.25rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: emailProvider === 'gmail' ? 'var(--accent-primary)' : 'transparent',
                  color: emailProvider === 'gmail' ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${emailProvider === 'gmail' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                }}
              >
                Gmail Web
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('outlook')}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.25rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: emailProvider === 'outlook' ? 'var(--accent-primary)' : 'transparent',
                  color: emailProvider === 'outlook' ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${emailProvider === 'outlook' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                }}
              >
                Outlook 365 Web
              </button>
            </div>
          </div>

          {/* Auto-log checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.77rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={autoLogFollowup}
              onChange={(e) => setAutoLogFollowup(e.target.checked)}
              style={{ width: 'auto', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            Registrar automáticamente como seguimiento en la bitácora del caso al abrir/enviar
          </label>

          {/* Subject line */}
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

          {/* Email Body */}
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
                minHeight: '290px',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

