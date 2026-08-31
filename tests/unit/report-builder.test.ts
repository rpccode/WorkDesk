import { describe, it, expect } from 'vitest';
import { buildWeeklyReport } from '../../src/utils/report-builder';

describe('report-builder', () => {
  it('generates a formatted markdown report with all active sections', () => {
    const report = buildWeeklyReport({
      periodTitle: 'Semana 35 (25 - 31 Agosto 2026)',
      activeCases: [
        {
          id: 'case-1',
          client_id: 'cl-1',
          client_name: 'Banco Atlas',
          title: 'Migración a Core Bancario',
          status: 'in_progress',
          priority: 'critical',
          created_at: '2026-08-01',
        },
      ],
      criticalCases: [
        {
          id: 'case-1',
          client_id: 'cl-1',
          client_name: 'Banco Atlas',
          title: 'Migración a Core Bancario',
          status: 'in_progress',
          priority: 'critical',
          description: 'Bloqueado por firma de contrato',
          created_at: '2026-08-01',
        },
      ],
      completedCommitments: [
        {
          id: 'com-1',
          case_id: 'case-1',
          client_name: 'Banco Atlas',
          description: 'Entrega de documento de arquitectura',
          owner: 'me',
          status: 'done',
          created_at: '2026-08-25',
          done_at: '2026-08-29',
        },
      ],
      pendingCommitments: [
        {
          id: 'com-2',
          case_id: 'case-1',
          client_name: 'Banco Atlas',
          description: 'Ajustar validaciones de API',
          owner: 'me',
          due_date: '2026-09-02',
          status: 'pending',
          created_at: '2026-08-30',
        },
      ],
      waitingCommitments: [
        {
          id: 'com-3',
          case_id: 'case-1',
          client_name: 'Banco Atlas',
          description: 'Respuesta de seguridad informática',
          owner: 'client',
          due_date: '2026-09-01',
          status: 'pending',
          created_at: '2026-08-28',
        },
      ],
    });

    expect(report).toContain('Semana 35');
    expect(report).toContain('Banco Atlas');
    expect(report).toContain('Migración a Core Bancario');
    expect(report).toContain('Entrega de documento de arquitectura');
    expect(report).toContain('Esperando Respuesta');
  });

  it('handles empty week state gracefully with explicit message', () => {
    const report = buildWeeklyReport({
      periodTitle: 'Semana 35',
      activeCases: [],
      criticalCases: [],
      completedCommitments: [],
      pendingCommitments: [],
      waitingCommitments: [],
    });

    expect(report).toContain('No se registraron movimientos');
    expect(report).not.toContain('undefined');
  });
});
