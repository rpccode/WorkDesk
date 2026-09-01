import mammoth from 'mammoth';

/**
 * Convierte colores CSS de Word a nombres legibles.
 */
function normalizeMammothHtml(html: string): string {
  // Asegura que los párrafos vacíos en Word se conviertan en espacio
  return html
    .replace(/<p><\/p>/g, '<p>&nbsp;</p>')
    .replace(/<p>\s*<\/p>/g, '<p>&nbsp;</p>');
}

/**
 * Opciones extendidas de Mammoth para preservar formato avanzado del Word.
 */
const mammothOptions = {
  styleMap: [
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
    "p[style-name='Title'] => h1.doc-title:fresh",
    "p[style-name='Subtitle'] => p.doc-subtitle:fresh",
    "p[style-name='Quote'] => blockquote:fresh",
    "p[style-name='Intense Quote'] => blockquote.intense:fresh",
    "p[style-name='Caption'] => p.caption:fresh",
    "table => table",
    "tr => tr",
    "td => td",
    "th => th",
  ],
};

/**
 * Parses a Word (.docx) file preserving its original formatting as HTML.
 * Falls back to markdown conversion for .txt and .md files.
 */
export async function parseDocumentTemplateFile(file: File): Promise<{
  title: string;
  content: string;
  htmlContent?: string;
  isHtmlFormat?: boolean;
}> {
  const fileName = file.name.replace(/\.[^/.]+$/, '');
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    
    // Use mammoth to get rich HTML with extended style mapping
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, mammothOptions);
    const normalizedHtml = normalizeMammothHtml(htmlResult.value);

    // Also extract plain text for storage/search purposes
    const textResult = await mammoth.extractRawText({ arrayBuffer });

    return {
      title: fileName,
      content: textResult.value || normalizedHtml.replace(/<[^>]+>/g, ' '),
      htmlContent: normalizedHtml,
      isHtmlFormat: true,
    };
  } else {
    const text = await file.text();
    return {
      title: fileName,
      content: text,
      isHtmlFormat: false,
    };
  }
}
