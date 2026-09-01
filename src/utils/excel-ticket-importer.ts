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
  is_new_client?: boolean;
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
  created_at?: string;
  closed_at?: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export interface TicketImportValidationResult {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  newClientsCount: number;
  detectedHeaderRow: number;
  rows: ParsedTicketRow[];
}

/**
 * Normalizes header string for fuzzy column detection.
 */
function normalizeHeader(header: any): string {
  if (!header) return '';
  return String(header)
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
  if (str.includes('crit') || str.includes('urg') || str === 'p1' || str === '1' || str.includes('muy alta')) return 'critical';
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
  if (str.includes('cerr') || str.includes('close') || str.includes('finaliz') || str.includes('termin')) return 'closed';
  if (str.includes('resuel') || str.includes('resolv') || str.includes('solucion') || str.includes('atendid')) return 'resolved';
  if (str.includes('esper') || str.includes('wait') || str.includes('pendient') || str.includes('paus') || str.includes('detenid')) return 'waiting_client';
  if (str.includes('prog') || str.includes('proc') || str.includes('curs') || str.includes('desarr') || str.includes('ejecuc') || str.includes('asig')) return 'in_progress';
  return 'open';
}

/**
 * Normalizes category strings to TicketCategory.
 */
export function parseTicketCategory(val: any, systemVal?: any): TicketCategory {
  const str = cleanString(val) + ' ' + cleanString(systemVal);
  if (str.includes('incid') || str.includes('error') || str.includes('fall') || str.includes('bug') || str.includes('problema')) return 'Incidencia';
  if (str.includes('requer') || str.includes('solicitud') || str.includes('cambio') || str.includes('desarrollo') || str.includes('mejora')) return 'Requerimiento';
  if (str.includes('consult') || str.includes('asesor') || str.includes('capacit') || str.includes('induccion') || str.includes('reunion')) return 'Consultoría';
  if (str.includes('factur') || str.includes('cobro') || str.includes('pag') || str.includes('cotiz') || str.includes('precio')) return 'Facturación';
  if (str.includes('infr') || str.includes('servid') || str.includes('red') || str.includes('cloud') || str.includes('backup') || str.includes('base de datos') || str.includes('sql')) return 'Infraestructura';
  if (str.includes('config') || str.includes('param') || str.includes('ajust') || str.includes('permiso') || str.includes('rol') || str.includes('usuario')) return 'Configuración';
  return 'Soporte TI';
}

/**
 * Normalizes channel strings to TicketChannel.
 */
export function parseTicketChannel(val: any): TicketChannel {
  if (!val) return 'Email';
  const str = cleanString(val);
  if (str.includes('whats') || str.includes('wsp') || str.includes('chat')) return 'WhatsApp';
  if (str.includes('tel') || str.includes('llamad') || str.includes('phone') || str.includes('voz')) return 'Teléfono';
  if (str.includes('port') || str.includes('web') || str.includes('mesa') || str.includes('helpdesk') || str.includes('sistema')) return 'Portal';
  if (str.includes('reun') || str.includes('meet') || str.includes('presenc') || str.includes('visita')) return 'Reunión';
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
  // Try DD/MM/YYYY or DD-MM-YYYY (with optional time)
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
 * Finds the index of the header row in a 2D sheet array.
 * This handles banner rows at the top (e.g. Advansys SRL header, address, phone numbers, timestamps).
 */
export function findHeaderRowIndex(rows: any[][]): number {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const normalizedCells = row.map((cell) => normalizeHeader(cell));
    
    // Check for Advansys & standard signatures:
    const hasIdentifier = normalizedCells.some((c) => c === 'identificador' || c === 'codigo' || c === 'ticket' || c === 'id' || c === 'foliodeticket');
    const hasClient = normalizedCells.some((c) => c === 'cliente' || c === 'empresa' || c === 'cuenta');
    const hasTitle = normalizedCells.some((c) => c === 'titulo' || c === 'asunto' || c === 'descripcion');
    const hasStatus = normalizedCells.some((c) => c === 'estado' || c === 'status' || c === 'prioridad');

    if (hasIdentifier && (hasClient || hasTitle || hasStatus)) {
      return i;
    }
    if (hasClient && hasTitle) {
      return i;
    }
  }
  return 0; // Default to row 0 if no header pattern matched
}

/**
 * Maps raw object keys/indices to normalized field targets.
 */
function identifyColumnsFromHeaders(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  headers.forEach((h, colIndex) => {
    const norm = normalizeHeader(h);
    if (!norm) return;

    if (norm === 'identificador' || norm.includes('folio') || norm.includes('codigo') || norm === 'id' || norm.includes('nroticket') || norm === 'ticket') {
      if (mapping.ticket_number === undefined) mapping.ticket_number = colIndex;
    } else if (norm === 'cliente' || norm === 'empresa' || norm === 'cuenta' || norm === 'organizacion') {
      if (mapping.client === undefined) mapping.client = colIndex;
    } else if (norm === 'contacto' || norm === 'solicitante' || norm === 'contactoexterno' || norm === 'reportadopor' || norm === 'usuario' || norm === 'persona') {
      if (mapping.requester_name === undefined) mapping.requester_name = colIndex;
    } else if (norm === 'contactointerno') {
      mapping.internal_contact = colIndex;
    } else if (norm === 'titulo' || norm === 'asunto' || norm === 'title' || norm === 'subject' || norm === 'motivo' || norm === 'tema') {
      if (mapping.title === undefined) mapping.title = colIndex;
    } else if (norm === 'descripcion' || norm === 'detalle' || norm === 'observacion' || norm === 'comentario') {
      if (mapping.description === undefined) mapping.description = colIndex;
    } else if (norm === 'respuesta' || norm === 'resolucion' || norm === 'solucion' || norm === 'cierre' || norm === 'notasolucion') {
      if (mapping.resolution === undefined) mapping.resolution = colIndex;
    } else if (norm === 'sistema' || norm === 'modulo') {
      mapping.system = colIndex;
    } else if (norm === 'tipo' || norm === 'categoria' || norm === 'rubro') {
      if (mapping.category === undefined) mapping.category = colIndex;
    } else if (norm === 'medio' || norm === 'canal' || norm === 'origen' || norm === 'via') {
      if (mapping.channel === undefined) mapping.channel = colIndex;
    } else if (norm === 'prioridad' || norm === 'urgencia' || norm === 'severidad') {
      if (mapping.priority === undefined) mapping.priority = colIndex;
    } else if (norm === 'valorprioridad') {
      mapping.priority_value = colIndex;
    } else if (norm === 'estado' || norm === 'status' || norm === 'fase') {
      if (mapping.status === undefined) mapping.status = colIndex;
    } else if (norm === 'usuarioasignado' || norm === 'empleado' || norm === 'asignadoa' || norm === 'responsable' || norm === 'consultor') {
      if (mapping.assigned_to === undefined) mapping.assigned_to = colIndex;
    } else if (norm === 'apertura' || norm === 'creado' || norm === 'fechacreacion') {
      if (mapping.created_at === undefined) mapping.created_at = colIndex;
    } else if (norm === 'cierre' || norm === 'fechacierre') {
      if (mapping.closed_at === undefined) mapping.closed_at = colIndex;
    } else if (norm === 'compromiso' || norm === 'fechalimite' || norm === 'vencimiento' || norm === 'sla' || norm === 'duedate' || norm === 'entregaconsultoria' || norm === 'entregaimplementacion') {
      if (mapping.sla_due_date === undefined) mapping.sla_due_date = colIndex;
    } else if (norm.includes('mail') || norm.includes('correo') || norm.includes('email')) {
      if (mapping.requester_email === undefined) mapping.requester_email = colIndex;
    }
  });

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
  const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!raw2D || raw2D.length === 0) {
    throw new Error('La hoja de cálculo está vacía o no contiene datos.');
  }

  // Detect header row index
  const headerRowIdx = findHeaderRowIndex(raw2D);
  const rawHeaderRow = raw2D[headerRowIdx] || [];
  const stringHeaders = rawHeaderRow.map((c) => String(c || '').trim());
  const columnMap = identifyColumnsFromHeaders(stringHeaders);

  const parsedRows: ParsedTicketRow[] = [];
  const seenNumbers = new Set(existingTickets.map((t) => t.ticket_number?.toLowerCase()).filter(Boolean));
  let newClientsFound = 0;

  // Track new clients discovered in the file to link them consistently
  const localClientMap = new Map<string, { id: string; name: string }>();

  for (let r = headerRowIdx + 1; r < raw2D.length; r++) {
    const row = raw2D[r];
    if (!row || row.length === 0) continue;

    // Check if entire row is empty
    const hasAnyContent = row.some((val) => String(val || '').trim().length > 0);
    if (!hasAnyContent) continue;

    const rowNumber = r + 1;
    const errors: string[] = [];

    // Helper to get cell value
    const getVal = (idx?: number): string => {
      if (idx === undefined || idx < 0 || idx >= row.length) return '';
      return String(row[idx] || '').trim();
    };

    const rawTicketNumber = getVal(columnMap.ticket_number);
    const rawClient = getVal(columnMap.client);
    const rawTitle = getVal(columnMap.title);
    const rawDesc = getVal(columnMap.description);
    const rawResolution = getVal(columnMap.resolution);
    const rawCategory = getVal(columnMap.category);
    const rawSystem = getVal(columnMap.system);
    const rawPriority = getVal(columnMap.priority) || getVal(columnMap.priority_value);
    const rawStatus = getVal(columnMap.status);
    const rawChannel = getVal(columnMap.channel);
    const rawRequesterName = getVal(columnMap.requester_name) || getVal(columnMap.internal_contact);
    const rawRequesterEmail = getVal(columnMap.requester_email);
    const rawAssignedTo = getVal(columnMap.assigned_to);
    const rawSlaDueDate = getVal(columnMap.sla_due_date);
    const rawCreatedAt = getVal(columnMap.created_at);
    const rawClosedAt = getVal(columnMap.closed_at);

    // Validate title or fallback to description/system
    let finalTitle = rawTitle;
    if (!finalTitle) {
      if (rawDesc) {
        finalTitle = rawDesc.length > 60 ? rawDesc.substring(0, 57) + '...' : rawDesc;
      } else if (rawSystem) {
        finalTitle = `Requerimiento / Incidencia - ${rawSystem}`;
      } else {
        errors.push('El título o asunto del ticket es obligatorio.');
        finalTitle = 'Ticket sin asunto';
      }
    }

    // Match or create client
    let matchedClientId: string | undefined;
    let matchedClientName: string | undefined;
    let isNewClient = false;

    const clientSearchKey = (rawClient || 'Cliente General').toLowerCase().trim();

    // 1. Check existing clients in store
    const foundExisting = existingClients.find(
      (c) =>
        c.name.toLowerCase().trim() === clientSearchKey ||
        (c.company && c.company.toLowerCase().trim() === clientSearchKey) ||
        c.name.toLowerCase().includes(clientSearchKey) ||
        (c.company && c.company.toLowerCase().includes(clientSearchKey))
    );

    if (foundExisting) {
      matchedClientId = foundExisting.id;
      matchedClientName = foundExisting.name;
    } else {
      // 2. Check if we already registered a new client id for this name in current import batch
      if (localClientMap.has(clientSearchKey)) {
        const cached = localClientMap.get(clientSearchKey)!;
        matchedClientId = cached.id;
        matchedClientName = cached.name;
        isNewClient = true;
      } else {
        // Auto-assign new client ID
        const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const clientDisplayName = rawClient || 'Cliente General';
        localClientMap.set(clientSearchKey, { id: generatedId, name: clientDisplayName });
        matchedClientId = generatedId;
        matchedClientName = clientDisplayName;
        isNewClient = true;
        newClientsFound++;
      }
    }

    // Check duplicate ticket number
    let isDuplicate = false;
    if (rawTicketNumber && seenNumbers.has(rawTicketNumber.toLowerCase())) {
      isDuplicate = true;
      errors.push(`El identificador "${rawTicketNumber}" ya existe en el sistema.`);
    } else if (rawTicketNumber) {
      seenNumbers.add(rawTicketNumber.toLowerCase());
    }

    const parsedCategory = parseTicketCategory(rawCategory, rawSystem);
    const parsedPriority = parseTicketPriority(rawPriority);
    const parsedStatus = parseTicketStatus(rawStatus);
    const parsedChannel = parseTicketChannel(rawChannel);
    const parsedSla = parseTicketDate(rawSlaDueDate);
    const parsedCreatedAt = parseTicketDate(rawCreatedAt);
    const parsedClosedAt = parseTicketDate(rawClosedAt);

    parsedRows.push({
      rowNumber,
      ticket_number: rawTicketNumber || undefined,
      client_raw_name: rawClient || (matchedClientName || 'Cliente General'),
      matched_client_id: matchedClientId,
      matched_client_name: matchedClientName,
      is_new_client: isNewClient,
      title: finalTitle,
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
      created_at: parsedCreatedAt,
      closed_at: parsedClosedAt,
      isValid: errors.length === 0,
      isDuplicate,
      errors,
    });
  }

  const validCount = parsedRows.filter((r) => r.isValid && !r.isDuplicate).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return {
    totalRows: parsedRows.length,
    validCount,
    duplicateCount,
    invalidCount,
    newClientsCount: newClientsFound,
    detectedHeaderRow: headerRowIdx + 1,
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
 * Extracts distinct new clients that need to be created in the store/database during import.
 */
export function extractNewClientsFromRows(rows: ParsedTicketRow[]): Client[] {
  const newClientsMap = new Map<string, Client>();
  const now = new Date().toISOString();

  rows
    .filter((r) => r.isValid && !r.isDuplicate && r.is_new_client && r.matched_client_id)
    .forEach((r) => {
      const clientId = r.matched_client_id!;
      if (!newClientsMap.has(clientId)) {
        newClientsMap.set(clientId, {
          id: clientId,
          name: r.matched_client_name || r.client_raw_name,
          company: r.client_raw_name,
          email: r.requester_email || null,
          phone: null,
          status: 'active',
          created_at: now,
          updated_at: now,
        });
      }
    });

  return Array.from(newClientsMap.values());
}

/**
 * Generates and downloads a sample Excel template for importing tickets matching Advansys / Corporate structure.
 */
export function generateTicketExcelTemplate(): void {
  const headers = [
    'Identificador',
    'Cliente',
    'Contacto',
    'Contacto Interno',
    'Sistema',
    'Empleado',
    'Título',
    'Descripción',
    'Respuesta',
    'Prioridad',
    'Valor Prioridad',
    'Tipo',
    'Medio',
    'Razón',
    'Estado',
    'Usuario Asignado',
    'Usuario Modificación',
    'Apertura',
    'Cierre',
    'Compromiso',
    'Entrega Consultoria',
    'Entrega Implementación',
    'Revisión',
    'Tiempo Estimado (H)',
    'Tiempo Ejecución (H)',
    'Referencia',
    'Id Planificación',
    'Título Planificacion',
    'Planificacion Inicio',
    'Planificacion Final',
    'Estado Cotización',
    'Usuario Cierre',
    'Punto',
    'Estado del Punto',
    'Contacto Externo',
    'Ultimo Cambio Estado',
  ];

  const sampleRows = [
    [
      '2026-10492',
      'PREFIAUTO',
      'Carlos Rodríguez',
      'Roberto Pérez',
      'Facturación Electrónica',
      'Roberto Pérez',
      'Falla de sincronización en servidor de facturación',
      'El servicio de integración no responde al enviar facturas electrónicas.',
      'Se reinició el pool de conexiones y se actualizó el certificado digital.',
      'Crítica',
      '1',
      'Incidencia',
      'Email',
      'Falla de Servicio',
      'Abierto',
      'Roberto Pérez',
      'Roberto Pérez',
      '01/09/2026 09:15:00 AM',
      '',
      '03/09/2026',
      '03/09/2026',
      '03/09/2026',
      'Pendiente',
      '4.0',
      '2.5',
      'INC-2026-001',
      'PLAN-101',
      'Mantenimiento Mensual',
      '01/09/2026',
      '30/09/2026',
      'Aprobada',
      '',
      'Sede Principal',
      'Activo',
      'crodriguez@prefiauto.cl',
      '01/09/2026 09:30:00 AM',
    ],
    [
      '2026-10493',
      'AGROVISION',
      'Mariana Silva',
      'Roberto Pérez',
      'ERP / Finanzas',
      'Roberto Pérez',
      'Creación de nuevo usuario y configuración de roles',
      'Habilitar acceso al módulo de tesorería para el nuevo jefe de administración.',
      '',
      'Media',
      '3',
      'Requerimiento',
      'Portal',
      'Solicitud de Usuario',
      'En Progreso',
      'Roberto Pérez',
      'Roberto Pérez',
      '01/09/2026 10:00:00 AM',
      '',
      '05/09/2026',
      '05/09/2026',
      '05/09/2026',
      'En Revisión',
      '2.0',
      '1.0',
      'REQ-2026-088',
      'PLAN-101',
      'Soporte Operativo',
      '01/09/2026',
      '30/09/2026',
      'N/A',
      '',
      'Planta Central',
      'Activo',
      'msilva@agrovision.com',
      '01/09/2026 10:15:00 AM',
    ],
    [
      '2026-10494',
      'COOPMEDICA',
      'Dr. Fernando Valenzuela',
      'Roberto Pérez',
      'Infraestructura / BD',
      'Roberto Pérez',
      'Consultoría para migración de base de datos a PostgreSQL',
      'Reunión de levantamiento y diseño de arquitectura de alta disponibilidad.',
      'Documento de arquitectura entregado y validado.',
      'Alta',
      '2',
      'Consultoría',
      'WhatsApp',
      'Proyecto Especial',
      'Resuelto',
      'Roberto Pérez',
      'Roberto Pérez',
      '28/08/2026 08:30:00 AM',
      '31/08/2026 06:00:00 PM',
      '31/08/2026',
      '31/08/2026',
      '31/08/2026',
      'Aprobado',
      '8.0',
      '7.5',
      'CONS-2026-012',
      'PLAN-102',
      'Modernización TI',
      '15/08/2026',
      '31/08/2026',
      'Aprobada',
      'Roberto Pérez',
      'Sede Norte',
      'Cerrado',
      'fvalenzuela@coopmedica.com.do',
      '31/08/2026 06:00:00 PM',
    ],
  ];

  // Build Advansys corporate header banner
  const fullSheetData = [
    ['Advansys, SRL'],
    ['Calle Onésimo Jiménez No. 10, Los Colegios'],
    ['Santiago de los Caballeros, República Dominicana'],
    ['Teléfonos: + 1(809)226-1875, + 1(809)724-3329'],
    ['Correo: Advansys@claro.net.do, Info@advansys.com.do'],
    [],
    [`Creado: ${new Date().toLocaleDateString('es-DO')} 10:31:48 AM`],
    [],
    headers,
    ...sampleRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(fullSheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tickets Advansys');

  XLSX.writeFile(wb, 'workdesk_plantilla_advansys.xlsx');
}
