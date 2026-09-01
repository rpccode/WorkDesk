import { describe, it, expect } from 'vitest';
import type { Client, Case } from '../../src/types';

describe('Searchable Select Filtering Logic', () => {
  const sampleClients: Client[] = [
    {
      id: 'cli-1',
      name: 'AGROVISION',
      company: 'Agro Industrial',
      category: 'Administrativo',
      status: 'active',
      created_at: '2026-09-01',
    },
    {
      id: 'cli-2',
      name: 'CAMARA DE COMERCIO (SANTIAGO)',
      company: 'Gremio Empresarial',
      category: 'Comercial',
      status: 'active',
      created_at: '2026-09-01',
    },
    {
      id: 'cli-3',
      name: 'COOP DENOR',
      company: 'Cooperativa del Norte',
      category: 'Cooperativa',
      status: 'active',
      created_at: '2026-09-01',
    },
  ];

  it('filters clients accurately by name, company, or category', () => {
    const filterClients = (term: string) => {
      const q = term.toLowerCase().trim();
      return sampleClients.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.category && c.category.toLowerCase().includes(q))
      );
    };

    expect(filterClients('agro').length).toBe(1);
    expect(filterClients('agro')[0].name).toBe('AGROVISION');

    expect(filterClients('santiago').length).toBe(1);
    expect(filterClients('santiago')[0].name).toContain('CAMARA DE COMERCIO');

    expect(filterClients('coop').length).toBe(1);
    expect(filterClients('cooperativa').length).toBe(1);

    expect(filterClients('inexistente').length).toBe(0);
  });
});
