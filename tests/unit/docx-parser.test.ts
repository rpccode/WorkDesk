import { describe, it, expect } from 'vitest';
import { parseDocumentTemplateFile } from '../../src/utils/docx-parser';

describe('docx-parser', () => {
  it('parses plain text files correctly into title and content', async () => {
    const fakeFile = new File(['# Titulo de Prueba\n\nHola {{cliente_nombre}}'], 'plantilla_minuta.txt', {
      type: 'text/plain',
    });

    const result = await parseDocumentTemplateFile(fakeFile);
    expect(result.title).toBe('plantilla_minuta');
    expect(result.content).toContain('{{cliente_nombre}}');
    expect(result.content).toContain('# Titulo de Prueba');
  });
});
