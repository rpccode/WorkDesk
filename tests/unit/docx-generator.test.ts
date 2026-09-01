import { describe, it, expect } from 'vitest';
import { generateDocxBlobFromMarkdown } from '../../src/utils/docx-generator';

describe('Word (.docx) Generator Engine', () => {
  it('generates a valid binary docx Blob from markdown with headings, lists, and tables', async () => {
    const markdown = `# INFORME DE DIAGNÓSTICO OPERATIVO

**Cliente:** PREFIAUTO
**Fecha:** 1 de Septiembre de 2026

---

## 1. RESUMEN EJECUTIVO
Este es un párrafo con texto en **negrita** y regular.

> Nota importante de consultoría técnica.

### Tabla de Evaluación
| Parámetro | Valor Evaluado |
| :--- | :--- |
| **Complejidad** | Alta |
| **Sucursales** | 5 |

- Punto 1 de recomendación
- Punto 2 de recomendación
`;

    const blob = await generateDocxBlobFromMarkdown(markdown, 'Informe de Diagnóstico');

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
});
