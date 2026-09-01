import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONSULTANT_PROFILE,
  DEFAULT_CONSULTANT_PREFERENCES,
  formatSignature,
  ACCENT_PALETTES,
} from '../../src/utils/theme-manager';

describe('Consultant Personalization & Theme Manager', () => {
  it('formats custom signature with consultant profile variables', () => {
    const profile = {
      name: 'Carlos Mendoza',
      role_title: 'Director de Estrategia',
      company: 'Mendoza & Co.',
      email: 'carlos@mendoza.com',
      phone: '+1 555 123 4567',
      email_signature: 'Atentamente,\n\n{nombre}\n{cargo} | {empresa}\nTel: {telefono}',
    };

    const formatted = formatSignature(profile.email_signature, profile);

    expect(formatted).toContain('Carlos Mendoza');
    expect(formatted).toContain('Director de Estrategia');
    expect(formatted).toContain('Mendoza & Co.');
    expect(formatted).toContain('+1 555 123 4567');
    expect(formatted).not.toContain('{nombre}');
  });

  it('contains all supported executive accent palettes', () => {
    expect(ACCENT_PALETTES.blue).toBeDefined();
    expect(ACCENT_PALETTES.emerald).toBeDefined();
    expect(ACCENT_PALETTES.indigo).toBeDefined();
    expect(ACCENT_PALETTES.purple).toBeDefined();
    expect(ACCENT_PALETTES.amber).toBeDefined();

    expect(ACCENT_PALETTES.emerald.hex).toBe('#059669');
    expect(ACCENT_PALETTES.purple.hex).toBe('#7c3aed');
  });

  it('provides comprehensive default profile and operational preferences', () => {
    expect(DEFAULT_CONSULTANT_PROFILE.name).toBeTruthy();
    expect(DEFAULT_CONSULTANT_PROFILE.email_signature).toContain('{nombre}');

    expect(DEFAULT_CONSULTANT_PREFERENCES.inactive_client_days).toBeGreaterThanOrEqual(7);
    expect(DEFAULT_CONSULTANT_PREFERENCES.enable_sound_alerts).toBe(true);
    expect(DEFAULT_CONSULTANT_PREFERENCES.enable_desktop_notifications).toBe(true);
  });
});
