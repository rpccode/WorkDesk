import { describe, it, expect } from 'vitest';
import {
  parseTicketPriority,
  parseTicketStatus,
  parseTicketCategory,
  parseTicketChannel,
  parseTicketDate,
  convertRowsToCreateTicketInputs,
  findHeaderRowIndex,
  type ParsedTicketRow,
} from '../../src/utils/excel-ticket-importer';

describe('Ticket Excel Importer & Parser Utilities', () => {
  it('correctly normalizes ticket priorities', () => {
    expect(parseTicketPriority('Crítica')).toBe('critical');
    expect(parseTicketPriority('Urgente')).toBe('critical');
    expect(parseTicketPriority('P1')).toBe('critical');
    expect(parseTicketPriority('Muy Alta')).toBe('critical');
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
    expect(parseTicketStatus('Terminado')).toBe('closed');
    expect(parseTicketStatus('Asignado')).toBe('in_progress');
    expect(parseTicketStatus('En Ejecución')).toBe('in_progress');
    expect(parseTicketStatus('Detenido')).toBe('waiting_client');
    expect(parseTicketStatus(null)).toBe('open');
  });

  it('correctly normalizes categories and channels', () => {
    expect(parseTicketCategory('Error en servidor')).toBe('Incidencia');
    expect(parseTicketCategory('Nuevo requerimiento')).toBe('Requerimiento');
    expect(parseTicketCategory('Asesoría técnica')).toBe('Consultoría');
    expect(parseTicketCategory('Cobro mensual')).toBe('Facturación');
    expect(parseTicketCategory('Cloud & VPN')).toBe('Infraestructura');
    // System field fallback (Advansys "Sistema" column)
    expect(parseTicketCategory('Soporte', 'Base de Datos SQL')).toBe('Infraestructura');
    expect(parseTicketCategory('Soporte', 'ERP / Permisos')).toBe('Configuración');

    expect(parseTicketChannel('WhatsApp')).toBe('WhatsApp');
    expect(parseTicketChannel('Llamada telefónica')).toBe('Teléfono');
    expect(parseTicketChannel('Portal Helpdesk')).toBe('Portal');
    expect(parseTicketChannel('Sistema')).toBe('Portal');
    expect(parseTicketChannel('Email')).toBe('Email');
    expect(parseTicketChannel('Visita Presencial')).toBe('Reunión');
  });

  it('correctly parses and normalizes diverse date formats', () => {
    expect(parseTicketDate('2026-09-15')).toBe('2026-09-15');
    expect(parseTicketDate('15/09/2026')).toBe('2026-09-15');
    expect(parseTicketDate('15-09-2026')).toBe('2026-09-15');
    // Date with time (Advansys format)
    expect(parseTicketDate('01/09/2026 10:31:48 AM')).toBe('2026-09-01');
    expect(parseTicketDate(undefined)).toBeUndefined();
    expect(parseTicketDate('')).toBeUndefined();
  });

  it('detects the header row index when the file has an Advansys corporate banner', () => {
    const rows = [
      ['Advansys, SRL'],
      ['Calle Onésimo Jiménez No. 10, Los Colegios'],
      ['Santiago de los Caballeros, República Dominicana'],
      ['Teléfonos: + 1(809)226-1875, + 1(809)724-3329'],
      ['Correo: Advansys@claro.net.do, Info@advansys.com.do'],
      [],
      ['Creado: 01/09/2026 10:31:48 AM'],
      [],
      [
        'Identificador', 'Cliente', 'Contacto', 'Contacto Interno', 'Sistema',
        'Empleado', 'Título', 'Descripción', 'Respuesta', 'Prioridad',
        'Valor Prioridad', 'Tipo', 'Medio', 'Razón', 'Estado',
        'Usuario Asignado', 'Usuario Modificación', 'Apertura', 'Cierre',
        'Compromiso', 'Entrega Consultoria', 'Entrega Implementación',
        'Revisión', 'Tiempo Estimado (H)', 'Tiempo Ejecución (H)',
        'Referencia', 'Id Planificación', 'Título Planificacion',
        'Planificacion Inicio', 'Planificacion Final', 'Estado Cotización',
        'Usuario Cierre', 'Punto', 'Estado del Punto', 'Contacto Externo',
        'Ultimo Cambio Estado',
      ],
      ['2026-10492', 'PREFIAUTO', 'Carlos Rodriguez', 'Roberto Pérez', 'Facturación Electrónica', 'Roberto Pérez',
       'Falla en facturación', 'No responde', '', 'Crítica', '1', 'Incidencia', 'Email', 'Falla', 'Abierto'],
    ];

    const idx = findHeaderRowIndex(rows);
    // Row index 8 (0-based) is where the Identificador/Cliente/Título headers are
    expect(idx).toBe(8);
  });

  it('detects the header row index when no banner is present', () => {
    const rows = [
      ['Cliente', 'Título', 'Estado', 'Prioridad'],
      ['PREFIAUTO', 'Falla de sincronización', 'Abierto', 'Crítica'],
    ];

    const idx = findHeaderRowIndex(rows);
    expect(idx).toBe(0);
  });

  it('converts valid parsed rows into CreateTicketInput payloads', () => {
    const rows: ParsedTicketRow[] = [
      {
        rowNumber: 2,
        ticket_number: 'TCK-001',
        client_raw_name: 'PREFIAUTO',
        matched_client_id: 'client-123',
        is_new_client: false,
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
        is_new_client: true,
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
