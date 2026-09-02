import { describe, it, expect } from 'vitest';
import {
  buildWorkDeskContext,
  detectAbandonedAndRiskCases,
  findSimilarCases,
  extractCommitmentsFromText,
  generateMorningBriefAI,
  DEFAULT_AI_CONFIG,
} from '../../src/services/ai-copilot';
import type { Case, Commitment, Client, Ticket, Note } from '../../src/types';

describe('WorkDesk 0.5 — AI Copilot Service Layer', () => {
  const mockClients: Client[] = [
    {
      id: 'client-1',
      name: 'Banco Capital',
      company: 'Banco Capital S.A.',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'client-2',
      name: 'Retail Global',
      company: 'Retail Global Corp.',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockCases: Case[] = [
    {
      id: 'case-1',
      client_id: 'client-1',
      client_name: 'Banco Capital',
      title: 'Migración Core Bancario y Servidores',
      description: 'Migración de arquitectura en la nube AWS y base de datos Oracle',
      status: 'open',
      priority: 'critical',
      next_action: {
        description: 'Validar acceso VPN con seguridad',
        due_date: '2026-09-02',
        owner_type: 'client',
        status: 'pending',
      },
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-05T00:00:00Z', // 28 days idle
    },
    {
      id: 'case-2',
      client_id: 'client-1',
      client_name: 'Banco Capital',
      title: 'Auditoría de Seguridad y Core de Servidores',
      description: 'Revisión técnica de vulnerabilidades en infraestructura nube AWS',
      status: 'in_progress',
      priority: 'high',
      created_at: '2026-08-30T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'case-3',
      client_id: 'client-2',
      client_name: 'Retail Global',
      title: 'Diseño Ecommerce Shopify',
      description: 'Implementación de catálogo de productos y checkout',
      status: 'closed',
      priority: 'low',
      created_at: '2026-07-01T00:00:00Z',
      closed_at: '2026-07-20T00:00:00Z',
    },
  ];

  const mockCommitments: Commitment[] = [
    {
      id: 'comm-1',
      case_id: 'case-1',
      case_title: 'Migración Core Bancario',
      client_name: 'Banco Capital',
      description: 'Entregar credenciales de acceso',
      owner: 'client',
      due_date: '2026-08-10', // overdue
      status: 'pending',
      created_at: '2026-08-01T00:00:00Z',
    },
    {
      id: 'comm-2',
      case_id: 'case-2',
      case_title: 'Auditoría de Seguridad',
      client_name: 'Banco Capital',
      description: 'Completar informe técnico preliminar',
      owner: 'me',
      due_date: '2026-09-05',
      status: 'pending',
      created_at: '2026-08-30T00:00:00Z',
    },
  ];

  const mockTickets: Ticket[] = [
    {
      id: 'ticket-1',
      client_id: 'client-1',
      case_id: 'case-1',
      title: 'Error 500 en endpoint de pagos',
      status: 'in_progress',
      priority: 'critical',
      created_at: '2026-08-15T00:00:00Z',
    },
  ];

  it('buildWorkDeskContext compiles structured context text accurately', () => {
    const context = buildWorkDeskContext({
      cases: mockCases,
      commitments: mockCommitments,
      clients: mockClients,
      tickets: mockTickets,
      userName: 'Roberto Pérez',
      userRole: 'Consultor Senior',
    });

    expect(context).toContain('# CONTEXTO OPERACIONAL WORKDESK');
    expect(context).toContain('Consultor: Roberto Pérez');
    expect(context).toContain('Casos Activos: 2');
    expect(context).toContain('Migración Core Bancario y Servidores');
    expect(context).toContain('Entregar credenciales de acceso');
    expect(context).toContain('Banco Capital');
  });

  it('detectAbandonedAndRiskCases identifies idle cases and overdue risks with severity ranking', () => {
    const risks = detectAbandonedAndRiskCases(
      mockCases,
      mockCommitments,
      mockTickets,
      mockClients
    );

    expect(risks.length).toBeGreaterThanOrEqual(1);
    const criticalRisk = risks.find((r) => r.caseId === 'case-1');
    expect(criticalRisk).toBeDefined();
    expect(criticalRisk?.riskLevel).toBe('critical');
    expect(criticalRisk?.reasons.some((reason) => reason.includes('Inactivo por'))).toBe(true);
    expect(criticalRisk?.reasons.some((reason) => reason.includes('vencido'))).toBe(true);
    expect(criticalRisk?.suggestedAction).toBeDefined();
  });

  it('findSimilarCases discovers relevant precedent cases based on keywords and client similarity', () => {
    const targetCase = mockCases[0]; // Migración Core Bancario y Servidores
    const similar = findSimilarCases(targetCase, mockCases, []);

    expect(similar.length).toBeGreaterThanOrEqual(1);
    expect(similar[0].caseItem.id).toBe('case-2'); // Auditoría de Seguridad y Core de Servidores
    expect(similar[0].score).toBeGreaterThan(0.2);
    expect(similar[0].matchingPoints).toContain('Mismo cliente');
  });

  it('extractCommitmentsFromText returns parsed heuristic drafts when unconfigured', async () => {
    const rawNotes = `
- Enviar informe de avance a la gerencia
- Confirmar reunión con el equipo de TI
- Validar requerimientos de seguridad
`;
    const drafts = await extractCommitmentsFromText(rawNotes, DEFAULT_AI_CONFIG);
    expect(drafts.length).toBeGreaterThanOrEqual(1);
    expect(drafts[0].description).toBeDefined();
    expect(drafts[0].owner).toBe('me');
  });

  it('generateMorningBriefAI returns executive heuristic brief when unconfigured', async () => {
    const brief = await generateMorningBriefAI(
      {
        cases: mockCases,
        commitments: mockCommitments,
        clients: mockClients,
        tickets: mockTickets,
        userName: 'Roberto',
      },
      DEFAULT_AI_CONFIG
    );

    expect(brief).toContain('Brief Matutino (Modo Heurístico)');
    expect(brief).toContain('casos activos');
  });
});
