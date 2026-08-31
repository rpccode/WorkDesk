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

export function buildEmail(templateId: string, data: TemplateData): { subject: string; body: string } {
  const template = EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0];
  return {
    subject: template.subjectTemplate(data),
    body: template.bodyTemplate(data),
  };
}
