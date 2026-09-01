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

/**
 * Triggers browser download for a Blob safely.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    } catch (_) {
      // Ignore cleanup error
    }
  }, 3000);
}

/**
 * Parses markdown text runs into docx TextRuns with bold, italic and color.
 */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Simple regex for bold (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      runs.push(
        new TextRun({
          text: inner,
          bold: true,
          font: 'Calibri',
          color: '0F172A',
        })
      );
    } else if (part.length > 0) {
      runs.push(
        new TextRun({
          text: part,
          font: 'Calibri',
          color: '334155',
        })
      );
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, font: 'Calibri', color: '334155' })];
}

/**
 * Converts markdown-formatted text into a structured Word (.docx) document.
 */
export async function generateDocxBlobFromMarkdown(
  markdown: string,
  docTitle: string = 'Documento de Consultoría'
): Promise<Blob> {
  const lines = markdown.split('\n');
  const children: (Paragraph | Table)[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;

    const docxRows: TableRow[] = [];
    tableRows.forEach((row, rIdx) => {
      const isHeader = rIdx === 0;
      const cells = row.map((cellText) => {
        return new TableCell({
          width: {
            size: 100 / (row.length || 1),
            type: WidthType.PERCENTAGE,
          },
          shading: {
            fill: isHeader ? '0F172A' : rIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
          },
          margins: {
            top: 120,
            bottom: 120,
            left: 150,
            right: 150,
          },
          children: [
            new Paragraph({
              alignment: isHeader ? AlignmentType.LEFT : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: cellText.replace(/\*\*/g, '').trim(),
                  bold: isHeader || cellText.includes('**'),
                  color: isHeader ? 'FFFFFF' : '1E293B',
                  font: 'Calibri',
                  size: 19, // ~9.5pt
                }),
              ],
            }),
          ],
        });
      });

      docxRows.push(new TableRow({ children: cells }));
    });

    children.push(
      new Table({
        rows: docxRows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
      })
    );

    // Add small spacer after table
    children.push(new Paragraph({ spacing: { after: 180 } }));
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Check if it's separator row (| :--- | :--- |)
      if (trimmed.includes('---')) {
        continue;
      }
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      // Empty line spacer
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: trimmed.replace(/^#\s+/, ''),
              bold: true,
              size: 32, // 16pt
              font: 'Calibri',
              color: '0F172A',
            }),
          ],
        })
      );
    } else if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: trimmed.replace(/^##\s+/, ''),
              bold: true,
              size: 26, // 13pt
              font: 'Calibri',
              color: '1E3A8A', // Dark Navy Accent
            }),
          ],
        })
      );
    } else if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: trimmed.replace(/^###\s+/, ''),
              bold: true,
              size: 22, // 11pt
              font: 'Calibri',
              color: '334155',
            }),
          ],
        })
      );
    } else if (trimmed === '---' || trimmed === '***') {
      // Horizontal Rule
      children.push(
        new Paragraph({
          border: {
            bottom: { color: 'CBD5E1', space: 1, style: BorderStyle.SINGLE, size: 6 },
          },
          spacing: { before: 120, after: 120 },
        })
      );
    } else if (trimmed.startsWith('> ')) {
      // Blockquote
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          indent: { left: 400 },
          border: {
            left: { color: '2563EB', space: 10, style: BorderStyle.SINGLE, size: 24 },
          },
          children: parseInlineFormatting(trimmed.replace(/^>\s+/, '')),
        })
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Bullet list
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: parseInlineFormatting(trimmed.replace(/^[-*]\s+/, '')),
        })
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      // Numbered list
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 300 },
          children: parseInlineFormatting(trimmed),
        })
      );
    } else {
      // Regular Paragraph
      children.push(
        new Paragraph({
          spacing: { after: 120, line: 276 },
          children: parseInlineFormatting(trimmed),
        })
      );
    }
  }

  if (inTable) {
    flushTable();
  }

  const doc = new Document({
    creator: 'WorkDesk - Centro Operativo',
    title: docTitle,
    description: 'Documento generado automáticamente por WorkDesk',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'WORKDESK  |  GESTIÓN DE CONSULTORÍA',
                    size: 15,
                    font: 'Calibri',
                    color: '94A3B8',
                    bold: true,
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
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Página ',
                    size: 16,
                    font: 'Calibri',
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    font: 'Calibri',
                    color: '64748B',
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 16,
                    font: 'Calibri',
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    font: 'Calibri',
                    color: '64748B',
                  }),
                ],
              }),
            ],
          }),
        },
        children: children.length > 0 ? children : [new Paragraph({ text: 'Documento Vacío' })],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  return buffer;
}

/**
 * Launches clean printable view for export to PDF or immediate print.
 */
export function printHtmlDocument(htmlOrMarkdown: string, title: string = 'Documento'): void {
  // Convert simple markdown elements to HTML
  let html = htmlOrMarkdown
    .replace(/^# (.*$)/gim, '<h1 style="color:#0f172a; font-size:18pt; margin-top:20pt; margin-bottom:10pt; font-weight:800; border-bottom:2px solid #e2e8f0; padding-bottom:6pt;">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 style="color:#1e3a8a; font-size:14pt; margin-top:16pt; margin-bottom:8pt; font-weight:700;">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 style="color:#334155; font-size:12pt; margin-top:12pt; margin-bottom:6pt; font-weight:600;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/^> (.*$)/gim, '<blockquote style="border-left:4px solid #2563eb; margin:10pt 0; padding:6pt 12pt; background:#f8fafc; color:#334155; font-style:italic;">$1</blockquote>')
    .replace(/^---$/gim, '<hr style="border:none; border-top:1px solid #cbd5e1; margin:16pt 0;" />')
    .replace(/\n\n/gim, '<p style="margin-bottom:10pt; line-height:1.6; color:#1e293b; font-size:10.5pt;"></p>');

  // Markdown table converter
  html = html.replace(/\|(.+)\|/gim, (match) => {
    if (match.includes('---')) return '';
    const cells = match.split('|').filter((c) => c.trim().length > 0);
    const tds = cells.map((c) => `<td style="padding:6pt 8pt; border-bottom:1px solid #e2e8f0; font-size:9.5pt;">${c.trim()}</td>`).join('');
    return `<tr>${tds}</tr>`;
  });

  // Wrap rows in table if present
  if (html.includes('<tr>')) {
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/gim, (tableContent) => {
      return `<table style="width:100%; border-collapse:collapse; margin:14pt 0; border:1px solid #cbd5e1;"><tbody style="background:#fff;">${tableContent}</tbody></table>`;
    });
  }

  const printDocumentHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 20mm;
    }
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 24px;
      line-height: 1.6;
      background: #ffffff;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .print-header h4 {
      margin: 0;
      font-size: 11pt;
      color: #0f172a;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .print-header span {
      font-size: 9pt;
      color: #64748b;
    }
    h1, h2, h3 { font-family: 'Segoe UI', Calibri, sans-serif; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 8px 10px; text-align: left; }
    tr:nth-child(even) { background-color: #f8fafc; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h4>WorkDesk • Centro Operativo</h4>
    <span>${new Date().toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>
  ${html}
</body>
</html>
  `;

  // Use hidden iframe to avoid browser / Tauri popup blockers
  let iframe = document.getElementById('workdesk-print-frame') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'workdesk-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    window.print();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(printDocumentHtml);
  iframeDoc.close();

  setTimeout(() => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch (_) {
      window.print();
    }
  }, 300);
}
