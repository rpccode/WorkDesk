import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import { triggerFileDownload } from './docx-generator';
import type { Case, Commitment, Followup, Note, CaseBrief, ConsultantProfile, EmailTone } from '../types';

/**
 * Synthesizes all case artifacts into a structured executive brief.
 */
export function generateCaseBrief(
  caseItem: Case,
  commitments: Commitment[],
  followups: Followup[],
  notes: Note[]
): CaseBrief {
  const caseComms = commitments.filter((c) => c.case_id === caseItem.id);
  const pendingComms = caseComms.filter((c) => c.status !== 'done');
  const completedComms = caseComms.filter((c) => c.status === 'done');
  const caseFollowups = followups.filter((f) => f.case_id === caseItem.id);
  const caseNotes = notes.filter((n) => n.case_id === caseItem.id);

  // Extract key decisions from followups and notes
  const keyDecisions: string[] = [];
  caseFollowups.forEach((f) => {
    if (f.summary.toLowerCase().includes('acuerdo') || f.summary.toLowerCase().includes('decisión') || f.summary.toLowerCase().includes('aprobado')) {
      keyDecisions.push(`[${f.date}] ${f.summary}`);
    }
  });
  caseNotes.forEach((n) => {
    if (n.content.toLowerCase().includes('acuerdo') || n.content.toLowerCase().includes('decisión')) {
      keyDecisions.push(`[Nota] ${n.content.substring(0, 100)}`);
    }
  });
  if (keyDecisions.length === 0 && caseFollowups.length > 0) {
    keyDecisions.push(...caseFollowups.slice(0, 3).map((f) => `[${f.date}] ${f.summary}`));
  }

  // Identify active blockers (waiting commitments or critical notes)
  const blockers: string[] = [];
  const waitingComms = pendingComms.filter((c) => c.owner !== 'me');
  waitingComms.forEach((wc) => {
    blockers.push(`Esperando de ${wc.owner === 'client' ? 'Cliente' : 'Terceros'}: ${wc.description} (${wc.due_date ? `Límite: ${wc.due_date.split('T')[0]}` : 'Sin fecha'})`);
  });

  return {
    case_id: caseItem.id,
    title: caseItem.title,
    client_name: caseItem.client_name || 'Cliente General',
    generated_at: new Date().toISOString(),
    executive_summary: caseItem.description || 'Sin descripción detallada registrada para este caso.',
    key_decisions: keyDecisions.length > 0 ? keyDecisions : ['No se han registrado acuerdos formales previos en la bitácora.'],
    next_action: caseItem.next_action || null,
    pending_commitments: pendingComms,
    completed_commitments: completedComms,
    blockers,
  };
}

/**
 * Builds and downloads a Word (.docx) executive brief / meeting minutes.
 */
export async function exportCaseBriefToDocx(
  brief: CaseBrief,
  profile: ConsultantProfile
): Promise<void> {
  const tableBorderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const cellBorderLight = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  };

  const children: (Paragraph | Table)[] = [];

  // Title Banner
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: 'MINUTA EJECUTIVA Y ESTADO DE AVANCE',
          bold: true,
          size: 32,
          font: 'Calibri',
          color: '1E3A8A',
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Caso: ${brief.title} • Cliente: ${brief.client_name}`,
          bold: true,
          size: 22,
          font: 'Calibri',
          color: '475569',
        }),
      ],
    })
  );

  // Metadata Box Table
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorderNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9' },
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [
                    new TextRun({ text: 'Fecha de Emisión: ', bold: true, font: 'Calibri', size: 18 }),
                    new TextRun({ text: new Date(brief.generated_at).toLocaleDateString(), font: 'Calibri', size: 18 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9' },
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [
                    new TextRun({ text: 'Consultor Responsable: ', bold: true, font: 'Calibri', size: 18 }),
                    new TextRun({ text: profile.name, font: 'Calibri', size: 18 }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Section: Context & Objective
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 250, after: 80 },
      children: [
        new TextRun({
          text: '1. Contexto y Alcance del Caso',
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '1E3A8A',
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: brief.executive_summary,
          font: 'Calibri',
          size: 20,
          color: '334155',
        }),
      ],
    })
  );

  // Section: Próxima Acción Inmediata
  if (brief.next_action?.description) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: '2. Próxima Acción Inmediata (Next Action)',
            bold: true,
            size: 24,
            font: 'Calibri',
            color: '1E3A8A',
          }),
        ],
      })
    );

    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: '➔ ', bold: true, color: '2563EB', font: 'Calibri', size: 22 }),
          new TextRun({ text: brief.next_action.description, bold: true, font: 'Calibri', size: 20, color: '0F172A' }),
          new TextRun({
            text: ` (Responsable: ${brief.next_action.owner_type === 'me' ? 'Consultor' : brief.next_action.owner_type === 'client' ? 'Cliente' : 'Terceros'}${brief.next_action.due_date ? ` • Plazo: ${brief.next_action.due_date}` : ''})`,
            font: 'Calibri',
            size: 18,
            color: '64748B',
          }),
        ],
      })
    );
  }

  // Section: Key Decisions
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: '3. Acuerdos y Decisiones Clave',
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '1E3A8A',
        }),
      ],
    })
  );

  brief.key_decisions.forEach((dec) => {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({ text: dec, font: 'Calibri', size: 20 })],
      })
    );
  });

  // Section: Commitments Table
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 250, after: 80 },
      children: [
        new TextRun({
          text: '4. Matriz de Compromisos y Entregables',
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '1E3A8A',
        }),
      ],
    })
  );

  const totalComms = [...brief.pending_commitments, ...brief.completed_commitments];
  if (totalComms.length === 0) {
    children.push(
      new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun({ text: 'No hay compromisos registrados para este caso.', font: 'Calibri', size: 20, italics: true })],
      })
    );
  } else {
    const tableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: 'E2E8F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Compromiso / Tarea', bold: true, font: 'Calibri', size: 18 })] })] }),
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: 'E2E8F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Responsable', bold: true, font: 'Calibri', size: 18 })] })] }),
          new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, shading: { fill: 'E2E8F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Fecha Límite', bold: true, font: 'Calibri', size: 18 })] })] }),
          new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, shading: { fill: 'E2E8F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Estado', bold: true, font: 'Calibri', size: 18 })] })] }),
        ],
      }),
    ];

    totalComms.forEach((c) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ borders: cellBorderLight, children: [new Paragraph({ children: [new TextRun({ text: c.description, font: 'Calibri', size: 18 })] })] }),
            new TableCell({ borders: cellBorderLight, children: [new Paragraph({ children: [new TextRun({ text: c.owner === 'me' ? 'Consultor' : c.owner === 'client' ? 'Cliente' : 'Terceros', font: 'Calibri', size: 18 })] })] }),
            new TableCell({ borders: cellBorderLight, children: [new Paragraph({ children: [new TextRun({ text: c.due_date ? c.due_date.split('T')[0] : 'N/A', font: 'Calibri', size: 18 })] })] }),
            new TableCell({ borders: cellBorderLight, children: [new Paragraph({ children: [new TextRun({ text: c.status === 'done' ? '✓ Cumplido' : 'Pendiente', bold: c.status === 'done', font: 'Calibri', size: 18, color: c.status === 'done' ? '16A34A' : 'EA580C' })] })] }),
          ],
        })
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      })
    );
  }

  // Section: Blockers & Dependencies
  if (brief.blockers.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 250, after: 80 },
        children: [
          new TextRun({
            text: '5. Bloqueos y Dependencias Críticas',
            bold: true,
            size: 24,
            font: 'Calibri',
            color: 'DC2626',
          }),
        ],
      })
    );

    brief.blockers.forEach((blk) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: blk, font: 'Calibri', size: 20, color: 'B91C1C' })],
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${profile.company || 'WorkDesk Consulting'} • Minuta Ejecutiva`,
                    font: 'Calibri',
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Página ', font: 'Calibri', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 16, color: '94A3B8' }),
                  new TextRun({ text: ' de ', font: 'Calibri', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Calibri', size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = brief.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  triggerFileDownload(blob, `Minuta_${brief.client_name.replace(/\s+/g, '_')}_${safeTitle}.docx`);
}

/**
 * Formats brief for email delivery according to chosen consultant tone.
 */
export function formatCaseBriefEmailText(brief: CaseBrief, tone: EmailTone = 'formal'): string {
  const dateStr = new Date(brief.generated_at).toLocaleDateString();

  if (tone === 'assertive') {
    return `Estimado equipo de ${brief.client_name},

Les comparto el estado crítico y requerimientos de validación para avanzar en el caso "${brief.title}" al ${dateStr}.

PRÓXIMA ACCIÓN REQUERIDA:
${brief.next_action?.description ? `➔ ${brief.next_action.description} (Plazo: ${brief.next_action.due_date || 'Inmediato'})` : 'Validación de entregables pendientes.'}

DEPENDENCIAS / BLOQUEOS ACTUALES:
${brief.blockers.length > 0 ? brief.blockers.map((b) => `- ${b}`).join('\n') : '- Sin dependencias críticas.'}

COMPROMISOS PENDIENTES:
${brief.pending_commitments.map((c) => `- [${c.owner === 'client' ? 'CLIENTE' : 'CONSULTOR'}] ${c.description} (Límite: ${c.due_date ? c.due_date.split('T')[0] : 'Por definir'})`).join('\n')}

Agradeceré confirmar recepción y fecha estimada para destrabar estos puntos.

Atentamente,`;
  }

  if (tone === 'technical') {
    return `Estimados,

Resumen técnico del caso: ${brief.title} (${brief.client_name}) — ${dateStr}

1. ALCANCE Y CONTEXTO:
${brief.executive_summary}

2. ACUERDOS Y DECISIONES TÉCNICAS:
${brief.key_decisions.map((d) => `• ${d}`).join('\n')}

3. PRÓXIMA ACCIÓN:
${brief.next_action ? `• ${brief.next_action.description} [Owner: ${brief.next_action.owner_type}]` : '• Ninguna definida.'}

4. MATRIZ DE COMPROMISOS:
${brief.pending_commitments.map((c) => `• ${c.description} | Resp: ${c.owner} | Vence: ${c.due_date || 'N/A'}`).join('\n')}

Quedo a su disposición para cualquier detalle adicional.`;
  }

  // Formal / Executive default
  return `Estimado cliente (${brief.client_name}),

Junto con saludar, comparto la minuta ejecutiva y resumen de acuerdos del caso "${brief.title}" correspondiente al ${dateStr}.

RESUMEN EJECUTIVO:
${brief.executive_summary}

ACUERDOS CLAVE:
${brief.key_decisions.map((d) => `• ${d}`).join('\n')}

PRÓXIMA ACCIÓN:
${brief.next_action?.description ? `➔ ${brief.next_action.description} (${brief.next_action.due_date ? `Fecha: ${brief.next_action.due_date}` : 'A la brevedad'})` : 'En seguimiento.'}

COMPROMISOS Y PLAZOS:
${brief.pending_commitments.map((c) => `• ${c.description} — Responsable: ${c.owner === 'me' ? 'Consultor' : 'Cliente'} (${c.due_date ? c.due_date.split('T')[0] : 'S/F'})`).join('\n')}

Cualquier duda o comentario, quedo a su entera disposición.

Saludos cordiales,`;
}
