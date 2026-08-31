import { describe, it, expect } from 'vitest';
import { buildEmail, EMAIL_TEMPLATES } from '../../src/utils/email-templates';

describe('email-templates', () => {
  it('buildEmail fills case title and client name properly', () => {
    const result = buildEmail('seguimiento_general', {
      clientName: 'Acme Corp',
      caseTitle: 'Implementación ERP',
      caseDescription: 'Fase de pruebas de integración',
      myCommitments: [
        {
          id: '1',
          case_id: 'c1',
          description: 'Enviar credenciales',
          owner: 'me',
          due_date: '2026-09-05',
          status: 'pending',
          created_at: '2026-08-31',
        },
      ],
    });

    expect(result.subject).toContain('Implementación ERP');
    expect(result.subject).toContain('Acme Corp');
    expect(result.body).toContain('Acme Corp');
    expect(result.body).toContain('Enviar credenciales');
  });

  it('buildEmail handles missing fields without throwing or generating undefined', () => {
    const result = buildEmail('seguimiento_general', {});
    expect(result.subject).not.toContain('undefined');
    expect(result.body).not.toContain('undefined');
    expect(result.body).toContain('[Título del caso]');
  });

  it('all predefined templates generate non-empty subject and body', () => {
    EMAIL_TEMPLATES.forEach((tpl) => {
      const res = buildEmail(tpl.id, {
        clientName: 'Test Client',
        caseTitle: 'Test Case',
      });
      expect(res.subject.length).toBeGreaterThan(5);
      expect(res.body.length).toBeGreaterThan(20);
    });
  });
});
