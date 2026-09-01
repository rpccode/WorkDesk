import { describe, it, expect } from 'vitest';
import {
  parseTicketPriority,
  parseTicketStatus,
  parseTicketCategory,
  parseTicketChannel,
  parseTicketDate,
  convertRowsToCreateTicketInputs,
  type ParsedTicketRow,
} from '../../src/utils/excel-ticket-importer';

describe('Ticket Excel Importer & Parser Utilities', () => {
  it('correctly normalizes ticket priorities', () => {
    expect(parseTicketPriority('Crítica')).toBe('critical');
    expect(parseTicketPriority('Urgente')).toBe('critical');
    expect(parseTicketPriority('P1')).toBe('critical');
    expect(parseTicketPriority('Alta')).toBe('high');
    expect(parseTicketPriority('P2')).toBe('high');
    expect(parseTicketPriority('Media')).toBe('medium');
    expect(parseTicketPriority('Baja')).toBe('low');
    expect(parseTicketPriority(undefined)).toBe('medium');
  });

  it('correctly normalizes ticket statuses', () => {
    expect(parseTicketStatus('Abierto')).toBe('open');
    expect(parseTicketStatus('En Progreso')).toBe('in_progress');
    expect(parseTicketStatus('Espera Cliente')).toBe('waiting_client');
    expect(parseTicketStatus('Resuelto')).toBe('resolved');
    expect(parseTicketStatus('Cerrado')).toBe('closed');
    expect(parseTicketStatus('Finalizado')).toBe('closed');
    expect(parseTicketStatus(null)).toBe('open');
  });

  it('correctly normalizes categories and channels', () => {
    expect(parseTicketCategory('Error en servidor')).toBe('Incidencia');
    expect(parseTicketCategory('Nuevo requerimiento')).toBe('Requerimiento');
    expect(parseTicketCategory('Asesoría técnica')).toBe('Consultoría');
    expect(parseTicketCategory('Cobro mensual')).toBe('Facturación');
    expect(parseTicketCategory('Cloud & VPN')).toBe('Infraestructura');

    expect(parseTicketChannel('WhatsApp')).toBe('WhatsApp');
    expect(parseTicketChannel('Llamada telefónica')).toBe('Teléfono');
    expect(parseTicketChannel('Portal Helpdesk')).toBe('Portal');
    expect(parseTicketChannel('Email')).toBe('Email');
  });

  it('correctly parses and normalizes diverse date formats', () => {
    expect(parseTicketDate('2026-09-15')).toBe('2026-09-15');
    expect(parseTicketDate('15/09/2026')).toBe('2026-09-15');
    expect(parseTicketDate('15-09-2026')).toBe('2026-09-15');
    expect(parseTicketDate(undefined)).toBeUndefined();
  });

  it('converts valid parsed rows into CreateTicketInput payloads', () => {
    const rows: ParsedTicketRow[] = [
      {
        rowNumber: 2,
        ticket_number: 'TCK-001',
        client_raw_name: 'PREFIAUTO',
        matched_client_id: 'client-123',
        title: 'Falla en servidor',
        category: 'Incidencia',
        priority: 'critical',
        status: 'open',
        channel: 'Email',
        requester_name: 'Juan Perez',
        isValid: true,
        isDuplicate: false,
        errors: [],
      },
      {
        rowNumber: 3,
        ticket_number: 'TCK-002',
        client_raw_name: 'Cliente Invalido',
        title: '',
        category: 'Soporte TI',
        priority: 'medium',
        status: 'open',
        channel: 'Email',
        requester_name: 'Maria',
        isValid: false,
        isDuplicate: false,
        errors: ['Falta titulo'],
      },
    ];

    const inputs = convertRowsToCreateTicketInputs(rows, 'fallback-client');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].ticket_number).toBe('TCK-001');
    expect(inputs[0].client_id).toBe('client-123');
    expect(inputs[0].title).toBe('Falla en servidor');
    expect(inputs[0].priority).toBe('critical');
  });
});
