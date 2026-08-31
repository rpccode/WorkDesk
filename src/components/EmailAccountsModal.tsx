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
  const { emailAccounts, saveEmailAccount, deleteEmailAccount, testEmailConnection } = useStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const applyPreset = (preset: Preset) => {
    setProvider(preset.provider);
    setSmtpHost(preset.smtp_host);
    setSmtpPort(preset.smtp_port);
    setImapHost(preset.imap_host);
    setImapPort(preset.imap_port);
    if (!name) setName(preset.name.split(' ')[0]);
  };

  const handleStartAdd = () => {
    setIsAdding(true);
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
    setIsAdding(true);
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

  const handleSave = async (e: React.FormEvent) => {
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
      setIsAdding(false);
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
        style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
              <Mail size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Cuentas de Correo & Sincronización</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Configura tus cuentas para envío directo y seguimiento bidireccional
              </p>
            </div>
          </div>
          <button className="btn-ghost" style={{ padding: '0.35rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {!isAdding ? (
            <>
              {/* Accounts List View */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  CUENTAS REGISTRADAS ({emailAccounts.length})
                </span>
                <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={handleStartAdd}>
                  <Plus size={14} /> Vincular Nueva Cuenta
                </button>
              </div>

              {emailAccounts.length === 0 ? (
                <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                  <Server size={36} color="var(--accent-primary)" />
                  <p style={{ maxWidth: '340px' }}>
                    No tienes cuentas de correo conectadas. Vincula tu cuenta de Outlook, Gmail o servidor corporativo para enviar directamente desde WorkDesk.
                  </p>
                  <button className="btn-primary" style={{ marginTop: '0.5rem' }} onClick={handleStartAdd}>
                    <Plus size={15} /> Configurar Primera Cuenta
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {emailAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      style={{
                        padding: '1rem 1.2rem',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${acc.is_default ? 'rgba(37,99,235,0.35)' : 'var(--border-subtle)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>{acc.name}</span>
                          {acc.is_default && (
                            <span className="badge badge-low" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              <Star size={10} style={{ marginRight: '2px' }} /> Principal
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '0.15rem' }}>
                          {acc.email}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Servidor: {acc.smtp_host || 'Cloud API'} • Puerto {acc.smtp_port || 587}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                          onClick={() => handleEdit(acc)}
                        >
                          Editar
                        </button>
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
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Add / Edit Form */
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Presets Row */}
              {!editingId && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    PLANTILLA RÁPIDA DE SERVICIO:
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
                      setIsAdding(false);
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
