import mammoth from 'mammoth';

/**
 * Converts HTML produced by Mammoth into clean Markdown compatible with WorkDesk document generator.
 */
function convertHtmlToMarkdown(html: string): string {
  let md = html;

  // Headings
  md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4>(.*?)<\/h4>/gi, '### $1\n\n');

  // Bold & Italic
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');

  // Lists
  md = md.replace(/<li><p>(.*?)<\/p><\/li>/gi, '- $1\n');
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul>\s*/gi, '\n');
  md = md.replace(/<\/ul>\s*/gi, '\n');
  md = md.replace(/<ol>\s*/gi, '\n');
  md = md.replace(/<\/ol>\s*/gi, '\n');

  // Tables
  md = md.replace(/<table>([\s\S]*?)<\/table>/gi, (_match, tableBody) => {
    const rows = tableBody.match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
    if (rows.length === 0) return '';

    let tableMd = '\n';
    rows.forEach((rowHtml: string, index: number) => {
      const cells = rowHtml.match(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi) || [];
      const rowCells = cells.map((c: string) =>
        c.replace(/<(td|th)[^>]*>/gi, '').replace(/<\/(td|th)>/gi, '').trim().replace(/\n/g, ' ')
      );

      tableMd += '| ' + rowCells.join(' | ') + ' |\n';

      // Insert separator after first row
      if (index === 0) {
        tableMd += '| ' + rowCells.map(() => ':---').join(' | ') + ' |\n';
      }
    });

    return tableMd + '\n';
  });

  // Paragraphs
  md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Clean empty tags and excessive newlines
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

/**
 * Parses a Word (.docx) file or text/markdown file into formatted text.
 */
export async function parseDocumentTemplateFile(file: File): Promise<{
  title: string;
  content: string;
}> {
  const fileName = file.name.replace(/\.[^/.]+$/, '');
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const markdown = convertHtmlToMarkdown(result.value);

    return {
      title: fileName,
      content: markdown || result.value,
    };
  } else {
    // Text, Markdown, or other plain text formats
    const text = await file.text();
    return {
      title: fileName,
      content: text,
    };
  }
}
