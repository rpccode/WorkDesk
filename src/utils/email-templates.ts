import type { Commitment } from '../types';
import { formatDate } from './date';

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'seguimiento' | 'minuta' | 'cierre' | 'escalacion';
  subjectTemplate: (data: TemplateData) => string;
  bodyTemplate: (data: TemplateData) => string;
}

export interface TemplateData {
  clientName?: string | null;
  caseTitle?: string | null;
  caseDescription?: string | null;
  recipientName?: string;
  myCommitments?: Commitment[];
  clientCommitments?: Commitment[];
  nextSteps?: string;
  extraNotes?: string;
  signature?: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'seguimiento_general',
    name: 'Seguimiento de Estado y Próximos Pasos',
    category: 'seguimiento',
    subjectTemplate: (d) =>
      `Seguimiento: ${d.caseTitle || '[Caso]'} — ${d.clientName || '[Cliente]'}`,
    bodyTemplate: (d) => {
      const recipient = d.recipientName || d.clientName || 'Estimado/a';
      const myItems = (d.myCommitments || [])
        .map((c) => `  • [Por nuestra parte] ${c.description}${c.due_date ? ` (Fecha: ${formatDate(c.due_date)})` : ''}`)
        .join('\n');
      const clientItems = (d.clientCommitments || [])
        .map((c) => `  • [Pendiente de su lado] ${c.description}${c.due_date ? ` (Fecha estimada: ${formatDate(c.due_date)})` : ''}`)
        .join('\n');

      return `Hola ${recipient},

Espero que te encuentres muy bien.

Te escribo para compartirte el estado actual de los avances sobre "${d.caseTitle || '[Título del caso]'}":

${d.caseDescription ? `Resumen de situación:\n${d.caseDescription}\n` : ''}
Compromisos y acuerdos en curso:
${myItems || '  • No hay compromisos pendientes de nuestro lado.'}

Puntos en los que requerimos de su apoyo:
${clientItems || '  • No hay solicitudes pendientes de su parte al momento.'}

${d.nextSteps ? `Próximo hito / siguiente acción:\n${d.nextSteps}\n` : ''}
Quedo a tu total disposición ante cualquier duda o comentario.

Saludos cordiales,`;
    },
  },
  {
    id: 'minuta_reunion',
    name: 'Minuta de Reunión / Acuerdos',
    category: 'minuta',
    subjectTemplate: (d) =>
      `Minuta y Acuerdos de Reunión: ${d.caseTitle || '[Caso]'} — ${d.clientName || '[Cliente]'}`,
    bodyTemplate: (d) => {
      const recipient = d.recipientName || d.clientName || 'Equipo';
      const myItems = (d.myCommitments || [])
        .map((c) => `  • ${c.description} (Responsable: Nosotros${c.due_date ? ` | Plazo: ${formatDate(c.due_date)}` : ''})`)
        .join('\n');
      const clientItems = (d.clientCommitments || [])
        .map((c) => `  • ${c.description} (Responsable: ${d.clientName || 'Cliente'}${c.due_date ? ` | Plazo: ${formatDate(c.due_date)}` : ''})`)
        .join('\n');

      return `Estimado/a ${recipient},

Muchas gracias por el tiempo en la sesión de hoy. A continuación, les comparto los puntos tratados y los acuerdos establecidos:

Caso: ${d.caseTitle || '[Sin especificar]'}
Cliente: ${d.clientName || '[Sin especificar]'}

Acuerdos y compromisos adquiridos:
${myItems ? `Nuestros compromisos:\n${myItems}\n` : ''}
${clientItems ? `Compromisos del cliente:\n${clientItems}\n` : ''}
${!myItems && !clientItems ? '  • No se registraron compromisos formales.\n' : ''}
${d.extraNotes ? `Notas adicionales / Observaciones:\n${d.extraNotes}\n` : ''}
Por favor háganme saber si hay algún punto adicional que deseen incorporar o ajustar.

Saludos cordiales,`;
    },
  },
  {
    id: 'minuta_ejecutiva_completa',
    name: 'Minuta Ejecutiva de Caso (Consulting Intelligence)',
    category: 'minuta',
    subjectTemplate: (d) =>
      `Minuta Ejecutiva & Próximos Pasos: ${d.caseTitle || '[Caso]'} — ${d.clientName || '[Cliente]'}`,
    bodyTemplate: (d) => {
      const recipient = d.recipientName || d.clientName || 'Estimados';
      const myItems = (d.myCommitments || [])
        .map((c) => `  ➔ [Consultor] ${c.description} (Límite: ${c.due_date ? formatDate(c.due_date) : 'Por definir'})`)
        .join('\n');
      const clientItems = (d.clientCommitments || [])
        .map((c) => `  ➔ [Cliente] ${c.description} (Límite: ${c.due_date ? formatDate(c.due_date) : 'Por definir'})`)
        .join('\n');

      return `Estimado/a ${recipient},

Junto con saludar, comparto el informe ejecutivo y estado de acuerdos para el caso "${d.caseTitle || '[Caso]'}" (${d.clientName || '[Cliente]'}):

1. RESUMEN Y ALCANCE:
${d.caseDescription || '  • Seguimiento operativo del caso.'}

2. PRÓXIMOS PASOS Y COMPROMISOS:
${myItems ? `Compromisos de Consultoría:\n${myItems}\n` : ''}
${clientItems ? `Requerimientos y Validaciones del Cliente:\n${clientItems}\n` : ''}
${!myItems && !clientItems ? '  • Todos los compromisos al día.\n' : ''}
${d.nextSteps ? `Próxima Acción Inmediata:\n➔ ${d.nextSteps}\n` : ''}
${d.extraNotes ? `3. OBSERVACIONES:\n${d.extraNotes}\n` : ''}
Quedo a su disposición para cualquier duda o alineación técnica.

Saludos cordiales,`;
    },
  },
  {
    id: 'reclamo_firme_bloqueo',
    name: 'Reclamo Firme de Bloqueo / Destrabe Crítico',
    category: 'escalacion',
    subjectTemplate: (d) =>
      `[CRÍTICO] Bloqueo de avance en caso: ${d.caseTitle || '[Caso]'} — Requerimiento de validación`,
    bodyTemplate: (d) => {
      const recipient = d.recipientName || d.clientName || 'Equipo';
      const clientItems = (d.clientCommitments || [])
        .map((c) => `  • ${c.description}${c.due_date ? ` (Pactado para: ${formatDate(c.due_date)})` : ''}`)
        .join('\n');

      return `Estimado/a ${recipient},

Nos ponemos en contacto para alertar sobre una dependencia crítica que mantiene detenido el avance del caso "${d.caseTitle || '[Caso]'}".

PUNTOS BLOQUEANTES EN ESPERA DE SU RESPUESTA:
${clientItems || '  • Validación técnica y entrega de información pendiente.'}

${d.extraNotes ? `Impacto:\n${d.extraNotes}\n` : 'El no contar con estas definiciones impacta de forma directa las fechas comprometidas en el cronograma.\n'}
Agradecemos encarecidamente confirmar la fecha límite en la que contaremos con esta información para reanudar los trabajos.

Atentamente,`;
    },
  },
  {
    id: 'cierre_caso',
    name: 'Cierre y Entrega Final',
    category: 'cierre',
    subjectTemplate: (d) =>
      `Confirmación de Conclusión: ${d.caseTitle || '[Caso]'} — ${d.clientName || '[Cliente]'}`,
    bodyTemplate: (d) => {
      const recipient = d.recipientName || d.clientName || 'Estimado/a';
      return `Hola ${recipient},

Nos complace informarte que hemos completado satisfactoriamente todas las actividades correspondientes al caso "${d.caseTitle || '[Caso]'}".

Resumen de lo entregado:
${d.caseDescription || '  • Todas las tareas y requerimientos acordados han sido finalizados.'}

${d.extraNotes ? `Detalles adicionales:\n${d.extraNotes}\n` : ''}
Agradecemos enormemente su colaboración durante este proceso. Quedamos atentos si requieren alguna aclaración o soporte adicional.

Un cordial saludo,`;
    },
  },
  {
    id: 'escalacion_urgente',
    name: 'Recordatorio / Solicitud de Respuesta Urgente',
    category: 'escalacion',
    subjectTemplate: (d) =>
      `[IMPORTANTE] Pendiente de validación: ${d.caseTitle || '[Caso]'} — ${d.clientName || '[Cliente]'}`,
    bodyTemplate: (d) => {
      const recipient = d.recipientName || d.clientName || 'Estimado/a';
      const clientItems = (d.clientCommitments || [])
        .map((c) => `  • ${c.description}${c.due_date ? ` (Compromiso pactado para: ${formatDate(c.due_date)})` : ''}`)
        .join('\n');

      return `Hola ${recipient},

Espero te encuentres bien. Te contacto para dar seguimiento prioritario a los siguientes puntos pendientes que requerimos para poder continuar con el avance de "${d.caseTitle || '[Caso]'}":

${clientItems || '  • Pendiente de su confirmación o envío de información requerida.'}

Agradecería mucho si pudieras confirmarnos una fecha estimada o enviarnos tus comentarios para evitar desfasar el cronograma.

Muchas gracias por tu apoyo.

Saludos,`;
    },
  },
];

export const CUSTOM_TEMPLATES_KEY = 'workdesk_custom_email_templates_v1';

export interface CustomEmailTemplate {
  id: string;
  name: string;
  category: 'seguimiento' | 'minuta' | 'cierre' | 'escalacion' | 'personalizado';
  subjectPattern: string;
  bodyPattern: string;
  created_at: string;
}

export interface PlaceholderInfo {
  tag: string;
  label: string;
  description: string;
  example: string;
}

export const AVAILABLE_PLACEHOLDERS: PlaceholderInfo[] = [
  { tag: '{{clientName}}', label: 'Nombre del Cliente', description: 'Nombre del cliente o empresa del caso', example: 'Banco Innova' },
  { tag: '{{recipientName}}', label: 'Nombre Destinatario', description: 'Persona a quien va dirigido el correo', example: 'Juan García' },
  { tag: '{{caseTitle}}', label: 'Título del Caso', description: 'Título del caso activo', example: 'Auditoría de Procesos TI' },
  { tag: '{{caseDescription}}', label: 'Descripción / Alcance', description: 'Contexto y descripción del caso', example: 'Revisión y optimización de servidores' },
  { tag: '{{myCommitments}}', label: 'Mis Compromisos', description: 'Lista formateada de compromisos asumidos por nosotros', example: '• [Por nuestra parte] Enviar reporte (10/09)' },
  { tag: '{{clientCommitments}}', label: 'Compromisos del Cliente', description: 'Lista formateada de compromisos y solicitudes al cliente', example: '• [Pendiente del cliente] Validar credenciales (12/09)' },
  { tag: '{{nextSteps}}', label: 'Próxima Acción / Siguiente Paso', description: 'Siguiente hito o acción inmediata', example: 'Llamada de alineación el jueves a las 10am' },
  { tag: '{{extraNotes}}', label: 'Notas Adicionales', description: 'Observaciones extras ingresadas en la pantalla', example: 'Se adjuntan los diagramas de flujo' },
  { tag: '{{signature}}', label: 'Firma Profesional', description: 'Firma configurada del consultor', example: 'Ing. Roberto Pérez | Consultor Principal' },
];

/**
 * Carga las plantillas personalizadas desde localStorage
 */
export function loadCustomTemplates(): CustomEmailTemplate[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading custom email templates:', e);
    return [];
  }
}

/**
 * Guarda o actualiza una plantilla personalizada
 */
export function saveCustomTemplate(template: Omit<CustomEmailTemplate, 'id' | 'created_at'> & { id?: string }): CustomEmailTemplate {
  const all = loadCustomTemplates();
  const id = template.id || `custom_tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const item: CustomEmailTemplate = {
    id,
    name: template.name.trim(),
    category: template.category || 'personalizado',
    subjectPattern: template.subjectPattern.trim(),
    bodyPattern: template.bodyPattern.trim(),
    created_at: now,
  };

  const existingIndex = all.findIndex((t) => t.id === id);
  let updated: CustomEmailTemplate[];
  if (existingIndex >= 0) {
    updated = all.map((t, idx) => (idx === existingIndex ? item : t));
  } else {
    updated = [...all, item];
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Error saving custom email template:', e);
  }

  return item;
}

/**
 * Elimina una plantilla personalizada
 */
export function deleteCustomTemplate(id: string): void {
  const all = loadCustomTemplates();
  const filtered = all.filter((t) => t.id !== id);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Error deleting custom email template:', e);
  }
}

/**
 * Reemplaza los placeholders en un texto de plantilla con los datos del caso
 */
export function interpolateTemplate(pattern: string, data: TemplateData): string {
  const recipient = data.recipientName || data.clientName || 'Estimado/a';
  const myItems = (data.myCommitments || [])
    .map((c) => `  • [Por nuestra parte] ${c.description}${c.due_date ? ` (Fecha: ${formatDate(c.due_date)})` : ''}`)
    .join('\n');
  const clientItems = (data.clientCommitments || [])
    .map((c) => `  • [Pendiente del cliente] ${c.description}${c.due_date ? ` (Fecha estimada: ${formatDate(c.due_date)})` : ''}`)
    .join('\n');

  return pattern
    .replace(/\{\{clientName\}\}/g, data.clientName || '[Cliente]')
    .replace(/\{\{recipientName\}\}/g, recipient)
    .replace(/\{\{caseTitle\}\}/g, data.caseTitle || '[Caso]')
    .replace(/\{\{caseDescription\}\}/g, data.caseDescription || '')
    .replace(/\{\{myCommitments\}\}/g, myItems || '  • No hay compromisos pendientes de nuestro lado.')
    .replace(/\{\{clientCommitments\}\}/g, clientItems || '  • No hay solicitudes pendientes de su parte.')
    .replace(/\{\{nextSteps\}\}/g, data.nextSteps || '')
    .replace(/\{\{extraNotes\}\}/g, data.extraNotes || '')
    .replace(/\{\{signature\}\}/g, data.signature || '');
}

export function buildEmail(
  templateId: string,
  data: TemplateData,
  customTemplates?: CustomEmailTemplate[]
): { subject: string; body: string } {
  // Check if it's a custom template
  const customs = customTemplates || loadCustomTemplates();
  const customTpl = customs.find((t) => t.id === templateId);
  if (customTpl) {
    let body = interpolateTemplate(customTpl.bodyPattern, data);
    if (data.signature && !customTpl.bodyPattern.includes('{{signature}}')) {
      body = body.replace(/Saludos cordiales,$|Un cordial saludo,$|Saludos,$/m, '').trimEnd() + '\n\n' + data.signature;
    }
    return {
      subject: interpolateTemplate(customTpl.subjectPattern, data),
      body,
    };
  }

  // Fallback to built-in templates
  const template = EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0];
  let body = template.bodyTemplate(data);
  if (data.signature) {
    // Replace default trailing signature if custom signature provided
    body = body.replace(/Saludos cordiales,$|Un cordial saludo,$|Saludos,$/m, '').trimEnd() + '\n\n' + data.signature;
  }
  return {
    subject: template.subjectTemplate(data),
    body,
  };
}
