import { describe, it, expect } from 'vitest';
import {
  generateMailtoUrl,
  generateGmailUrl,
  generateOutlookWebUrl,
} from '../../src/utils/email-launcher';

describe('email-launcher', () => {
  const payload = {
    to: 'cliente@empresa.com',
    subject: 'Minuta de Reunión: Sistema ERP',
    body: 'Estimado equipo,\nAdjunto los acuerdos y siguientes pasos.',
  };

  it('generates valid mailto URL with encoded parameters', () => {
    const url = generateMailtoUrl(payload);
    expect(url).toContain('mailto:cliente%40empresa.com');
    expect(url).toContain('subject=Minuta%20de%20Reuni%C3%B3n%3A%20Sistema%20ERP');
    expect(url).toContain('body=Estimado%20equipo%2C%0AAdjunto%20los%20acuerdos');
  });

  it('generates valid Gmail Web composition URL', () => {
    const url = generateGmailUrl(payload);
    expect(url).toContain('https://mail.google.com/mail/');
    expect(url).toContain('view=cm');
    expect(url).toContain('to=cliente%40empresa.com');
    expect(url).toContain('su=Minuta+de+Reuni%C3%B3n%3A+Sistema+ERP');
  });

  it('generates valid Outlook 365 Web URL', () => {
    const url = generateOutlookWebUrl(payload);
    expect(url).toContain('https://outlook.office.com/mail/deeplink/compose');
    expect(url).toContain('to=cliente%40empresa.com');
    expect(url).toContain('subject=Minuta+de+Reuni%C3%B3n%3A+Sistema+ERP');
  });

  it('handles empty destination email gracefully', () => {
    const url = generateMailtoUrl({ subject: 'Test', body: 'Test' });
    expect(url).toBe('mailto:?subject=Test&body=Test');
  });
});
