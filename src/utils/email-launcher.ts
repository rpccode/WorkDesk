/**
 * email-launcher.ts
 * Utilidades para integración y apertura de correos con clientes locales (Outlook/Thunderbird/Mail)
 * y webmails populares (Gmail, Outlook 365).
 */

export type EmailProvider = 'default' | 'gmail' | 'outlook';

export interface EmailPayload {
  to?: string;
  subject: string;
  body: string;
}

/**
 * Genera el enlace mailto: estándar compatible con Outlook Desktop, Windows Mail, Thunderbird, etc.
 */
export function generateMailtoUrl({ to = '', subject, body }: EmailPayload): string {
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);

  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return `mailto:${encodeURIComponent(to.trim())}${query}`;
}

/**
 * Genera la URL de composición directa para Gmail Web.
 */
export function generateGmailUrl({ to = '', subject, body }: EmailPayload): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: to.trim(),
    su: subject,
    body: body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * Genera la URL de composición directa para Outlook / Office 365 Web.
 */
export function generateOutlookWebUrl({ to = '', subject, body }: EmailPayload): string {
  const params = new URLSearchParams({
    to: to.trim(),
    subject: subject,
    body: body,
  });
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

/**
 * Abre el cliente o proveedor de correo seleccionado.
 */
export function launchEmailClient(provider: EmailProvider, payload: EmailPayload): string {
  let url = '';
  switch (provider) {
    case 'gmail':
      url = generateGmailUrl(payload);
      window.open(url, '_blank');
      break;
    case 'outlook':
      url = generateOutlookWebUrl(payload);
      window.open(url, '_blank');
      break;
    case 'default':
    default:
      url = generateMailtoUrl(payload);
      // Para mailto:, asignar a window.location.href o usar un tag temporal <a>
      // evita abrir una pestaña vacía en el navegador/webview
      const link = document.createElement('a');
      link.href = url;
      link.click();
      break;
  }
  return url;
}
