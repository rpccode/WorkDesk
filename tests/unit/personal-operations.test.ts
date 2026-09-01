import { describe, it, expect } from 'vitest';
import type { Case, Commitment, InboxItem, NextAction } from '../../src/types';

describe('Personal Operations Center (WorkDesk 0.3)', () => {
  describe('Próxima Acción (Next Action) Logic', () => {
    it('identifies cases without a next action defined', () => {
      const activeCases: Case[] = [
        {
          id: 'case_1',
          client_id: 'cli_1',
          title: 'Caso con acción',
          status: 'open',
          priority: 'high',
          created_at: new Date().toISOString(),
          next_action: {
            description: 'Llamar a Gerencia para validar contrato',
            due_date: '2026-09-05',
            owner_type: 'me',
            status: 'pending',
          },
        },
        {
          id: 'case_2',
          client_id: 'cli_2',
          title: 'Caso huérfano sin acción',
          status: 'in_progress',
          priority: 'medium',
          created_at: new Date().toISOString(),
          next_action: null,
        },
      ];

      const casesWithoutAction = activeCases.filter((c) => !c.next_action?.description);
      expect(casesWithoutAction).toHaveLength(1);
      expect(casesWithoutAction[0].id).toBe('case_2');
    });

    it('correctly tracks completed next actions', () => {
      const action: NextAction = {
        description: 'Revisión final de arquitectura',
        due_date: '2026-09-02',
        owner_type: 'me',
        status: 'pending',
      };

      expect(action.status).toBe('pending');
      const completedAction: NextAction = { ...action, status: 'done' };
      expect(completedAction.status).toBe('done');
    });
  });

  describe('Esperando de Otros (Aging Calculation)', () => {
    it('calculates days waiting correctly', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const today = new Date().toISOString();

      const comms: Commitment[] = [
        {
          id: 'comm_1',
          case_id: 'case_1',
          description: 'Aprobación de presupuesto por cliente',
          owner: 'client',
          status: 'pending',
          created_at: fiveDaysAgo,
        },
        {
          id: 'comm_2',
          case_id: 'case_1',
          description: 'Respuesta de soporte TI de infraestructura',
          owner: 'third_party',
          status: 'pending',
          created_at: today,
        },
      ];

      const waitingItems = comms.map((c) => {
        const createdDate = new Date(c.created_at);
        const diffDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...c, diffDays };
      });

      expect(waitingItems[0].diffDays).toBeGreaterThanOrEqual(5);
      expect(waitingItems[1].diffDays).toBeLessThanOrEqual(1);
      expect(waitingItems[0].diffDays >= 5).toBe(true); // Critical waiting threshold
    });
  });

  describe('Inbox GTD Item Lifecycle', () => {
    it('creates an unprocessed inbox item and transitions to processed', () => {
      const item: InboxItem = {
        id: 'inbox_123',
        content: 'Recordar revisar logs de migración el viernes',
        suggested_type: 'task',
        status: 'inbox',
        created_at: new Date().toISOString(),
      };

      expect(item.status).toBe('inbox');
      expect(item.processed_as).toBeUndefined();

      // Process as commitment
      const processed: InboxItem = {
        ...item,
        status: 'processed',
        processed_as: 'commitment',
        processed_at: new Date().toISOString(),
      };

      expect(processed.status).toBe('processed');
      expect(processed.processed_as).toBe('commitment');
    });
  });
});
