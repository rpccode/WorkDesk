/**
 * email-parser.ts
 * Herramientas para parsear correos en bruto (.eml o texto pegado)
 * y transformarlos en entidades de WorkDesk:
 *   - ParsedEmail    → vista estructurada del correo
 *   - CaseInput      → nuevo Caso a partir del correo
 *   - CommitmentInput → compromiso extraído del correo
 *   - EvidenceEntry  → registro de evidencia documental
 */

import type { Client } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de salida del parser
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedEmail {
  messageId?: string;
  from: string;
  fromName?: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;        // ISO string
  bodyText: string;
  bodyHtml?: string;
  attachments: ParsedAttachment[];
  headers: Record<string, string>;
}

export interface ParsedAttachment {
  filename: string;
  contentType: string;
  size?: number;
}

export interface EmailToCaseInput {
  title: string;
  description: string;
  clientName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  emailEvidence: {
    sender: string;
    recipient: string;
    subject: string;
    body: string;
    date: string;
  };
}

export interface EmailToCommitmentInput {
  description: string;
  owner: 'me' | 'client' | 'third_party';
  due_date?: string;
  source: 'email';
  emailSender: string;
  emailSubject: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser principal: texto sin formato o .eml
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parsea texto de correo (formato .eml o texto pegado de Outlook/Gmail)
 * y extrae cabeceras, asunto, cuerpo y adjuntos.
 */
export function parseEmailText(raw: string): ParsedEmail {
  const lines = raw.split(/\r\n|\n|\r/);
  const headers: Record<string, string> = {};
  let bodyStart = 0;
  let currentKey = '';

  // Parsear cabeceras (terminan con la primera línea vacía)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      bodyStart = i + 1;
      break;
    }

    // Líneas de continuación de cabecera (empiezan con espacio/tab)
    if ((line.startsWith(' ') || line.startsWith('\t')) && currentKey) {
      headers[currentKey] = (headers[currentKey] || '') + ' ' + line.trim();
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      currentKey = line.substring(0, colonIdx).trim().toLowerCase();
      headers[currentKey] = line.substring(colonIdx + 1).trim();
    }
  }

  // Si no se encontraron cabeceras estándar, tratar todo como cuerpo
  const hasHeaders = Object.keys(headers).some(k =>
    ['from', 'to', 'subject', 'date', 'message-id'].includes(k)
  );

  const bodyText = hasHeaders
    ? lines.slice(bodyStart).join('\n').trim()
    : raw.trim();

  // Decodificar campos comunes
  const from = decodeEmailHeader(headers['from'] || '');
  const { email: fromEmail, name: fromName } = extractEmailAndName(from);

  const dateStr = parseEmailDate(headers['date'] || '');

  return {
    messageId: headers['message-id'],
    from: fromEmail || from,
    fromName: fromName,
    to: decodeEmailHeader(headers['to'] || ''),
    cc: headers['cc'] ? decodeEmailHeader(headers['cc']) : undefined,
    subject: decodeEmailHeader(headers['subject'] || '(Sin Asunto)'),
    date: dateStr,
    bodyText: decodeEmailBody(bodyText, headers['content-transfer-encoding'] || ''),
    headers,
    attachments: parseAttachments(headers),
  };
}

/**
 * Extrae el nombre y email de una cadena "Nombre <email@domain.com>"
 */
function extractEmailAndName(raw: string): { email: string; name?: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, ''),
      email: match[2].trim(),
    };
  }
  const emailOnly = raw.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (emailOnly) {
    return { email: emailOnly[0] };
  }
  return { email: raw };
}

/**
 * Decodifica cabeceras con codificación MIME (=?UTF-8?Q?...?= o =?UTF-8?B?...?=)
 */
function decodeEmailHeader(value: string): string {
  // Decodificación básica de encoded-words (RFC 2047)
  return value
    .replace(/=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=/gi, (_match, encoded) => {
      try {
        return atob(encoded);
      } catch {
        return encoded;
      }
    })
    .replace(/=\?UTF-8\?Q\?([^?]+)\?=/gi, (_match, encoded) => {
      return encoded
        .replace(/_/g, ' ')
        .replace(/=([0-9A-F]{2})/gi, (_m: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
    })
    .replace(/=\?[^?]+\?[BQ]\?[^?]+\?=/gi, (match) => match); // Unknown charset: keep
}

/**
 * Decodifica cuerpo con quoted-printable o base64 si aplica
 */
function decodeEmailBody(body: string, encoding: string): string {
  const enc = encoding.toLowerCase().trim();
  if (enc === 'base64') {
    try {
      return atob(body.replace(/\s/g, ''));
    } catch {
      return body;
    }
  }
  if (enc === 'quoted-printable') {
    return body
      .replace(/=\r?\n/g, '') // soft line breaks
      .replace(/=([0-9A-F]{2})/gi, (_m, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
  }
  return body;
}

/**
 * Parsea la fecha del correo a ISO string
 */
function parseEmailDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {
    // fallback
  }
  return new Date().toISOString();
}

/**
 * Detecta adjuntos en las cabeceras (detección heurística)
 */
function parseAttachments(headers: Record<string, string>): ParsedAttachment[] {
  const attachments: ParsedAttachment[] = [];
  const contentDisposition = headers['content-disposition'] || '';
  if (contentDisposition.includes('attachment')) {
    const filenameMatch = contentDisposition.match(/filename[*]?=["']?([^;"']+)["']?/i);
    const filename = filenameMatch ? filenameMatch[1].trim() : 'adjunto';
    attachments.push({
      filename,
      contentType: headers['content-type']?.split(';')[0]?.trim() || 'application/octet-stream',
    });
  }
  return attachments;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversiones a entidades de WorkDesk
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforma un correo parseado en un borrador de nuevo Caso.
 * Sugiere título, descripción y prioridad basados en el contenido.
 */
export function emailToCase(
  email: ParsedEmail,
  matchedClient?: Client
): EmailToCaseInput {
  const subject = email.subject.trim();
  const bodyLines = email.bodyText
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('>')) // excluir citas
    .slice(0, 12); // tomar primeras 12 líneas útiles

  const description = bodyLines.join('\n').slice(0, 1000);

  // Detección de prioridad heurística por palabras clave en asunto o cuerpo
  const urgentKeywords = /urgente|crítico|crítica|bloqueado|bloqueante|sin servicio|caído|emergency|production down|sla|escalate/i;
  const highKeywords = /importante|prioridad|necesito|necesitamos|error|fallo|bug|problema grave/i;
  const mediumKeywords = /seguimiento|consulta|update|actualización|revisión/i;

  let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  const fullText = `${subject} ${description}`;
  if (urgentKeywords.test(fullText)) {
    priority = 'critical';
  } else if (highKeywords.test(fullText)) {
    priority = 'high';
  } else if (mediumKeywords.test(fullText)) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  const clientName = matchedClient?.name || extractClientNameFromEmail(email.fromName || email.from);

  return {
    title: subject.length > 10 ? subject : `Caso: ${subject}`,
    description: `**Origen: Correo electrónico**\n**De:** ${email.from}\n**Fecha:** ${new Date(email.date).toLocaleDateString('es-ES')}\n\n---\n\n${description}`,
    clientName,
    priority,
    emailEvidence: {
      sender: email.from,
      recipient: email.to,
      subject: email.subject,
      body: email.bodyText.slice(0, 2000),
      date: email.date,
    },
  };
}

/**
 * Transforma un correo en uno o varios compromisos extractando
 * elementos accionables mediante expresiones regulares.
 */
export function emailToCommitments(email: ParsedEmail): EmailToCommitmentInput[] {
  const commitments: EmailToCommitmentInput[] = [];
  const lines = email.bodyText.split('\n').filter((l) => l.trim());

  // Heurística: líneas con marcadores de tarea o verbos imperativos en español/inglés
  const taskIndicators = /^[-*•]\s|^\d+[.)]\s|por favor|please|necesito que|requiero que|esperamos que|enviar|entregar|validar|confirmar|revisar|subir|proporcionar|compartir|send|provide|confirm|review|deliver|upload|approve/i;
  const datePattern = /(\d{1,2}[/\-]\d{1,2}(?:[/\-]\d{2,4})?|\b(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo|monday|tuesday|wednesday|thursday|friday)\b|\bvierned?\b|\bhoy\b|\bmañana\b|\bpróxima semana\b)/i;

  for (const line of lines) {
    const clean = line.replace(/^[-*•\d.)\s]+/, '').trim();
    if (clean.length < 10) continue;
    if (!taskIndicators.test(line)) continue;

    const dateMatch = line.match(datePattern);
    let dueDate: string | undefined;
    if (dateMatch) {
      const maybeDate = tryParseSpanishDate(dateMatch[1]);
      if (maybeDate) dueDate = maybeDate;
    }

    // Heurística: determinar owner basándose en si el sujeto es el remitente o nosotros
    const isClientTask = /necesito que|requiero que|esperamos que|please send|please provide|please confirm/i.test(line);
    const owner: 'me' | 'client' | 'third_party' = isClientTask ? 'me' : 'client';

    commitments.push({
      description: clean.slice(0, 280),
      owner,
      due_date: dueDate,
      source: 'email',
      emailSender: email.from,
      emailSubject: email.subject,
    });
  }

  // Si no se encontraron items específicos, crear uno genérico por el correo completo
  if (commitments.length === 0) {
    commitments.push({
      description: `Responder/dar seguimiento a: "${email.subject}"`,
      owner: 'me',
      source: 'email',
      emailSender: email.from,
      emailSubject: email.subject,
    });
  }

  return commitments.slice(0, 8); // máximo 8 compromisos por correo
}

/**
 * Intenta convertir frases de fecha en español a YYYY-MM-DD
 */
function tryParseSpanishDate(raw: string): string | undefined {
  const today = new Date();
  const lower = raw.toLowerCase().trim();

  if (lower === 'hoy') {
    return today.toISOString().split('T')[0];
  }
  if (lower === 'mañana') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (lower.includes('próxima semana') || lower.includes('proxima semana')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  // Formato DD/MM o DD/MM/YYYY
  const parts = raw.match(/(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parts[3]
      ? parts[3].length === 2 ? 2000 + parseInt(parts[3], 10) : parseInt(parts[3], 10)
      : today.getFullYear();
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  return undefined;
}

/**
 * Intenta derivar el nombre del cliente desde la dirección de correo
 * cuando no hay un cliente registrado.
 */
function extractClientNameFromEmail(emailOrName: string): string {
  if (!emailOrName) return 'Cliente';
  // Si tiene formato "Nombre <email>", usar el nombre
  const nameMatch = emailOrName.match(/^([^<@]+)/);
  if (nameMatch) {
    const name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
    if (name && name.length > 1 && !name.includes('@')) return name;
  }
  // Extraer dominio del email como referencia
  const domainMatch = emailOrName.match(/@([\w.-]+)/);
  if (domainMatch) {
    const domain = domainMatch[1].split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  return 'Cliente';
}

/**
 * Intenta encontrar un cliente existente por su email o dominio
 */
export function matchClientByEmail(
  emailAddress: string,
  clients: Client[]
): Client | undefined {
  if (!emailAddress) return undefined;

  const emailLower = emailAddress.toLowerCase();
  const domain = emailLower.split('@')[1];

  // Coincidencia exacta
  const exact = clients.find(
    (c) => c.email && c.email.toLowerCase() === emailLower
  );
  if (exact) return exact;

  // Coincidencia por dominio
  if (domain) {
    const byDomain = clients.find((c) => {
      if (!c.email) return false;
      const cDomain = c.email.toLowerCase().split('@')[1];
      return cDomain === domain;
    });
    if (byDomain) return byDomain;
  }

  return undefined;
}

/**
 * Genera un preview de texto del correo para mostrar en la UI
 */
export function getEmailPreview(email: ParsedEmail, maxChars: number = 200): string {
  return email.bodyText
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('>'))
    .join(' ')
    .trim()
    .slice(0, maxChars);
}
