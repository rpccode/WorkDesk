import { describe, it, expect } from 'vitest';
import {
  parseEmailText,
  emailToCase,
  emailToCommitments,
  matchClientByEmail,
  getEmailPreview,
} from '../../src/utils/email-parser';
import type { Client } from '../../src/types';

describe('email-parser', () => {
  const sampleEmlText = `From: Carlos Mendoza <cmendoza@finanzasglobal.com>
To: consultor@workdesk.app
Subject: Urgente: Caída en pasarela de pagos
Date: Wed, 02 Sep 2026 10:15:00 -0400
Message-ID: <abc123xyz@finanzasglobal.com>

Estimado equipo,

Tenemos un problema crítico en la pasarela de pagos que está bloqueando las transacciones.
Por favor revisar y resolver antes de las 18:00 de hoy.
Necesito que nos envíen el informe técnico de causa raíz mañana.

Quedamos a la espera de su confirmación.
Saludos cordiales.`;

  describe('parseEmailText', () => {
    it('correctly parses headers and body from email format', () => {
      const parsed = parseEmailText(sampleEmlText);

      expect(parsed.from).toBe('cmendoza@finanzasglobal.com');
      expect(parsed.fromName).toBe('Carlos Mendoza');
      expect(parsed.to).toBe('consultor@workdesk.app');
      expect(parsed.subject).toBe('Urgente: Caída en pasarela de pagos');
      expect(parsed.bodyText).toContain('Tenemos un problema crítico');
    });

    it('gracefully handles plain text without standard headers', () => {
      const plain = 'Solo un texto pegado sin cabeceras formales.';
      const parsed = parseEmailText(plain);

      expect(parsed.bodyText).toBe(plain);
      expect(parsed.subject).toBe('(Sin Asunto)');
    });
  });

  describe('emailToCase', () => {
    it('detects critical priority based on keywords in urgent email', () => {
      const parsed = parseEmailText(sampleEmlText);
      const caseDraft = emailToCase(parsed);

      expect(caseDraft.priority).toBe('critical');
      expect(caseDraft.title).toContain('Caída en pasarela de pagos');
      expect(caseDraft.description).toContain('Origen: Correo electrónico');
      expect(caseDraft.description).toContain('cmendoza@finanzasglobal.com');
    });
  });

  describe('emailToCommitments', () => {
    it('extracts actionable commitments from email text', () => {
      const parsed = parseEmailText(sampleEmlText);
      const commitments = emailToCommitments(parsed);

      expect(commitments.length).toBeGreaterThan(0);
      expect(commitments.some((c) => c.description.toLowerCase().includes('informe'))).toBe(true);
    });
  });

  describe('matchClientByEmail', () => {
    const clients: Client[] = [
      {
        id: 'client-1',
        name: 'Finanzas Global S.A.',
        email: 'contacto@finanzasglobal.com',
        status: 'active',
        created_at: '2026-01-01',
      },
      {
        id: 'client-2',
        name: 'Tech Corp',
        email: 'info@techcorp.io',
        status: 'active',
        created_at: '2026-01-01',
      },
    ];

    it('matches client by domain when exact match is absent', () => {
      const match = matchClientByEmail('cmendoza@finanzasglobal.com', clients);
      expect(match).toBeDefined();
      expect(match?.name).toBe('Finanzas Global S.A.');
    });

    it('returns undefined when no domain or email matches', () => {
      const match = matchClientByEmail('unknown@externo.org', clients);
      expect(match).toBeUndefined();
    });
  });

  describe('getEmailPreview', () => {
    it('generates a truncated preview of email body', () => {
      const parsed = parseEmailText(sampleEmlText);
      const preview = getEmailPreview(parsed, 60);

      expect(preview.length).toBeLessThanOrEqual(60);
      expect(preview).toContain('Estimado equipo');
    });
  });
});
