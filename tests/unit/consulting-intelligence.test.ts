import { describe, it, expect } from 'vitest';
import { calculateClientHealth } from '../../src/utils/client-health';
import { generateCaseBrief, formatCaseBriefEmailText } from '../../src/utils/case-brief-generator';
import { calculateConsultantAnalytics } from '../../src/utils/consultant-analytics';
import type { Client, Case, Commitment, Ticket, Followup, Note } from '../../src/types';

describe('Consulting Intelligence Engine (WorkDesk 0.4)', () => {
  const mockClient: Client = {
    id: 'cli-1',
    name: 'Banco Capital',
    company: 'Capital Corp',
    category: 'Financiera',
    complexity_weighted: 'Alta',
    complexity_evaluated: 'Alta',
    has_it_department: false,
    branches_count: 12,
    employees_count: 500,
    created_at: '2026-01-01T10:00:00Z',
  };

  const mockCase: Case = {
    id: 'case-1',
    title: 'Migración Core Bancario',
    description: 'Actualización integral de base de datos y módulos contables.',
    status: 'open',
    priority: 'critical',
    client_id: 'cli-1',
    client_name: 'Banco Capital',
    created_at: '2026-02-01T10:00:00Z',
    next_action: {
      description: 'Alinear credenciales de VPN con Seguridad',
      due_date: '2026-09-02',
      owner_type: 'me',
      status: 'pending',
    },
  };

  const mockCommitments: Commitment[] = [
    {
      id: 'comm-1',
      case_id: 'case-1',
      description: 'Enviar script de migración',
      owner: 'me',
      due_date: '2026-09-05T00:00:00Z',
      status: 'done',
      done_at: '2026-09-04T00:00:00Z',
      created_at: '2026-08-20T10:00:00Z',
    },
    {
      id: 'comm-2',
      case_id: 'case-1',
      description: 'Validar acceso a servidor staging',
      owner: 'client',
      due_date: '2026-08-25T00:00:00Z', // Overdue
      status: 'pending',
      created_at: '2026-08-20T10:00:00Z',
    },
  ];

  const mockTickets: Ticket[] = [
    {
      id: 'tick-1',
      ticket_number: 'TCK-101',
      title: 'Fallo en servicio de autenticación',
      client_id: 'cli-1',
      status: 'open',
      priority: 'critical',
      category: 'Soporte TI',
      created_at: '2026-08-28T10:00:00Z',
    },
  ];

  it('calculates Client Health & Risk Score accurately with factors & recommendations', () => {
    const report = calculateClientHealth(mockClient, [mockCase], mockCommitments, mockTickets);

    expect(report.client_id).toBe('cli-1');
    expect(report.factors.overdue_count).toBe(1);
    expect(report.factors.critical_tickets_count).toBe(1);
    expect(report.factors.complexity_penalty).toBeGreaterThan(0);
    expect(report.score).toBeGreaterThan(40);
    expect(report.level).toMatch(/warning|critical/);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('generates a complete Case Brief and formats email for different consultant tones', () => {
    const mockFollowups: Followup[] = [
      {
        id: 'f-1',
        case_id: 'case-1',
        date: '2026-08-30',
        summary: 'Acuerdo de reunión: Se aprueba esquema de particionamiento.',
        created_at: '2026-08-30T10:00:00Z',
      },
    ];
    const mockNotes: Note[] = [];

    const brief = generateCaseBrief(mockCase, mockCommitments, mockFollowups, mockNotes);

    expect(brief.case_id).toBe('case-1');
    expect(brief.title).toBe('Migración Core Bancario');
    expect(brief.pending_commitments.length).toBe(1);
    expect(brief.completed_commitments.length).toBe(1);
    expect(brief.next_action?.description).toBe('Alinear credenciales de VPN con Seguridad');
    expect(brief.key_decisions[0]).toContain('Acuerdo de reunión');
    expect(brief.blockers.length).toBe(1);

    // Test tone formatting
    const formalEmail = formatCaseBriefEmailText(brief, 'formal');
    expect(formalEmail).toContain('Junto con saludar');
    expect(formalEmail).toContain('Migración Core Bancario');

    const assertiveEmail = formatCaseBriefEmailText(brief, 'assertive');
    expect(assertiveEmail).toContain('PRÓXIMA ACCIÓN REQUERIDA');
    expect(assertiveEmail).toContain('DEPENDENCIAS / BLOQUEOS ACTUALES');

    const techEmail = formatCaseBriefEmailText(brief, 'technical');
    expect(techEmail).toContain('1. ALCANCE Y CONTEXTO');
    expect(techEmail).toContain('2. ACUERDOS Y DECISIONES TÉCNICAS');
  });

  it('calculates Consultant Productivity Analytics and Bottleneck Radar correctly', () => {
    const analytics = calculateConsultantAnalytics([mockClient], [mockCase], mockCommitments);

    expect(analytics.on_time_sla_rate).toBe(100); // comm-1 was completed before due date
    expect(analytics.total_commitments_completed).toBe(1);
    expect(analytics.bottlenecks_by_client.length).toBe(1);
    expect(analytics.bottlenecks_by_client[0].client_id).toBe('cli-1');
    expect(analytics.bottlenecks_by_client[0].waiting_items_count).toBe(1);
  });
});
