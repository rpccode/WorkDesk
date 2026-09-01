import * as XLSX from 'xlsx';
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketChannel,
  Client,
  CreateTicketInput,
} from '../types';

export interface ParsedTicketRow {
  rowNumber: number;
  ticket_number?: string;
  client_raw_name: string;
  matched_client_id?: string;
  matched_client_name?: string;
  title: string;
  description?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  channel: TicketChannel;
  requester_name: string;
  requester_email?: string;
  assigned_to?: string;
  resolution?: string;
  sla_due_date?: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export interface TicketImportValidationResult {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: ParsedTicketRow[];
}

/**
 * Normalizes header string for fuzzy column detection.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function cleanString(val: any): string {
  if (!val) return '';
  return String(val)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Normalizes priority strings to 'critical' | 'high' | 'medium' | 'low'.
 */
export function parseTicketPriority(val: any): TicketPriority {
  if (!val) return 'medium';
  const str = cleanString(val);
  if (str.includes('crit') || str.includes('urg') || str === 'p1' || str === '1') return 'critical';
  if (str.includes('alt') || str.includes('high') || str === 'p2' || str === '2') return 'high';
  if (str.includes('baj') || str.includes('low') || str === 'p4' || str === '4') return 'low';
  return 'medium';
}

/**
 * Normalizes status strings to 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed'.
 */
export function parseTicketStatus(val: any): TicketStatus {
  if (!val) return 'open';
  const str = cleanString(val);
  if (str.includes('cerr') || str.includes('close') || str.includes('finaliz')) return 'closed';
  if (str.includes('resuel') || str.includes('resolv') || str.includes('solucion')) return 'resolved';
  if (str.includes('esper') || str.includes('wait') || str.includes('pendient')) return 'waiting_client';
  if (str.includes('prog') || str.includes('proc') || str.includes('curs') || str.includes('desarr')) return 'in_progress';
  return 'open';
}

/**
 * Normalizes category strings to TicketCategory.
 */
export function parseTicketCategory(val: any): TicketCategory {
  if (!val) return 'Soporte TI';
  const str = cleanString(val);
  if (str.includes('incid') || str.includes('error') || str.includes('fall') || str.includes('bug')) return 'Incidencia';
  if (str.includes('requer') || str.includes('solicitud') || str.includes('cambio')) return 'Requerimiento';
  if (str.includes('consult') || str.includes('asesor') || str.includes('capacit')) return 'Consultoría';
  if (str.includes('factur') || str.includes('cobro') || str.includes('pag')) return 'Facturación';
  if (str.includes('infr') || str.includes('servid') || str.includes('red') || str.includes('cloud')) return 'Infraestructura';
  if (str.includes('config') || str.includes('param') || str.includes('ajust')) return 'Configuración';
  return 'Soporte TI';
}

/**
 * Normalizes channel strings to TicketChannel.
 */
export function parseTicketChannel(val: any): TicketChannel {
  if (!val) return 'Email';
  const str = cleanString(val);
  if (str.includes('whats') || str.includes('wsp') || str.includes('chat')) return 'WhatsApp';
  if (str.includes('tel') || str.includes('llamad') || str.includes('phone')) return 'Teléfono';
  if (str.includes('port') || str.includes('web') || str.includes('mesa') || str.includes('helpdesk')) return 'Portal';
  if (str.includes('reun') || str.includes('meet') || str.includes('presenc')) return 'Reunión';
  if (str.includes('mail') || str.includes('corr')) return 'Email';
  return 'Email';
}

/**
 * Parses and formats dates to YYYY-MM-DD.
 */
export function parseTicketDate(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (!str) return undefined;

  // Try parsing ISO or YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return undefined;
}

/**
 * Maps raw object keys to normalized field targets.
 */
function identifyColumns(sampleRow: Record<string, any>): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const rawKey of Object.keys(sampleRow)) {
    const norm = normalizeHeader(rawKey);

    if (norm.includes('ticket') || norm.includes('folio') || norm.includes('codigo') || norm === 'id' || norm.includes('nroticket')) {
      mapping.ticket_number = rawKey;
    } else if (norm.includes('client') || norm.includes('empresa') || norm.includes('cuenta') || norm.includes('organizacion')) {
      mapping.client = rawKey;
    } else if (norm.includes('titul') || norm.includes('asunt') || norm.includes('title') || norm.includes('subject') || norm.includes('motivo') || norm.includes('tema')) {
      mapping.title = rawKey;
    } else if (norm.includes('descrip') || norm.includes('detall') || norm.includes('observac') || norm.includes('coment')) {
      mapping.description = rawKey;
    } else if (norm.includes('categ') || norm.includes('tipo') || norm.includes('rubro')) {
      mapping.category = rawKey;
    } else if (norm.includes('priorid') || norm.includes('priority') || norm.includes('urgenc') || norm.includes('severid')) {
      mapping.priority = rawKey;
    } else if (norm.includes('estad') || norm.includes('status') || norm.includes('fase')) {
      mapping.status = rawKey;
    } else if (norm.includes('canal') || norm.includes('channel') || norm.includes('medio') || norm.includes('origen')) {
      mapping.channel = rawKey;
    } else if (norm.includes('solicit') || norm.includes('requester') || norm.includes('contacto') || norm.includes('reportad') || norm.includes('usuario') || norm.includes('persona')) {
      mapping.requester_name = rawKey;
    } else if (norm.includes('mail') || norm.includes('correo') || norm.includes('email')) {
      mapping.requester_email = rawKey;
    } else if (norm.includes('asig') || norm.includes('respons') || norm.includes('tecnic') || norm.includes('consult')) {
      mapping.assigned_to = rawKey;
    } else if (norm.includes('resol') || norm.includes('soluc') || norm.includes('cierre')) {
      mapping.resolution = rawKey;
    } else if (norm.includes('sla') || norm.includes('vencim') || norm.includes('limite') || norm.includes('duedate')) {
      mapping.sla_due_date = rawKey;
    }
  }
  return mapping;
}

/**
 * Parses an Excel / CSV file buffer and validates parsed ticket rows against existing clients and tickets.
 */
export async function parseTicketExcelFile(
  file: File,
  existingClients: Client[],
  existingTickets: Ticket[] = []
): Promise<TicketImportValidationResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('El archivo Excel no contiene hojas de cálculo válidas.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('La hoja de cálculo está vacía o no contiene filas de datos.');
  }

  const columnMap = identifyColumns(rawRows[0]);
  const parsedRows: ParsedTicketRow[] = [];
  const seenNumbers = new Set(existingTickets.map((t) => t.ticket_number?.toLowerCase()).filter(Boolean));

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // header is row 1
    const errors: string[] = [];

    // Extract fields
    const rawTicketNumber = columnMap.ticket_number ? String(row[columnMap.ticket_number] || '').trim() : '';
    const rawClient = columnMap.client ? String(row[columnMap.client] || '').trim() : '';
    const rawTitle = columnMap.title ? String(row[columnMap.title] || '').trim() : '';
    const rawDesc = columnMap.description ? String(row[columnMap.description] || '').trim() : '';
    const rawCategory = columnMap.category ? row[columnMap.category] : '';
    const rawPriority = columnMap.priority ? row[columnMap.priority] : '';
    const rawStatus = columnMap.status ? row[columnMap.status] : '';
    const rawChannel = columnMap.channel ? row[columnMap.channel] : '';
    const rawRequesterName = columnMap.requester_name ? String(row[columnMap.requester_name] || '').trim() : '';
    const rawRequesterEmail = columnMap.requester_email ? String(row[columnMap.requester_email] || '').trim() : '';
    const rawAssignedTo = columnMap.assigned_to ? String(row[columnMap.assigned_to] || '').trim() : '';
    const rawResolution = columnMap.resolution ? String(row[columnMap.resolution] || '').trim() : '';
    const rawSlaDueDate = columnMap.sla_due_date ? row[columnMap.sla_due_date] : '';

    // Validate title
    if (!rawTitle) {
      errors.push('El título o asunto del ticket es obligatorio.');
    }

    // Validate client & fuzzy match
    let matchedClient: Client | undefined;
    if (!rawClient) {
      if (existingClients.length > 0) {
        matchedClient = existingClients[0]; // fallback to first client if none specified
      } else {
        errors.push('No se especificó un cliente y no existen clientes en el sistema.');
      }
    } else {
      const normClientSearch = rawClient.toLowerCase();
      matchedClient = existingClients.find(
        (c) =>
          c.name.toLowerCase() === normClientSearch ||
          (c.company && c.company.toLowerCase() === normClientSearch) ||
          c.name.toLowerCase().includes(normClientSearch) ||
          (c.company && c.company.toLowerCase().includes(normClientSearch))
      );
    }

    // Check duplicate ticket number
    let isDuplicate = false;
    if (rawTicketNumber && seenNumbers.has(rawTicketNumber.toLowerCase())) {
      isDuplicate = true;
      errors.push(`El número de ticket "${rawTicketNumber}" ya existe en el sistema.`);
    } else if (rawTicketNumber) {
      seenNumbers.add(rawTicketNumber.toLowerCase());
    }

    const parsedCategory = parseTicketCategory(rawCategory);
    const parsedPriority = parseTicketPriority(rawPriority);
    const parsedStatus = parseTicketStatus(rawStatus);
    const parsedChannel = parseTicketChannel(rawChannel);
    const parsedSla = parseTicketDate(rawSlaDueDate);

    parsedRows.push({
      rowNumber,
      ticket_number: rawTicketNumber || undefined,
      client_raw_name: rawClient || (matchedClient ? matchedClient.name : 'Cliente General'),
      matched_client_id: matchedClient ? matchedClient.id : undefined,
      matched_client_name: matchedClient ? matchedClient.name : undefined,
      title: rawTitle || 'Ticket sin asunto',
      description: rawDesc || undefined,
      category: parsedCategory,
      priority: parsedPriority,
      status: parsedStatus,
      channel: parsedChannel,
      requester_name: rawRequesterName || 'Contacto del Cliente',
      requester_email: rawRequesterEmail || undefined,
      assigned_to: rawAssignedTo || undefined,
      resolution: rawResolution || undefined,
      sla_due_date: parsedSla,
      isValid: errors.length === 0,
      isDuplicate,
      errors,
    });
  });

  const validCount = parsedRows.filter((r) => r.isValid && !r.isDuplicate).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return {
    totalRows: parsedRows.length,
    validCount,
    duplicateCount,
    invalidCount,
    rows: parsedRows,
  };
}

/**
 * Converts parsed valid rows into CreateTicketInput payload array.
 */
export function convertRowsToCreateTicketInputs(
  rows: ParsedTicketRow[],
  fallbackClientId: string
): CreateTicketInput[] {
  return rows
    .filter((r) => r.isValid && !r.isDuplicate)
    .map((r) => ({
      ticket_number: r.ticket_number || undefined,
      client_id: r.matched_client_id || fallbackClientId,
      title: r.title,
      description: r.description,
      category: r.category,
      priority: r.priority,
      status: r.status,
      channel: r.channel,
      requester_name: r.requester_name,
      requester_email: r.requester_email,
      assigned_to: r.assigned_to,
      resolution: r.resolution,
      sla_due_date: r.sla_due_date,
    }));
}

/**
 * Generates and downloads a sample Excel template for importing tickets.
 */
export function generateTicketExcelTemplate(): void {
  const sampleData = [
    {
      'Código Ticket': 'TCK-101',
      'Cliente / Empresa': 'PREFIAUTO',
      'Título / Asunto': 'Falla de sincronización en servidor de facturación',
      'Detalle del Requerimiento': 'El servicio de integración no responde al enviar facturas electrónicas.',
      'Categoría': 'Incidencia',
      'Prioridad': 'Crítica',
      'Estado': 'Abierto',
      'Canal': 'Email',
      'Solicitante': 'Carlos Rodríguez',
      'Email Solicitante': 'carlos.rodriguez@prefiauto.cl',
      'Consultor Asignado': 'Roberto Pérez',
      'Fecha Límite SLA': '2026-09-05',
    },
    {
      'Código Ticket': 'TCK-102',
      'Cliente / Empresa': 'AGROVISION',
      'Título / Asunto': 'Creación de nuevo usuario y configuración de roles',
      'Detalle del Requerimiento': 'Habilitar acceso al módulo de tesorería para el nuevo jefe de administración.',
      'Categoría': 'Requerimiento',
      'Prioridad': 'Media',
      'Estado': 'En Progreso',
      'Canal': 'Portal',
      'Solicitante': 'Mariana Silva',
      'Email Solicitante': 'mariana.silva@agrovision.com',
      'Consultor Asignado': 'Roberto Pérez',
      'Fecha Límite SLA': '2026-09-10',
    },
    {
      'Código Ticket': 'TCK-103',
      'Cliente / Empresa': 'LOGISUR',
      'Título / Asunto': 'Consultoría para migración de base de datos a PostgreSQL',
      'Detalle del Requerimiento': 'Reunión de levantamiento y diseño de arquitectura de alta disponibilidad.',
      'Categoría': 'Consultoría',
      'Prioridad': 'Alta',
      'Estado': 'Abierto',
      'Canal': 'WhatsApp',
      'Solicitante': 'Rodrigo Valenzuela',
      'Email Solicitante': 'rvalenzuela@logisur.cl',
      'Consultor Asignado': 'Roberto Pérez',
      'Fecha Límite SLA': '2026-09-12',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Tickets');

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Código
    { wch: 22 }, // Cliente
    { wch: 38 }, // Título
    { wch: 45 }, // Detalle
    { wch: 16 }, // Categoría
    { wch: 12 }, // Prioridad
    { wch: 14 }, // Estado
    { wch: 12 }, // Canal
    { wch: 20 }, // Solicitante
    { wch: 28 }, // Email
    { wch: 20 }, // Asignado
    { wch: 16 }, // SLA
  ];

  XLSX.writeFile(wb, 'workdesk_plantilla_tickets.xlsx');
}
