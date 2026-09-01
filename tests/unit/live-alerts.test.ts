import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateLiveAlerts, resetAlertSessionCache } from '../../src/utils/live-alerts';
import type { Commitment, Case, Client } from '../../src/types';

describe('Live Alerts Evaluator', () => {
  beforeEach(() => {
    resetAlertSessionCache();
  });

  it('detects overdue commitments and generates critical alerts', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const mockCommitments: Commitment[] = [
      {
        id: 'com-1',
        case_id: 'case-1',
        description: 'Entregar propuesta técnica',
        owner: 'me',
        due_date: yesterday,
        status: 'pending',
        created_at: yesterday,
      },
    ];

    const mockCases: Case[] = [
      {
        id: 'case-1',
        client_id: 'cli-1',
        client_name: 'Empresa Alpha',
        title: 'Auditoría de Sistemas',
        status: 'active',
        priority: 'high',
        created_at: yesterday,
      },
    ];

    const alerts = evaluateLiveAlerts(mockCommitments, mockCases, []);

    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe('critical');
    expect(alerts[0].title).toContain('Compromiso Vencido');
    expect(alerts[0].message).toContain('Empresa Alpha');
  });

  it('detects commitments due today and generates warning alerts', () => {
    const today = new Date().toISOString().split('T')[0];

    const mockCommitments: Commitment[] = [
      {
        id: 'com-2',
        case_id: 'case-2',
        description: 'Llamar a gerencia',
        owner: 'me',
        due_date: today,
        status: 'pending',
        created_at: today,
      },
    ];

    const mockCases: Case[] = [
      {
        id: 'case-2',
        client_id: 'cli-2',
        client_name: 'Cliente Beta',
        title: 'Revisión trimestral',
        status: 'active',
        priority: 'medium',
        created_at: today,
      },
    ];

    const alerts = evaluateLiveAlerts(mockCommitments, mockCases, []);

    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe('warning');
    expect(alerts[0].title).toContain('Vence Hoy');
  });

  it('ignores completed commitments', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const mockCommitments: Commitment[] = [
      {
        id: 'com-done',
        case_id: 'case-1',
        description: 'Tarea pasada ya hecha',
        owner: 'me',
        due_date: yesterday,
        status: 'done',
        created_at: yesterday,
      },
    ];

    const alerts = evaluateLiveAlerts(mockCommitments, [], []);
    expect(alerts.length).toBe(0);
  });
});
