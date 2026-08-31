import React, { useState } from 'react';
import { useStore } from '../store';
import {
  Mail,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Server,
  RefreshCw,
  Star,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { EmailAccount, EmailAccountProvider, SaveEmailAccountInput } from '../types';

interface EmailAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Preset {
  name: string;
  provider: EmailAccountProvider;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
  hint: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Gmail / Google Workspace',
    provider: 'smtp_imap',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    hint: 'Usa tu correo de Gmail y una Contraseña de Aplicación de 16 letras generada en tu cuenta de Google.',
  },
  {
    name: 'Outlook / Office 365',
    provider: 'smtp_imap',
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    hint: 'Compatible con cuentas corporativas de Microsoft 365 y Hotmail/Outlook.com.',
  },
  {
    name: 'Servidor Propio / Corporativo',
    provider: 'smtp_imap',
    smtp_host: '',
    smtp_port: 587,
    imap_host: '',
    imap_port: 993,
    hint: 'Ingresa los datos SMTP/IMAP provistos por el departamento de IT o tu proveedor de hosting.',
  },
];

export const EmailAccountsModal: React.FC<EmailAccountsModalProps> = ({ isOpen, onClose }) => {
  const { emailAccounts, saveEmailAccount, deleteEmailAccount, testEmailConnection, startOAuthLogin } = useStore();

  const [viewMode, setViewMode] = useState<'list' | 'add_oauth' | 'add_manual'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // OAuth states
  const [isLoggingInOAuth, setIsLoggingInOAuth] = useState(false);
  const [oauthFeedback, setOauthFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);
  const [customClientId, setCustomClientId] = useState('');
  const [customTenantId, setCustomTenantId] = useState('');

  // Manual SMTP/IMAP Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState<EmailAccountProvider>('smtp_imap');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState<number>(993);
  const [isDefault, setIsDefault] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleOAuthLogin = async (targetProvider: 'microsoft' | 'google') => {
    setIsLoggingInOAuth(true);
    setOauthFeedback(null);
    try {
      const res = await startOAuthLogin({
        provider: targetProvider,
        custom_client_id: customClientId.trim() || undefined,
        custom_tenant_id: customTenantId.trim() || undefined,
      });

      setOauthFeedback({
        success: true,
        message: `¡Cuenta ${res.email} vinculada exitosamente vía ${targetProvider === 'microsoft' ? 'Microsoft 365' : 'Google'}!`,
      });
      setTimeout(() => {
        setViewMode('list');
      }, 1500);
    } catch (err: any) {
      setOauthFeedback({
        success: false,
        message: err?.toString() || 'Error durante la autenticación OAuth.',
      });
    } finally {
      setIsLoggingInOAuth(false);
    }
  };

  const applyPreset = (preset: Preset) => {
    setProvider(preset.provider);
    setSmtpHost(preset.smtp_host);
    setSmtpPort(preset.smtp_port);
    setImapHost(preset.imap_host);
    setImapPort(preset.imap_port);
    if (!name) setName(preset.name.split(' ')[0]);
  };

  const handleStartManualAdd = () => {
    setViewMode('add_manual');
    setEditingId(null);
    setName('');
    setEmail('');
    setSmtpUser('');
    setSmtpPassword('');
    setIsDefault(emailAccounts.length === 0);
    setTestResult(null);
    applyPreset(PRESETS[0]);
  };

  const handleEdit = (account: EmailAccount) => {
    setViewMode('add_manual');
    setEditingId(account.id);
    setName(account.name);
    setEmail(account.email);
    setProvider(account.provider);
    setSmtpHost(account.smtp_host || '');
    setSmtpPort(account.smtp_port || 587);
    setSmtpUser(account.smtp_user || '');
    setSmtpPassword(account.smtp_password || '');
    setImapHost(account.imap_host || '');
    setImapPort(account.imap_port || 993);
    setIsDefault(account.is_default);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!smtpHost || !smtpUser || !smtpPassword) {
      setTestResult({ success: false, message: 'Completa el servidor SMTP, usuario y contraseña para probar.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const payload: SaveEmailAccountInput = {
        name,
        email,
        provider,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_user: smtpUser,
        imap_password: smtpPassword,
      };
      const res = await testEmailConnection(payload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.toString() || 'Error al probar conexión SMTP.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSaving(true);
    try {
      await saveEmailAccount({
        id: editingId || undefined,
        name: name.trim(),
        email: email.trim(),
        provider,
        smtp_host: smtpHost.trim() || undefined,
        smtp_port: smtpPort,
        smtp_user: smtpUser.trim() || undefined,
        smtp_password: smtpPassword || undefined,
        imap_host: imapHost.trim() || undefined,
        imap_port: imapPort,
        imap_user: smtpUser.trim() || undefined,
        imap_password: smtpPassword || undefined,
        is_default: isDefault,
      });
      setViewMode('list');
      setEditingId(null);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.toString() || 'Error al guardar la cuenta.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta cuenta de correo de WorkDesk?')) {
      await deleteEmailAccount(id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <Mail size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Integración de Correo & Sincronización</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Inicia sesión oficial (sin SMTP) o configura tus servidores corporativos
              </p>
            </div>
          </div>
          <button className="btn-ghost" style={{ padding: '0.35rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {viewMode === 'list' && (
            <>
              {/* Accounts List Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  CUENTAS VINCULADAS ({emailAccounts.length})
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setViewMode('add_oauth')}>
                    <Plus size={14} /> Iniciar Sesión (OAuth)
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={handleStartManualAdd}>
                    <Server size={14} /> Manual SMTP
                  </button>
                </div>
              </div>

              {emailAccounts.length === 0 ? (
                <div className="empty-state" style={{ padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                    <ShieldCheck size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Conecta tu Correo Oficialmente</h3>
                  <p style={{ maxWidth: '420px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    No necesitas servidor SMTP ni contraseñas expuestas. Inicia sesión directamente con Microsoft 365 o Google Workspace para enviar correos y sincronizar clientes en segundo plano.
                  </p>

                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.6rem' }}>
                    <button className="btn-primary" style={{ fontSize: '0.84rem', padding: '0.6rem 1.2rem' }} onClick={() => setViewMode('add_oauth')}>
                      Iniciar Sesión con Microsoft / Google
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {emailAccounts.map((acc) => {
                    const isCloud = acc.provider === 'microsoft_graph' || acc.provider === 'gmail_api';
                    return (
                      <div
                        key={acc.id}
                        style={{
                          padding: '1.1rem 1.25rem',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${acc.is_default ? 'rgba(37,99,235,0.4)' : 'var(--border-subtle)'}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.94rem', fontWeight: 700 }}>{acc.name}</span>
                            {acc.is_default && (
                              <span className="badge badge-low" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                <Star size={10} style={{ marginRight: '2px' }} /> Principal
                              </span>
                            )}
                            <span className={`badge ${isCloud ? 'badge-low' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                              {acc.provider === 'microsoft_graph' ? 'Microsoft 365 (Cloud API)' : acc.provider === 'gmail_api' ? 'Google API' : 'Servidor SMTP'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', marginTop: '0.2rem', fontWeight: 600 }}>
                            {acc.email}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {isCloud ? '✓ Conexión en vivo vía REST API (Sin credenciales SMTP)' : `Servidor: ${acc.smtp_host || 'Desconocido'} • Puerto ${acc.smtp_port || 587}`}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {!isCloud && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                              onClick={() => handleEdit(acc)}
                            >
                              Editar
                            </button>
                          )}
                          <button
                            className="btn-ghost"
                            style={{ padding: '0.35rem 0.5rem', color: 'var(--status-critical)' }}
                            onClick={() => handleDelete(acc.id)}
                            title="Eliminar cuenta"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* OAUTH LOGIN VIEW */}
          {viewMode === 'add_oauth' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Iniciar Sesión en tu Correo</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Selecciona tu plataforma. Se abrirá la ventana oficial de inicio de sesión de forma segura.
                </p>
              </div>

              {/* OAuth Buttons Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                
                {/* Microsoft 365 Card */}
                <div
                  style={{
                    padding: '1.4rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(0, 120, 212, 0.4)',
                    backgroundColor: 'rgba(0, 120, 212, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#0078d4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
                    ⊞
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700 }}>Microsoft 365</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Outlook corporativo, Hotmail, Teams y Office 365
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    style={{
                      width: '100%',
                      marginTop: '0.4rem',
                      backgroundColor: '#0078d4',
                      borderColor: '#0078d4',
                      fontSize: '0.82rem',
                    }}
                    onClick={() => handleOAuthLogin('microsoft')}
                    disabled={isLoggingInOAuth}
                  >
                    <ExternalLink size={14} />
                    {isLoggingInOAuth ? 'Esperando inicio...' : 'Conectar Microsoft'}
                  </button>
                </div>

                {/* Google Workspace Card */}
                <div
                  style={{
                    padding: '1.4rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(234, 67, 53, 0.4)',
                    backgroundColor: 'rgba(234, 67, 53, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#ea4335', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
                    G
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700 }}>Google Workspace</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Gmail, Google Workspace corporativo y cuentas @gmail
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    style={{
                      width: '100%',
                      marginTop: '0.4rem',
                      backgroundColor: '#ea4335',
                      borderColor: '#ea4335',
                      fontSize: '0.82rem',
                    }}
                    onClick={() => handleOAuthLogin('google')}
                    disabled={isLoggingInOAuth}
                  >
                    <ExternalLink size={14} />
                    {isLoggingInOAuth ? 'Esperando inicio...' : 'Conectar Google'}
                  </button>
                </div>
              </div>

              {/* Advanced Client ID / Tenant toggle */}
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
                >
                  {showAdvancedOAuth ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Opciones avanzadas de App Corporativa (Client ID / Tenant Azure opcional)
                </button>

                {showAdvancedOAuth && (
                  <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                        Custom Client / App ID
                      </label>
                      <input
                        type="text"
                        placeholder="Opcional: ID de Azure / Google"
                        value={customClientId}
                        onChange={(e) => setCustomClientId(e.target.value)}
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                        Tenant ID (Microsoft)
                      </label>
                      <input
                        type="text"
                        placeholder="common (por defecto)"
                        value={customTenantId}
                        onChange={(e) => setCustomTenantId(e.target.value)}
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback Alert */}
              {oauthFeedback && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: oauthFeedback.success ? 'var(--status-low-bg)' : 'var(--status-critical-bg)',
                  color: oauthFeedback.success ? 'var(--status-low)' : 'var(--status-critical)',
                  border: `1px solid ${oauthFeedback.success ? 'var(--status-low-border)' : 'var(--status-critical-border)'}`,
                  fontSize: '0.82rem',
                }}>
                  {oauthFeedback.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <div>{oauthFeedback.message}</div>
                </div>
              )}

              {/* Footer navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setViewMode('list')}>
                  ← Volver a Cuentas
                </button>
                <button type="button" className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={handleStartManualAdd}>
                  Configurar Servidor Manual SMTP/IMAP
                </button>
              </div>
            </div>
          )}

          {/* MANUAL SMTP/IMAP FORM VIEW */}
          {viewMode === 'add_manual' && (
            <form onSubmit={handleSaveManual} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Presets Row */}
              {!editingId && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    PLANTILLA RÁPIDA DE SERVIDOR:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.45rem' }}>
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className="btn-secondary"
                        style={{
                          fontSize: '0.77rem',
                          padding: '0.5rem 0.6rem',
                          textAlign: 'left',
                          justifyContent: 'flex-start',
                          backgroundColor: smtpHost === p.smtp_host && p.smtp_host !== '' ? 'var(--accent-glow)' : undefined,
                          borderColor: smtpHost === p.smtp_host && p.smtp_host !== '' ? 'var(--accent-primary)' : undefined,
                        }}
                        onClick={() => applyPreset(p)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* General info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Nombre Visible / Remitente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ing. Roberto Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Dirección de Correo *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tucorreo@empresa.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (!smtpUser) setSmtpUser(e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* SMTP Settings */}
              <div style={{ padding: '0.9rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Server size={14} /> SERVIDOR SALIENTE (SMTP)
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Servidor SMTP
                    </label>
                    <input
                      type="text"
                      placeholder="smtp.office365.com / smtp.gmail.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Puerto
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Usuario / Correo SMTP
                    </label>
                    <input
                      type="text"
                      placeholder="usuario@dominio.com"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Contraseña / App Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Set as default checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Establecer como cuenta de envío principal por defecto
              </label>

              {/* Test feedback banner */}
              {testResult && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: testResult.success ? 'var(--status-low-bg)' : 'var(--status-critical-bg)',
                  color: testResult.success ? 'var(--status-low)' : 'var(--status-critical)',
                  border: `1px solid ${testResult.success ? 'var(--status-low-border)' : 'var(--status-critical-border)'}`,
                  fontSize: '0.8rem',
                }}>
                  {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <div>{testResult.message}</div>
                </div>
              )}

              {/* Form Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                  onClick={handleTest}
                  disabled={isTesting}
                >
                  <RefreshCw size={14} style={{ animation: isTesting ? 'spin 1s linear infinite' : 'none' }} />
                  {isTesting ? 'Probando conexión...' : 'Probar Conexión'}
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => {
                      setViewMode('list');
                      setEditingId(null);
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ fontSize: '0.8rem' }} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : editingId ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
