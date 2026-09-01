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
  AlertCircle,
} from 'lucide-react';
import { EMAIL_TEMPLATES, buildEmail } from '../utils/email-templates';
import { launchEmailClient, type EmailProvider } from '../utils/email-launcher';
import { EmailAccountsModal } from '../components/EmailAccountsModal';
import { SearchableCaseSelect } from '../components/SearchableCaseSelect';
import { formatSignature } from '../utils/theme-manager';

const EMAIL_PROVIDER_KEY = 'workdesk_preferred_email_provider';

export const EmailBuilderView: React.FC = () => {
  const {
    cases,
    caseForEmail,
    commitments,
    fetchCommitments,
    clients,
    fetchClients,
    createFollowup,
    emailAccounts,
    fetchEmailAccounts,
    sendEmailDirect,
    consultantProfile,
  } = useStore();

  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseForEmail?.id || (cases[0]?.id || ''));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(EMAIL_TEMPLATES[0].id);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [autoLogFollowup, setAutoLogFollowup] = useState(true);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);

  // Email provider preference for app/webmail fallback
  const [emailProvider, setEmailProvider] = useState<EmailProvider>(() => {
    return (localStorage.getItem(EMAIL_PROVIDER_KEY) as EmailProvider) || 'default';
  });

  const currentCase = cases.find((c) => c.id === selectedCaseId);
  const currentClient = clients.find((cl) => cl.id === currentCase?.client_id);

  useEffect(() => {
    if (clients.length === 0) fetchClients();
    if (emailAccounts.length === 0) fetchEmailAccounts();
  }, [clients.length, emailAccounts.length, fetchClients, fetchEmailAccounts]);

  useEffect(() => {
    if (emailAccounts.length > 0 && !selectedAccountId) {
      const defaultAcc = emailAccounts.find((a) => a.is_default) || emailAccounts[0];
      setSelectedAccountId(defaultAcc.id);
    }
  }, [emailAccounts, selectedAccountId]);

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

    const customSignature = formatSignature(consultantProfile.email_signature, consultantProfile);

    const generated = buildEmail(selectedTemplateId, {
      clientName: currentCase.client_name,
      caseTitle: currentCase.title,
      caseDescription: currentCase.description,
      recipientName: recipientName || undefined,
      myCommitments,
      clientCommitments,
      nextSteps: nextSteps || undefined,
      extraNotes: extraNotes || undefined,
      signature: customSignature,
    });

    setSubject(generated.subject);
    setBody(generated.body);
  }, [selectedCaseId, selectedTemplateId, recipientName, extraNotes, nextSteps, commitments, currentCase, consultantProfile]);

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

  // Direct Send via background SMTP/API
  const handleDirectSend = async () => {
    if (!currentCase) return;
    if (!recipientEmail.trim()) {
      setFeedbackMessage({ success: false, text: 'Por favor especifica el correo del destinatario.' });
      return;
    }

    setIsSendingDirect(true);
    setFeedbackMessage(null);
    try {
      const res = await sendEmailDirect({
        account_id: selectedAccountId || undefined,
        case_id: currentCase.id,
        recipient: recipientEmail.trim(),
        subject,
        body,
        auto_log_followup: autoLogFollowup,
      });

      setFeedbackMessage({ success: true, text: `✓ ${res.message}` });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      setFeedbackMessage({ success: false, text: `Error al enviar correo: ${err?.toString() || 'Fallo de conexión'}` });
    } finally {
      setIsSendingDirect(false);
    }
  };

  // Fallback: Open in external client/webmail
  const handleLaunchExternal = async (overrideProvider?: EmailProvider) => {
    const providerToUse = overrideProvider || emailProvider;
    
    launchEmailClient(providerToUse, {
      to: recipientEmail,
      subject,
      body,
    });

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

    setFeedbackMessage({ success: true, text: `✓ Abierto en ${providerNames[providerToUse]}${logNotice}` });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Generador & Envío de Correos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Envía directo en segundo plano, abre en webmail y sincroniza el seguimiento con tus clientes
          </p>
        </div>

        <button
          className="btn-secondary"
          style={{ fontSize: '0.83rem', gap: '0.45rem' }}
          onClick={() => setIsAccountsModalOpen(true)}
        >
          <Settings2 size={15} color="var(--accent-primary)" />
          {emailAccounts.length > 0
            ? `Cuentas Vinculadas (${emailAccounts.length})`
            : 'Vincular Cuenta de Correo'}
        </button>
      </div>

      {/* Grid: Left Settings, Right Live Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(440px, 1.3fr)', gap: '1.5rem' }}>
        {/* Left Form */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" /> Configuración de Plantilla
          </h3>

          <div>
            <SearchableCaseSelect
              label="1. Selecciona el Caso de Referencia"
              cases={cases}
              selectedCaseId={selectedCaseId}
              onChange={(id) => setSelectedCaseId(id)}
              placeholder="Buscar caso o cliente..."
            />
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

          {/* Account Selector if configured */}
          {emailAccounts.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.35rem' }}>
                Cuenta Remitente para Envío Directo
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{ width: '100%' }}
              >
                {emailAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} &lt;{acc.email}&gt; {acc.is_default ? '(Principal)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

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

              {emailAccounts.length > 0 ? (
                <button
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', fontWeight: 600 }}
                  onClick={handleDirectSend}
                  disabled={isSendingDirect}
                >
                  <Send size={14} />
                  {isSendingDirect ? 'Enviando directo...' : 'Enviar Ahora (Directo)'}
                </button>
              ) : (
                <button
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', fontWeight: 600 }}
                  onClick={() => handleLaunchExternal()}
                >
                  <Send size={14} />
                  {emailProvider === 'gmail'
                    ? 'Abrir en Gmail'
                    : emailProvider === 'outlook'
                    ? 'Abrir en Outlook 365'
                    : 'Abrir en Mi Correo (App)'}
                </button>
              )}
            </div>
          </div>

          {/* Feedback banner */}
          {feedbackMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: feedbackMessage.success ? 'var(--status-low-bg)' : 'var(--status-critical-bg)',
              color: feedbackMessage.success ? 'var(--status-low)' : 'var(--status-critical)',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: `1px solid ${feedbackMessage.success ? 'var(--status-low-border)' : 'var(--status-critical-border)'}`,
            }}>
              {feedbackMessage.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {feedbackMessage.text}
            </div>
          )}

          {/* Fallback external buttons row */}
          {emailAccounts.length > 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.55rem 0.85rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.76rem',
            }}>
              <span style={{ color: 'var(--text-muted)' }}>O abrir en cliente externo:</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.73rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => handleLaunchExternal('default')}
                >
                  App Outlook/Mail
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.73rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => handleLaunchExternal('gmail')}
                >
                  Gmail Web
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.73rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => handleLaunchExternal('outlook')}
                >
                  Outlook 365
                </button>
              </div>
            </div>
          ) : (
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
              <span style={{ color: 'var(--text-muted)' }}>Abrir preferentemente en:</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => handleProviderChange('default')}
                  style={{
                    fontSize: '0.73rem',
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
                    fontSize: '0.73rem',
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
                    fontSize: '0.73rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: emailProvider === 'outlook' ? 'var(--accent-primary)' : 'transparent',
                    color: emailProvider === 'outlook' ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${emailProvider === 'outlook' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  }}
                >
                  Outlook 365
                </button>
              </div>
            </div>
          )}

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
            Registrar automáticamente como seguimiento en la bitácora del caso al enviar
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
                minHeight: '280px',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </div>

      {/* Email Accounts Setup Modal */}
      <EmailAccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
      />
    </div>
  );
};


