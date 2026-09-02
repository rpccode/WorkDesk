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
  Power,
  Layers,
  Sparkles,
  Bot,
  Eye,
  EyeOff,
  Cpu,
  Terminal,
  Trash2,
  Copy,
} from 'lucide-react';
import { api } from '../api/tauri';
import {
  ACCENT_PALETTES,
  formatSignature,
} from '../utils/theme-manager';
import { playNotificationSound, sendDesktopNotification } from '../utils/live-alerts';
import { BulkImportClientsModal } from '../components/BulkImportClientsModal';
import { CheckUpdatesButton } from '../components/UpdateChecker';
import { callAI } from '../services/ai-copilot';
import {
  getErrorLogs,
  clearErrorLogs,
  downloadErrorLogsTxt,
  copyErrorLogsToClipboard,
  type AppErrorLogEntry,
} from '../utils/error-logger';
import type { AccentColor, ConsultantProfile, ConsultantPreferences, AIConfig, AIProvider } from '../types';

interface SettingsViewProps {
  onOpenEmailAccountsModal?: () => void;
}

type SettingsTab = 'perfil' | 'ai_copilot' | 'segundo_plano' | 'apariencia' | 'cuentas' | 'datos';

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenEmailAccountsModal }) => {
  const {
    consultantProfile,
    consultantPreferences,
    aiConfig,
    updateAIConfig,
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
  const [aiForm, setAiForm] = useState<AIConfig>(aiConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [backupSuccess, setBackupSuccess] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const [errorLogs, setErrorLogs] = useState<AppErrorLogEntry[]>(() => getErrorLogs());

  const refreshErrorLogs = () => {
    setErrorLogs(getErrorLogs());
  };

  const handleClearErrorLogs = () => {
    clearErrorLogs();
    setErrorLogs([]);
    addNotification({
      type: 'info',
      title: 'Registro de errores vaciado',
      message: 'Se limpió el historial de diagnóstico.',
      show_toast: true,
    });
  };

  const handleDownloadErrorLogs = () => {
    downloadErrorLogsTxt(errorLogs);
    addNotification({
      type: 'success',
      title: 'Log Descargado',
      message: 'El archivo .txt con el registro de errores se ha descargado correctamente.',
      show_toast: true,
    });
  };

  const handleCopyErrorLogs = async () => {
    const success = await copyErrorLogsToClipboard(errorLogs);
    if (success) {
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
      addNotification({
        type: 'success',
        title: 'Registro Copiado',
        message: 'El log de errores y diagnóstico está listo para pegar.',
        show_toast: true,
      });
    }
  };

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

  const handleAIChange = <K extends keyof AIConfig>(field: K, value: AIConfig[K]) => {
    const updated = { ...aiForm, [field]: value };
    setAiForm(updated);
    updateAIConfig(updated);
    triggerSavedFeedback();
  };

  const handleTestAIConnection = async () => {
    setIsTestingAI(true);
    setAiTestResult(null);
    try {
      const response = await callAI(
        'Responde exactamente con la frase "Conexión a WorkDesk AI Copilot exitosa." en una sola línea.',
        'Eres un asistente de verificación de conectividad.',
        aiForm,
        0.1
      );
      setAiTestResult({
        success: true,
        message: response.includes('exitosa') ? '✓ Conexión establecida correctamente.' : `Respuesta del modelo: ${response.slice(0, 100)}`,
      });
      playNotificationSound('success');
      addNotification({
        type: 'success',
        title: 'IA Conectada',
        message: `El proveedor ${aiForm.provider.toUpperCase()} respondió exitosamente.`,
        show_toast: true,
      });
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: err.message || 'Error al conectar con la API de IA.',
      });
      playNotificationSound('critical');
      addNotification({
        type: 'critical',
        title: 'Error de Conexión IA',
        message: err.message || 'No se pudo validar la API Key.',
        show_toast: true,
      });
    } finally {
      setIsTestingAI(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'perfil',
      label: 'Perfil & Firma',
      icon: <User size={16} />,
    },
    {
      id: 'ai_copilot',
      label: 'AI Copilot',
      icon: <Sparkles size={16} />,
      badge: aiConfig.isConfigured ? 'Conectado' : 'Sin configurar',
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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', paddingBottom: '3rem' }}>
      
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

      {/* ── TAB: AI COPILOT ─────────────────────────────────────────── */}
      {activeTab === 'ai_copilot' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
          
          {/* Configuración del Proveedor y API Key */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Motor de Inteligencia Artificial</h3>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              WorkDesk se conecta directamente con tu proveedor de IA preferido para potenciar resúmenes, extracción de compromisos, preparación de reuniones y redacción contextual.
            </p>

            {/* Selector de Proveedor */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Proveedor de IA
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.35rem' }}>
                {[
                  { id: 'gemini', name: 'Google Gemini', badge: 'Recomendado / Gratis', defaultModel: 'gemini-2.5-flash' },
                  { id: 'openai', name: 'OpenAI (ChatGPT)', badge: 'GPT-4o mini', defaultModel: 'gpt-4o-mini' },
                  { id: 'anthropic', name: 'Anthropic Claude', badge: 'Claude 3.5 Haiku', defaultModel: 'claude-3-5-haiku-20241022' },
                  { id: 'ollama', name: 'Ollama Local', badge: '100% Offline', defaultModel: 'llama3' },
                ].map((prov) => {
                  const isSelected = aiForm.provider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => {
                        handleAIChange('provider', prov.id as AIProvider);
                        if (!aiForm.model || aiForm.model.includes('gemini') || aiForm.model.includes('gpt') || aiForm.model.includes('claude') || aiForm.model.includes('llama')) {
                          handleAIChange('model', prov.defaultModel);
                        }
                      }}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        backgroundColor: isSelected ? 'var(--accent-glow)' : 'var(--bg-surface-elevated)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{prov.name}</div>
                      <div style={{ fontSize: '0.68rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {prov.badge}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key Input (if not Ollama) */}
            {aiForm.provider !== 'ollama' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    API Key ({aiForm.provider.toUpperCase()})
                  </label>
                  {aiForm.provider === 'gemini' && (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', textDecoration: 'none' }}
                    >
                      Obtener clave gratis en Google AI Studio ↗
                    </a>
                  )}
                </div>
                <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={aiForm.apiKey || ''}
                    onChange={(e) => handleAIChange('apiKey', e.target.value)}
                    placeholder={aiForm.provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                    style={{ width: '100%', paddingRight: '2.5rem', fontFamily: 'monospace', fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  URL Base de Ollama
                </label>
                <input
                  type="text"
                  value={aiForm.ollamaBaseUrl || 'http://localhost:11434'}
                  onChange={(e) => handleAIChange('ollamaBaseUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                  style={{ marginTop: '0.25rem', width: '100%', fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
              </div>
            )}

            {/* Modelo — Combobox con presets por proveedor */}
            {(() => {
              const MODEL_OPTIONS: Record<string, { id: string; label: string; tag?: string }[]> = {
                gemini: [
                  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: '⚡ Rápido · Recomendado' },
                  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tag: '🧠 Avanzado · Preciso' },
                  { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Experimental', tag: '🔬 Experimental' },
                  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', tag: '🔄 Estable' },
                  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', tag: '💪 Potente' },
                  { id: 'custom', label: '✏️ Otro modelo (ingresar manualmente)', tag: '' },
                ],
                openai: [
                  { id: 'gpt-4o', label: 'GPT-4o', tag: '🧠 El más capaz' },
                  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', tag: '⚡ Rápido · Económico · Recomendado' },
                  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', tag: '🔍 Contexto largo' },
                  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', tag: '🏃 Ultra rápido' },
                  { id: 'o1-mini', label: 'o1 Mini', tag: '🤔 Razonamiento' },
                  { id: 'custom', label: '✏️ Otro modelo (ingresar manualmente)', tag: '' },
                ],
                anthropic: [
                  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', tag: '🏆 El más poderoso' },
                  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', tag: '⚖️ Equilibrado · Recomendado' },
                  { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet', tag: '🧠 Razonamiento extendido' },
                  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', tag: '✨ Alta calidad' },
                  { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', tag: '⚡ Rápido · Económico' },
                  { id: 'custom', label: '✏️ Otro modelo (ingresar manualmente)', tag: '' },
                ],
                ollama: [
                  { id: 'llama3.1', label: 'Llama 3.1', tag: '⭐ Recomendado' },
                  { id: 'llama3', label: 'Llama 3', tag: '🦙 Estable' },
                  { id: 'llama3:8b', label: 'Llama 3 8B', tag: '💨 Ligero' },
                  { id: 'mistral', label: 'Mistral', tag: '🌪️ Eficiente' },
                  { id: 'mixtral', label: 'Mixtral 8x7B', tag: '🔀 Mezcla de expertos' },
                  { id: 'codellama', label: 'CodeLlama', tag: '💻 Para código' },
                  { id: 'phi3', label: 'Phi-3', tag: '🔬 Compacto · Microsoft' },
                  { id: 'gemma2', label: 'Gemma 2', tag: '🌀 Google' },
                  { id: 'custom', label: '✏️ Otro modelo (ingresar manualmente)', tag: '' },
                ],
              };

              const options = MODEL_OPTIONS[aiForm.provider] || MODEL_OPTIONS.gemini;
              const isCustom = !options.slice(0, -1).find((o) => o.id === aiForm.model);

              return (
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Modelo de IA
                  </label>

                  {/* Preset grid chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.4rem' }}>
                    {options.slice(0, -1).map((opt) => {
                      const isActive = aiForm.model === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAIChange('model', opt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: `1.5px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                            backgroundColor: isActive
                              ? 'var(--accent-glow)'
                              : 'var(--bg-surface-elevated)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--border-medium)',
                            flexShrink: 0,
                          }} />
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.82rem',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                            flex: 1,
                          }}>
                            {opt.label}
                          </span>
                          {opt.tag && (
                            <span style={{
                              fontSize: '0.65rem',
                              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                              fontWeight: 500,
                              flexShrink: 0,
                            }}>
                              {opt.tag}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Custom / free-text entry */}
                    <div
                      style={{
                        border: `1.5px dashed ${isCustom ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: isCustom ? 'var(--accent-glow)' : 'transparent',
                      }}
                    >
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: isCustom ? 'var(--accent-primary)' : 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        ✏️ Ingresar ID de modelo manualmente
                      </div>
                      <input
                        type="text"
                        value={isCustom ? (aiForm.model || '') : ''}
                        onFocus={() => {
                          if (!isCustom) handleAIChange('model', '');
                        }}
                        onChange={(e) => handleAIChange('model', e.target.value)}
                        placeholder={
                          aiForm.provider === 'gemini'
                            ? 'ej: gemini-2.5-flash-8b'
                            : aiForm.provider === 'openai'
                            ? 'ej: gpt-4o-2024-11-20'
                            : aiForm.provider === 'anthropic'
                            ? 'ej: claude-3-opus-20240229'
                            : 'ej: llama3:70b'
                        }
                        style={{
                          width: '100%',
                          fontFamily: 'monospace',
                          fontSize: '0.82rem',
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      />
                    </div>
                  </div>

                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Modelo seleccionado: <code style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{aiForm.model || '(ninguno)'}</code>
                  </span>
                </div>
              );
            })()}

            {/* Test Connection Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleTestAIConnection}
                disabled={isTestingAI || (!aiForm.apiKey && aiForm.provider !== 'ollama')}
                style={{ justifyContent: 'center', gap: '0.5rem' }}
              >
                {isTestingAI ? (
                  <>
                    <Cpu size={16} className="animate-spin" /> Verificando conexión...
                  </>
                ) : (
                  <>
                    <Bot size={16} /> Probar Conexión con la IA
                  </>
                )}
              </button>

              {aiTestResult && (
                <div
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    backgroundColor: aiTestResult.success ? 'var(--status-low-bg)' : 'var(--status-high-bg)',
                    border: `1px solid ${aiTestResult.success ? 'var(--status-low-border)' : 'var(--status-high-border)'}`,
                    color: aiTestResult.success ? 'var(--status-low)' : 'var(--status-high)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {aiTestResult.success ? <Check size={15} /> : <ShieldCheck size={15} />}
                  <span>{aiTestResult.message}</span>
                </div>
              )}
            </div>

          </div>

          {/* Capacidades & Prompts del Copilot */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Bot size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Capacidades Activas en WorkDesk</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { title: '🌅 Morning Brief Diario', desc: 'Resumen ejecutivo diario con foco de jornada y bloqueos urgentes en Mi Día.' },
                { title: '📋 Extracción de Compromisos', desc: 'Transforma notas o correos desestructurados en compromisos rastreables.' },
                { title: '📄 Resumen & Minuta de Caso', desc: 'Sintetiza el estado de cualquier caso para directores y clientes.' },
                { title: '🗓️ Preparación de Reunión', desc: 'Genera guías con agenda, preguntas incisivas y puntos a destrabar.' },
                { title: '✉️ Redacción Contextual de Correos', desc: 'Escribe correos en tonos Formal, Firme o Técnico con un click.' },
                { title: '⚠️ Radar de Casos Abandonados', desc: 'Detecta casos a la deriva o sin actividad reciente.' },
                { title: '🔗 Casos Similares', desc: 'Encuentra antecedentes y soluciones de casos pasados.' },
                { title: '💬 Copilot Q&A (Ctrl + I)', desc: 'Chat asistente que razona sobre toda tu información en tiempo real.' },
              ].map((cap, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cap.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{cap.desc}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 'auto',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-glow)',
                border: '1px solid var(--accent-border)',
                fontSize: '0.74rem',
                color: 'var(--accent-primary)',
              }}
            >
              🔒 <strong>Privacidad:</strong> Tus datos operacionales solo se envían al proveedor de IA configurado en el momento exacto que solicitas una acción. Las claves se almacenan localmente en tu equipo.
            </div>

          </div>

        </div>
      )}
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

            {/* Close to Tray / Background Execution */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={15} color="var(--status-low)" /> Mantener en Bandeja del Sistema (System Tray)
                </span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Al cerrar la ventana ("X"), WorkDesk sigue activo en segundo plano para no interrumpir el seguimiento ni las notificaciones.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferencesForm.close_to_tray !== false}
                onChange={(e) => handlePreferenceChange('close_to_tray', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Exit Completely Action */}
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-critical)' }}>
                  ¿Deseas cerrar WorkDesk por completo?
                </span>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                  Detiene todos los servicios en segundo plano y finaliza el proceso de la aplicación.
                </p>
              </div>
              <button
                type="button"
                className="btn-danger"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que deseas salir y detener todos los servicios de WorkDesk?')) {
                    api.exitApp();
                  }
                }}
              >
                <Power size={13} /> Salir Completamente
              </button>
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

            {/* Actualizaciones del Software */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <ShieldCheck size={18} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Actualizaciones del Sistema</h3>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.75rem', margin: 0 }}>
                  WorkDesk busca automáticamente nuevas versiones al iniciar. También puedes buscar e instalar mejoras manualmente.
                </p>
              </div>

              <div>
                <CheckUpdatesButton />
              </div>
            </div>

            {/* Diagnóstico y Registro de Errores */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Terminal size={18} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Registro de Errores & Diagnóstico Técnico</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
                    onClick={refreshErrorLogs}
                  >
                    Actualizar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', gap: '0.35rem' }}
                    onClick={handleDownloadErrorLogs}
                    disabled={errorLogs.length === 0}
                  >
                    <Download size={13} /> Exportar Log (.txt)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
                    onClick={handleCopyErrorLogs}
                    disabled={errorLogs.length === 0}
                  >
                    {copiedLog ? <Check size={13} color="var(--status-low)" /> : <Copy size={13} />}
                    {copiedLog ? '¡Copiado!' : 'Copiar Registro'}
                  </button>
                  {errorLogs.length > 0 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem', color: 'var(--status-critical)' }}
                      onClick={handleClearErrorLogs}
                    >
                      <Trash2 size={13} /> Limpiar
                    </button>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Todos los errores no controlados, excepciones de interfaz y advertencias de renderizado quedan registrados aquí para facilitar el soporte técnico.
              </p>

              {errorLogs.length === 0 ? (
                <div
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    textAlign: 'center',
                    color: 'var(--status-low)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  ✓ No se registran errores recientes en la aplicación. Todo funciona con normalidad.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {errorLogs.map((log, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--status-critical)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.2rem', fontSize: '0.7rem' }}>
                        <span>#{idx + 1}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ color: 'var(--status-critical)', fontWeight: 700 }}>
                        {log.message}
                      </div>
                      {log.stack && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '0.3rem', whiteSpace: 'pre-wrap', maxHeight: '60px', overflow: 'hidden' }}>
                          {log.stack}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
