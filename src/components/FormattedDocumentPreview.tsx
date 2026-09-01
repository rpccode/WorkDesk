import React from 'react';

interface FormattedDocumentPreviewProps {
  markdownContent: string;
  htmlContent?: string;
  isHtmlFormat?: boolean;
  docTitle?: string;
  docCategory?: string;
}

/**
 * Renders the document preview using:
 * - Native HTML rendering (from Word .docx via Mammoth) when htmlContent is provided
 * - Markdown-to-React rendering for templates created in-app
 */
export const FormattedDocumentPreview: React.FC<FormattedDocumentPreviewProps> = ({
  markdownContent,
  htmlContent,
  isHtmlFormat = false,
  docTitle = 'Documento de Consultoría',
  docCategory,
}) => {

  const renderFormattedInlineText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={`bold-${idx}`} style={{ fontWeight: 800, color: '#0f172a' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`text-${idx}`}>{part}</span>;
    });
  };

  const parseMarkdownToElements = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (keyIndex: number) => {
      if (tableRows.length === 0) return;
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(1);
      elements.push(
        <div key={`table-wrapper-${keyIndex}`} style={{ margin: '1.25rem 0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                {headerRow.map((col, cIdx) => (
                  <th key={`th-${cIdx}`} style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, borderBottom: '2px solid #334155' }}>
                    {col.replace(/\*\*/g, '').trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => (
                <tr key={`tr-${rIdx}`} style={{ backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {row.map((cell, cIdx) => {
                    const isBold = cell.includes('**');
                    const text = cell.replace(/\*\*/g, '').trim();
                    return (
                      <td key={`td-${rIdx}-${cIdx}`} style={{ padding: '0.55rem 0.85rem', fontWeight: isBold ? 700 : 400, color: isBold ? '#0f172a' : '#334155' }}>
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (trimmed.includes('---')) continue;
        const cells = trimmed.slice(1, -1).split('|').map((c) => c.trim());
        inTable = true;
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        flushTable(i);
      }

      if (!trimmed) {
        elements.push(<div key={`spacer-${i}`} style={{ height: '0.6rem' }} />);
        continue;
      }

      if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={`h1-${i}`} style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '1.5rem', marginBottom: '0.85rem', letterSpacing: '-0.02em', textTransform: 'uppercase', borderBottom: '2px solid #0f172a', paddingBottom: '0.4rem' }}>{trimmed.replace(/^#\s+/, '')}</h1>);
      } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={`h2-${i}`} style={{ fontSize: '1.12rem', fontWeight: 800, color: '#1e3a8a', marginTop: '1.4rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.3rem' }}>{trimmed.replace(/^##\s+/, '')}</h2>);
      } else if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={`h3-${i}`} style={{ fontSize: '0.96rem', fontWeight: 700, color: '#334155', marginTop: '1rem', marginBottom: '0.35rem' }}>{trimmed.replace(/^###\s+/, '')}</h3>);
      } else if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '1.25rem 0' }} />);
      } else if (trimmed.startsWith('> ')) {
        elements.push(<blockquote key={`quote-${i}`} style={{ margin: '0.85rem 0', padding: '0.65rem 1rem', backgroundColor: '#f8fafc', borderLeft: '4px solid #2563eb', borderRadius: '0 4px 4px 0', color: '#334155', fontSize: '0.86rem', fontStyle: 'italic' }}>{renderFormattedInlineText(trimmed.replace(/^>\s+/, ''))}</blockquote>);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(<div key={`bullet-${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.25rem 0', paddingLeft: '0.75rem', fontSize: '0.86rem', color: '#1e293b' }}><span style={{ color: '#2563eb', fontWeight: 800 }}>•</span><div>{renderFormattedInlineText(trimmed.replace(/^[-*]\s+/, ''))}</div></div>);
      } else if (/^\d+\.\s+/.test(trimmed)) {
        const match = trimmed.match(/^(\d+)\.\s+(.*)$/);
        elements.push(<div key={`num-${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.25rem 0', paddingLeft: '0.75rem', fontSize: '0.86rem', color: '#1e293b' }}><span style={{ fontWeight: 700, color: '#1e3a8a', minWidth: '16px' }}>{match ? `${match[1]}.` : '1.'}</span><div>{renderFormattedInlineText(match ? match[2] : trimmed)}</div></div>);
      } else {
        elements.push(<p key={`p-${i}`} style={{ margin: '0.45rem 0', fontSize: '0.86rem', lineHeight: 1.65, color: '#1e293b' }}>{renderFormattedInlineText(trimmed)}</p>);
      }
    }

    if (inTable) flushTable(lines.length);
    return elements;
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderRadius: '8px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #cbd5e1',
        padding: '2.5rem 2.75rem',
        minHeight: '750px',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Official Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
        <div>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0f172a', margin: 0 }}>
            WorkDesk • Consultoría Operativa
          </h4>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
            {docCategory ? `CATEGORÍA: ${docCategory.toUpperCase()}` : 'DOCUMENTO OFICIAL DE GESTIÓN'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>
            {new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            REF: WD-{docTitle.substring(0, 3).toUpperCase()}-{new Date().getFullYear()}
          </span>
        </div>
      </div>

      {/* Main Document Content */}
      <div style={{ flex: 1 }}>
        {isHtmlFormat && htmlContent ? (
          /* ── MODO HTML: Preserva formato original del Word ── */
          <div
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            style={{
              fontSize: '0.87rem',
              lineHeight: 1.7,
              color: '#1e293b',
            }}
            className="docx-html-preview"
          />
        ) : (
          /* ── MODO MARKDOWN: Plantillas creadas en la app ── */
          parseMarkdownToElements(markdownContent)
        )}
      </div>

      {/* Official Footer */}
      <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
        <span>WorkDesk • Documento Oficial y Confidencial</span>
        <span style={{ fontWeight: 700, color: '#64748b' }}>Página 1 de 1</span>
      </div>
    </div>
  );
};
