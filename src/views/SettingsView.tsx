import React, { useState } from 'react';
import { useStore } from '../store';
import {
  User,
  Mail,
  PenTool,
  Sliders,
  Palette,
  Database,
  Download,
  Check,
  Bell,
  Volume2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ACCENT_PALETTES,
  formatSignature,
} from '../utils/theme-manager';
import { playNotificationSound, sendDesktopNotification } from '../utils/live-alerts';
import { BulkImportClientsModal } from '../components/BulkImportClientsModal';
import type { AccentColor, ConsultantProfile, ConsultantPreferences } from '../types';

interface SettingsViewProps {
  onOpenEmailAccountsModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenEmailAccountsModal }) => {
  const {
    consultantProfile,
    consultantPreferences,
    updateConsultantProfile,
    updateConsultantPreferences,
    exportFullBackupJson,
    clients,
    cases,
    commitments,
    notes,
    emailAccounts,
  } = useStore();

  const [profileForm, setProfileForm] = useState<ConsultantProfile>(consultantProfile);
  const [preferencesForm, setPreferencesForm] = useState<ConsultantPreferences>(consultantPreferences);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [backupSuccess, setBackupSuccess] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);

  const handleProfileChange = (field: keyof ConsultantProfile, value: string) => {
    const updated = { ...profileForm, [field]: value };
    setProfileForm(updated);
    updateConsultantProfile(updated);
    triggerSavedFeedback();
  };

  const handlePreferenceChange = <K extends keyof ConsultantPreferences>(
    field: K,
    value: ConsultantPreferences[K]
  ) => {
    const updated = { ...preferencesForm, [field]: value };
    setPreferencesForm(updated);
    updateConsultantPreferences(updated);
    triggerSavedFeedback();
  };

  const triggerSavedFeedback = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const insertSignatureVariable = (variable: string) => {
    const newSig = profileForm.email_signature + ` ${variable}`;
    handleProfileChange('email_signature', newSig);
  };

  const handleExportBackup = () => {
    const jsonStr = exportFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workdesk-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupSuccess(true);
    setTimeout(() => setBackupSuccess(false), 3000);
  };

  const handleTestSound = () => {
    playNotificationSound('critical');
  };

  const handleTestDesktopNotification = () => {
    sendDesktopNotification(
      'Prueba de Notificación WorkDesk',
      'Las alertas de compromisos y correos se mostrarán correctamente en tu escritorio.'
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
              Configuración & Personalización
            </h2>
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
                fontWeight: 700,
                fontSize: '0.72rem',
              }}
            >
              Consultor PRO
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Personaliza tu identidad profesional, firma de correos, alertas y apariencia visual.
          </p>
        </div>

        {savedSuccess && (
          <div
            className="animate-fade-in badge"
            style={{
              backgroundColor: 'var(--status-low-bg)',
              color: 'var(--status-low)',
              border: '1px solid var(--status-low-border)',
              padding: '0.4rem 0.8rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Check size={14} /> Cambios guardados automáticamente
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        
        {/* ── 1. Perfil del Consultor & Tarjeta ────────────────────── */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <User size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Identidad del Consultor</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Nombre Completo & Título
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                placeholder="Ej. Ing. Roberto Pérez"
                style={{ marginTop: '0.25rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Cargo / Especialidad
                </label>
                <input
                  type="text"
                  value={profileForm.role_title}
                  onChange={(e) => handleProfileChange('role_title', e.target.value)}
                  placeholder="Ej. Consultor Senior de TI"
                  style={{ marginTop: '0.25rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Empresa / Firma
                </label>
                <input
                  type="text"
                  value={profileForm.company}
                  onChange={(e) => handleProfileChange('company', e.target.value)}
                  placeholder="Ej. RP Consulting"
                  style={{ marginTop: '0.25rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Correo de Contacto
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  placeholder="roberto@consultoria.com"
                  style={{ marginTop: '0.25rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  placeholder="+56 9 1234 5678"
                  style={{ marginTop: '0.25rem' }}
                />
              </div>
            </div>
          </div>

          {/* Business Card Preview */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.02) 100%)',
              border: '1px solid var(--border-subtle)',
              marginTop: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vista Previa de Tarjeta Ejecutiva
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  boxShadow: '0 0 12px var(--accent-glow)',
                }}
              >
                {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {profileForm.name || 'Nombre del Consultor'}
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {profileForm.role_title || 'Cargo Profesional'} • {profileForm.company || 'Empresa'}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {profileForm.email} {profileForm.phone ? `• ${profileForm.phone}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Editor de Firma de Correo ─────────────────────────── */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <PenTool size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Firma Automática para Correos</h3>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Esta firma se insertará automáticamente al redactar correos de seguimiento y propuestas.
          </p>

          {/* Variable chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '0.2rem' }}>
              Insertar:
            </span>
            {['{nombre}', '{cargo}', '{empresa}', '{email}', '{telefono}'].map((v) => (
              <button
                key={v}
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
                onClick={() => insertSignatureVariable(v)}
              >
                + {v}
              </button>
            ))}
          </div>

          <textarea
            rows={5}
            value={profileForm.email_signature}
            onChange={(e) => handleProfileChange('email_signature', e.target.value)}
            style={{
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              lineHeight: 1.4,
            }}
          />

          {/* Signature Preview */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vista Previa Renderizada
            </span>
            <div
              style={{
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
              }}
            >
              {formatSignature(profileForm.email_signature, profileForm)}
            </div>
          </div>
        </div>

        {/* ── 3. Apariencia & Color de Acento ──────────────────────── */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <Palette size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Apariencia & Paleta de Acento</h3>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Color de Acento de la Interfaz
            </label>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Define el color de los botones, badges, halos e indicadores principales.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {(Object.keys(ACCENT_PALETTES) as AccentColor[]).map((key) => {
                const p = ACCENT_PALETTES[key];
                const isSelected = preferencesForm.accent_color === key;
                return (
                  <button
                    key={key}
                    type="button"
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-main)',
                      border: isSelected ? `2px solid ${p.hex}` : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      boxShadow: isSelected ? `0 0 10px ${p.glowRgba}` : 'none',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handlePreferenceChange('accent_color', key)}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: p.hex,
                        boxShadow: `0 0 6px ${p.glowRgba}`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 800 : 600, color: 'var(--text-primary)' }}>
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 4. Preferencias Operativas & Alertas ─────────────────── */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <Sliders size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Reglas Operativas & Alertas</h3>
          </div>

          {/* Inactive client threshold */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Alerta de Clientes sin Seguimiento
            </label>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Destacar clientes en el dashboard si no tienen actividad en:
            </p>
            <select
              value={preferencesForm.inactive_client_days}
              onChange={(e) => handlePreferenceChange('inactive_client_days', Number(e.target.value))}
              style={{ fontSize: '0.82rem' }}
            >
              <option value={7}>7 días (Alta atención)</option>
              <option value={14}>14 días (Recomendado consultoría)</option>
              <option value={21}>21 días (Ciclos largos)</option>
              <option value={30}>30 días (Mensual)</option>
            </select>
          </div>

          {/* Sound toggle & test */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Volume2 size={15} color="var(--accent-primary)" /> Sonido de Alertas en Vivo
              </span>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Chime sintetizado al detectar entregas vencidas o correos.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                onClick={handleTestSound}
                title="Probar sonido"
              >
                🔊 Probar
              </button>
              <input
                type="checkbox"
                checked={preferencesForm.enable_sound_alerts}
                onChange={(e) => handlePreferenceChange('enable_sound_alerts', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Desktop notification toggle & test */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Bell size={15} color="var(--accent-primary)" /> Notificaciones de Escritorio (OS)
              </span>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Avisos nativos de Windows cuando la app está minimizada.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                onClick={handleTestDesktopNotification}
                title="Probar notificación OS"
              >
                🔔 Probar
              </button>
              <input
                type="checkbox"
                checked={preferencesForm.enable_desktop_notifications}
                onChange={(e) => handlePreferenceChange('enable_desktop_notifications', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── 5. Cuentas de Correo & Copias de Seguridad (Full Width) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        
        {/* Email Accounts Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Mail size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Cuentas de Correo Conectadas</h3>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              {emailAccounts.length === 0
                ? 'No tienes cuentas de correo conectadas. Conecta tu cuenta corporativa Microsoft 365 o Google Workspace.'
                : `Tienes ${emailAccounts.length} cuenta(s) de correo configurada(s).`}
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.6rem 1rem', alignSelf: 'flex-start' }}
            onClick={onOpenEmailAccountsModal}
          >
            <Mail size={14} /> Gestionar Cuentas de Correo (OAuth / SMTP)
          </button>
        </div>

        {/* Database & Backup Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Database size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Copia de Seguridad & Datos</h3>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              Respalda todos tus clientes ({clients.length}), casos ({cases.length}), compromisos ({commitments.length}) y notas ({notes.length}) en un archivo JSON portable.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.6rem 1rem' }}
              onClick={handleExportBackup}
            >
              <Download size={14} /> Exportar Backup (JSON)
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.6rem 1rem' }}
              onClick={() => setIsBulkImportOpen(true)}
            >
              <FileSpreadsheet size={14} /> Importar Clientes (Excel / CSV)
            </button>

            {backupSuccess && (
              <span style={{ fontSize: '0.75rem', color: 'var(--status-low)', fontWeight: 600 }}>
                ✓ Descargado
              </span>
            )}
          </div>
        </div>

      </div>

      <BulkImportClientsModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />

    </div>
  );
};
