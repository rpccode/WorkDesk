import { describe, it, expect } from 'vitest';
import {
  injectTemplateTokens,
  DEFAULT_DOCUMENT_TEMPLATES,
} from '../../src/utils/document-templates';
import type { Client, Case, Commitment, ConsultantProfile } from '../../src/types';

describe('Document Templates & Variable Injection Engine', () => {
  const mockClient: Client = {
    id: 'cli-test',
    name: 'PREFIAUTO',
    company: 'Prefiauto S.A.',
    category: 'Financiera',
    complexity_evaluated: 'Alta',
    complexity_weighted: 'Alta',
    ticket_avg: 9,
    branches_count: 5,
    employees_count: 100,
    systems_count: 2,
    has_it_department: true,
    email: 'contacto@prefiauto.com',
    phone: '+1 809 555 1234',
    status: 'active',
    created_at: '2026-09-01',
  };

  const mockCase: Case = {
    id: 'case-test',
    client_id: 'cli-test',
    title: 'Migración de Servidores y Base de Datos',
    description: 'Actualización y respaldo de infraestructuras críticas',
    priority: 'critical',
    status: 'in_progress',
    created_at: '2026-09-01',
  };

  const mockCommitments: Commitment[] = [
    {
      id: 'com-1',
      case_id: 'case-test',
      description: 'Entregar reporte de diagnóstico',
      owner: 'me',
      status: 'done',
      due_date: '2026-09-05',
      created_at: '2026-09-01',
    },
  ];

  const mockConsultant: ConsultantProfile = {
    name: 'Rudy Consultor',
    role_title: 'Consultor Principal de Negocios',
    company: 'WorkDesk Advising',
    email: 'rudy@workdesk.com',
    phone: '+1 809 777 8888',
    avatar_initials: 'RC',
    signature_text: 'Rudy C.',
  };

  it('contains standard preloaded document templates', () => {
    expect(DEFAULT_DOCUMENT_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    const diagnostico = DEFAULT_DOCUMENT_TEMPLATES.find((t) => t.id === 'tmpl-diagnostico');
    expect(diagnostico).toBeDefined();
    expect(diagnostico?.content).toContain('{{cliente_nombre}}');
  });

  it('correctly replaces all client, case, and consultant placeholders in text', () => {
    const rawTemplate = `
Documento para {{cliente_nombre}} ({{cliente_empresa}}) - Categoría: {{cliente_categoria}}
Caso: {{caso_titulo}} [{{caso_prioridad}}]
Consultor: {{consultor_nombre}} de {{consultor_empresa}}
Complejidad: {{cliente_complejidad_evaluada}} | Sucursales: {{cliente_sucursales}} | Empleados: {{cliente_empleados}} | Depto TI: {{cliente_depto_ti}}
`;

    const result = injectTemplateTokens(rawTemplate, {
      client: mockClient,
      currentCase: mockCase,
      commitments: mockCommitments,
      consultantProfile: mockConsultant,
    });

    expect(result).toContain('PREFIAUTO');
    expect(result).toContain('Prefiauto S.A.');
    expect(result).toContain('Financiera');
    expect(result).toContain('Migración de Servidores y Base de Datos');
    expect(result).toContain('Crítica');
    expect(result).toContain('Rudy Consultor');
    expect(result).toContain('WorkDesk Advising');
    expect(result).toContain('Alta');
    expect(result).toContain('5');
    expect(result).toContain('100');
    expect(result).toContain('Sí');
  });

  it('renders commitments table when {{tabla_compromisos}} is used', () => {
    const template = 'Compromisos:\n{{tabla_compromisos}}';
    const result = injectTemplateTokens(template, {
      client: mockClient,
      currentCase: mockCase,
      commitments: mockCommitments,
      consultantProfile: mockConsultant,
    });

    expect(result).toContain('Entregar reporte de diagnóstico');
    expect(result).toContain('Consultor');
    expect(result).toContain('✓ Completado');
  });
});
