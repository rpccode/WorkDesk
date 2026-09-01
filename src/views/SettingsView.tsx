import React, { useState } from 'react';
import { useStore } from '../store';
import {
  User,
  Mail,
  PenTool,
  Palette,
  Database,
  Download,
  Check,
  Bell,
  Volume2,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  HardDrive,
  Radio,
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

type SettingsTab = 'perfil' | 'segundo_plano' | 'apariencia' | 'cuentas' | 'datos';

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
    addNotification,
  } = useStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('perfil');
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
    try {
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
      playNotificationSound('success');
      addNotification({
        type: 'success',
        title: 'Copia de Seguridad Generada',
        message: 'El archivo JSON con todos tus datos se ha descargado.',
        show_toast: true,
      });
      setTimeout(() => setBackupSuccess(false), 3000);
    } catch (err: any) {
      addNotification({
        type: 'critical',
        title: 'Error de Exportación',
        message: err.message || 'No se pudo generar la copia de seguridad.',
        show_toast: true,
      });
    }
  };

  const handleTestSound = () => {
    playNotificationSound('critical');
    addNotification({
      type: 'info',
      title: 'Prueba de Sonido',
      message: 'Sonido de notificación emitido con éxito.',
      show_toast: true,
    });
  };

  const handleTestDesktopNotification = () => {
    sendDesktopNotification(
      'Prueba de Notificación WorkDesk',
      'Las alertas de compromisos y correos se mostrarán correctamente en tu escritorio de Windows.'
    );
    addNotification({
      type: 'info',
      title: 'Notificación de Escritorio',
      message: 'Se envió una alerta de prueba al centro de notificaciones de Windows.',
      show_toast: true,
    });
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'perfil',
      label: 'Perfil & Firma',
      icon: <User size={16} />,
    },
    {
      id: 'segundo_plano',
      label: 'Segundo Plano & Alertas',
      icon: <Zap size={16} />,
      badge: preferencesForm.enable_background_watchdog ? 'Activo' : undefined,
    },
    {
      id: 'apariencia',
      label: 'Apariencia & Temas',
      icon: <Palette size={16} />,
    },
    {
      id: 'cuentas',
      label: 'Cuentas de Correo',
      icon: <Mail size={16} />,
      badge: emailAccounts.length > 0 ? `${emailAccounts.length}` : undefined,
    },
    {
      id: 'datos',
      label: 'Datos & Respaldos',
      icon: <HardDrive size={16} />,
    },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      
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
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
              Configuración del Sistema
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
            Personaliza tu identidad profesional, firma de correos, monitor de segundo plano y copias de seguridad.
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

      {/* ── Navigation Tabs ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.6rem 1.1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'var(--accent-glow)' : 'var(--bg-main)',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: PERFIL & FIRMA ───────────────────────────────────── */}
      {activeTab === 'perfil' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
          
          {/* Identidad del Consultor */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <User size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Identidad del Consultor</h3>
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
                  style={{ marginTop: '0.25rem', width: '100%' }}
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
                    style={{ marginTop: '0.25rem', width: '100%' }}
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
                    style={{ marginTop: '0.25rem', width: '100%' }}
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
                    style={{ marginTop: '0.25rem', width: '100%' }}
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
                    style={{ marginTop: '0.25rem', width: '100%' }}
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
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {profileForm.name || 'Nombre del Consultor'}
                  </h4>
                  <p style={{ fontSize: '0.76rem', color: 'var(--accent-primary)', fontWeight: 600, margin: '0.15rem 0 0 0' }}>
                    {profileForm.role_title || 'Cargo Profesional'} • {profileForm.company || 'Empresa'}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                    {profileForm.email} {profileForm.phone ? `• ${profileForm.phone}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Editor de Firma de Correo */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <PenTool size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Firma Automática para Correos</h3>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Esta firma se insertará automáticamente al redactar minutas, correos de seguimiento y propuestas.
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
                width: '100%',
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

        </div>
      )}

      {/* ── TAB 2: SEGUNDO PLANO & ALERTAS ──────────────────────────── */}
      {activeTab === 'segundo_plano' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
          
          {/* Motor en Segundo Plano */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Zap size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Motor de Tareas en Segundo Plano</h3>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Permite que WorkDesk trabaje silenciosamente monitoreando plazos de compromisos, respaldando borradores y actualizando el widget del sistema.
            </p>

            {/* Watchdog toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={15} color="var(--status-low)" /> Vigilante SLA & Compromisos Críticos
                </span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Evalúa periódicamente los acuerdos vencidos y dispara alertas inmediatas.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferencesForm.enable_background_watchdog}
                onChange={(e) => handlePreferenceChange('enable_background_watchdog', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Interval selection */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  Frecuencia de Monitoreo
                </span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Intervalo de escaneo silencioso y actualización de indicadores.
                </p>
              </div>
              <select
                value={preferencesForm.background_check_interval_seconds || 60}
                onChange={(e) => handlePreferenceChange('background_check_interval_seconds', Number(e.target.value))}
                style={{ fontSize: '0.82rem' }}
              >
                <option value={30}>Cada 30 segundos (Alta velocidad)</option>
                <option value={60}>Cada 60 segundos (Recomendado)</option>
                <option value={120}>Cada 2 minutos</option>
                <option value={300}>Cada 5 minutos (Ahorro de batería)</option>
              </select>
            </div>

            {/* Email Background Sync */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={15} color="var(--accent-primary)" /> Sincronización Silenciosa de Correos
                </span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Consulta nuevas respuestas de clientes en segundo plano sin congelar la app.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferencesForm.enable_background_email_sync}
                onChange={(e) => handlePreferenceChange('enable_background_email_sync', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Auto Drafts Backup */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Database size={15} color="var(--accent-primary)" /> Respaldo Automático de Notas & Borradores
                </span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Guarda notas y redacciones continuamente en la base de datos local.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferencesForm.enable_auto_drafts}
                onChange={(e) => handlePreferenceChange('enable_auto_drafts', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Notificaciones & Reglas Operativas */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Bell size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Canales de Notificación & Reglas</h3>
            </div>

            {/* Sound toggle & test */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Volume2 size={15} color="var(--accent-primary)" /> Sonido de Alertas y Acciones
                </span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Chimes sintetizados al confirmar guardados o detectar vencimientos.
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Radio size={15} color="var(--accent-primary)" /> Notificaciones de Escritorio (Windows OS)
                </span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Avisos flotantes nativos cuando la ventana está minimizada o en segundo plano.
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

            {/* Inactive client threshold */}
            <div style={{ padding: '0.75rem 0', borderTop: '1px solid var(--border-subtle)' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Alerta de Clientes Inactivos (Sin Seguimiento)
              </label>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.2rem 0 0.5rem 0' }}>
                Destacar clientes en el panel principal si no registran actividad en:
              </p>
              <select
                value={preferencesForm.inactive_client_days}
                onChange={(e) => handlePreferenceChange('inactive_client_days', Number(e.target.value))}
                style={{ fontSize: '0.82rem', width: '100%' }}
              >
                <option value={7}>7 días (Atención Prioritaria)</option>
                <option value={14}>14 días (Recomendado para Consultoría)</option>
                <option value={21}>21 días (Ciclos Largos de Proyecto)</option>
                <option value={30}>30 días (Revisión Mensual)</option>
              </select>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 3: APARIENCIA & TEMAS ───────────────────────────────── */}
      {activeTab === 'apariencia' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Palette size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Paleta de Acento & Personalización Visual</h3>
            </div>

            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                Selecciona la tonalidad institucional que aplicará a botones, badges, halos de foco y widgets principales.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                {(Object.keys(ACCENT_PALETTES) as AccentColor[]).map((key) => {
                  const p = ACCENT_PALETTES[key];
                  const isSelected = preferencesForm.accent_color === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-main)',
                        border: isSelected ? `2px solid ${p.hex}` : '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: isSelected ? `0 0 14px ${p.glowRgba}` : 'none',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => handlePreferenceChange('accent_color', key)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: p.hex,
                            boxShadow: `0 0 8px ${p.glowRgba}`,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '0.84rem', fontWeight: isSelected ? 800 : 600, color: 'var(--text-primary)' }}>
                          {p.name}
                        </span>
                      </div>

                      {isSelected && <Check size={16} style={{ color: p.hex }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 4: CUENTAS DE CORREO ────────────────────────────────── */}
      {activeTab === 'cuentas' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Cuentas de Correo Electrónico Conectadas</h3>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={onOpenEmailAccountsModal}
              >
                + Conectar Nueva Cuenta
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Sincroniza tus correos de clientes y despacha cotizaciones y reportes directamente desde WorkDesk mediante OAuth2 o SMTP/IMAP corporativo.
            </p>

            {emailAccounts.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px dashed var(--border-medium)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                  <Mail size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>No hay cuentas de correo vinculadas</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                    Conecta Microsoft 365, Google Workspace o tu servidor SMTP empresarial.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}
                  onClick={onOpenEmailAccountsModal}
                >
                  <Mail size={14} /> Abrir Asistente de Conexión de Correo
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {emailAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          padding: '0.5rem',
                          borderRadius: '8px',
                          backgroundColor:
                            acc.provider === 'microsoft_graph'
                              ? 'rgba(0, 120, 212, 0.15)'
                              : acc.provider === 'gmail_api'
                              ? 'rgba(234, 67, 53, 0.15)'
                              : 'var(--accent-glow)',
                          color:
                            acc.provider === 'microsoft_graph'
                              ? '#0078d4'
                              : acc.provider === 'gmail_api'
                              ? '#ea4335'
                              : 'var(--accent-primary)',
                        }}
                      >
                        <Mail size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                          {acc.email}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Proveedor:{' '}
                          <strong style={{ textTransform: 'uppercase' }}>
                            {acc.provider === 'microsoft_graph'
                              ? 'Microsoft 365'
                              : acc.provider === 'gmail_api'
                              ? 'Google Workspace'
                              : 'SMTP / IMAP'}
                          </strong>{' '}
                          • {acc.is_default ? 'Cuenta Predeterminada' : 'Cuenta Secundaria'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.76rem', padding: '0.35rem 0.7rem' }}
                      onClick={onOpenEmailAccountsModal}
                    >
                      Configurar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── TAB 5: DATOS & RESPALDOS ────────────────────────────────── */}
      {activeTab === 'datos' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
            
            {/* Resumen del Repositorio de Datos */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <HardDrive size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Almacenamiento Local SQLite</h3>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Tu información está almacenada localmente con cifrado y máxima privacidad sin depender de servidores externos.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clientes Registrados</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)', display: 'block' }}>{clients.length}</span>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Casos y Proyectos</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{cases.length}</span>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compromisos SLA</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{commitments.length}</span>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bitácora y Notas</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{notes.length}</span>
                </div>
              </div>
            </div>

            {/* Acciones de Backup e Importación */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <Database size={18} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Copia de Seguridad & Migración</h3>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.75rem', margin: 0 }}>
                  Descarga un respaldo integral de toda tu base de datos o importa bases de clientes desde hojas de cálculo de Excel.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.84rem', padding: '0.7rem 1.25rem', width: '100%', justifyContent: 'center' }}
                  onClick={handleExportBackup}
                >
                  <Download size={16} /> Exportar Copia de Seguridad Completa (JSON)
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.84rem', padding: '0.7rem 1.25rem', width: '100%', justifyContent: 'center' }}
                  onClick={() => setIsBulkImportOpen(true)}
                >
                  <FileSpreadsheet size={16} /> Importar Base de Clientes (Excel / CSV)
                </button>

                {backupSuccess && (
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--status-low-bg)', border: '1px solid var(--status-low-border)', borderRadius: '4px', textAlign: 'center', color: 'var(--status-low)', fontSize: '0.76rem', fontWeight: 700 }}>
                    ✓ Copia de seguridad exportada y guardada en Descargas
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Modal de Importación Masiva */}
      <BulkImportClientsModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />

    </div>
  );
};
