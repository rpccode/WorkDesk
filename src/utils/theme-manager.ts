import type { ConsultantProfile, ConsultantPreferences, AccentColor } from '../types';

export const DEFAULT_CONSULTANT_PROFILE: ConsultantProfile = {
  name: 'Ing. Roberto Pérez',
  role_title: 'Consultor de Operaciones & IT',
  company: 'Consultoría & Gestión',
  email: 'roberto@consultoria.com',
  phone: '+56 9 1234 5678',
  email_signature: 'Saludos cordiales,\n\n{nombre}\n{cargo} • {empresa}\n📱 {telefono} | ✉️ {email}',
};

export const DEFAULT_CONSULTANT_PREFERENCES: ConsultantPreferences = {
  inactive_client_days: 7,
  enable_sound_alerts: true,
  enable_desktop_notifications: true,
  sync_interval_seconds: 60,
  accent_color: 'blue',
  theme_mode: 'light',
  enable_background_watchdog: true,
  enable_background_email_sync: true,
  enable_auto_drafts: true,
  background_check_interval_seconds: 60,
  close_to_tray: true,
};

export const ACCENT_PALETTES: Record<
  AccentColor,
  { name: string; hex: string; hoverHex: string; glowRgba: string }
> = {
  blue: {
    name: 'Azul Cobalto',
    hex: '#2563eb',
    hoverHex: '#1d4ed8',
    glowRgba: 'rgba(37, 99, 235, 0.15)',
  },
  emerald: {
    name: 'Esmeralda Pro',
    hex: '#059669',
    hoverHex: '#047857',
    glowRgba: 'rgba(5, 150, 105, 0.15)',
  },
  indigo: {
    name: 'Índigo Moderno',
    hex: '#4f46e5',
    hoverHex: '#4338ca',
    glowRgba: 'rgba(79, 70, 229, 0.15)',
  },
  purple: {
    name: 'Púrpura Real',
    hex: '#7c3aed',
    hoverHex: '#6d28d9',
    glowRgba: 'rgba(124, 58, 237, 0.15)',
  },
  amber: {
    name: 'Ámbar Ejecutivo',
    hex: '#d97706',
    hoverHex: '#b45309',
    glowRgba: 'rgba(217, 119, 6, 0.15)',
  },
};

/**
 * Applies custom accent color directly to Document root CSS variables.
 */
export function applyAccentColor(accent: AccentColor): void {
  if (typeof document === 'undefined') return;
  const palette = ACCENT_PALETTES[accent] || ACCENT_PALETTES.blue;
  const root = document.documentElement;
  root.style.setProperty('--accent-primary', palette.hex);
  root.style.setProperty('--accent-hover', palette.hoverHex);
  root.style.setProperty('--accent-glow', palette.glowRgba);
}

/**
 * Replaces placeholders in email signature template.
 */
export function formatSignature(template: string, profile: ConsultantProfile): string {
  if (!template) return '';
  return template
    .replace(/{nombre}/g, profile.name || '')
    .replace(/{cargo}/g, profile.role_title || '')
    .replace(/{empresa}/g, profile.company || '')
    .replace(/{email}/g, profile.email || '')
    .replace(/{telefono}/g, profile.phone || '');
}
