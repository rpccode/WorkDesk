import * as XLSX from 'xlsx';
import type { Client, ClientStatus } from '../types';

export interface ParsedClientRow {
  rowIndex: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export interface ImportValidationResult {
  rows: ParsedClientRow[];
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

/**
 * Normalizes a header string for fuzzy column detection.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Detects the matching field for a given spreadsheet column header.
 */
function matchColumnField(
  header: string
): 'name' | 'company' | 'email' | 'phone' | 'status' | null {
  const norm = normalizeHeader(header);

  // Email matches (check before general names)
  if (norm.includes('mail') || norm.includes('correo')) {
    return 'email';
  }
  // Phone matches
  if (norm.includes('tel') || norm.includes('phone') || norm.includes('cel') || norm.includes('movil') || norm.includes('whatsapp')) {
    return 'phone';
  }
  // Company matches
  if (norm.includes('empresa') || norm.includes('company') || norm.includes('compania') || norm.includes('firma') || norm.includes('organiza') || norm.includes('instituc')) {
    return 'company';
  }
  // Status matches
  if (norm.includes('estad') || norm.includes('status') || norm.includes('activ')) {
    return 'status';
  }
  // Name matches
  if (norm.includes('nombre') || norm.includes('cliente') || norm.includes('name') || norm.includes('contacto') || norm.includes('titular') || norm.includes('razonsocial')) {
    return 'name';
  }

  return null;
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV (.csv) file into structured client rows.
 */
export async function parseClientSpreadsheet(
  file: File,
  existingClients: Client[] = []
): Promise<ImportValidationResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('El archivo no contiene hojas de cálculo.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawData.length < 2) {
    throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de datos.');
  }

  // Detect column mapping from header row (first row)
  const headerRow = rawData[0];
  const columnMap: { [colIndex: number]: 'name' | 'company' | 'email' | 'phone' | 'status' } = {};

  headerRow.forEach((colHeader: any, index: number) => {
    if (typeof colHeader === 'string' || typeof colHeader === 'number') {
      const field = matchColumnField(String(colHeader));
      if (field) {
        columnMap[index] = field;
      }
    }
  });

  // Build existing clients lookup for duplicate detection
  const existingEmails = new Set(
    existingClients.filter((c) => c.email).map((c) => c.email!.toLowerCase().trim())
  );
  const existingNames = new Set(
    existingClients.map((c) => c.name.toLowerCase().trim())
  );

  const parsedRows: ParsedClientRow[] = [];
  const sessionEmails = new Set<string>();
  const sessionNames = new Set<string>();

  // Process data rows
  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || row.length === 0 || row.every((val) => val === undefined || val === null || val === '')) {
      continue; // Skip empty rows
    }

    const rowData: { name: string; company?: string; email?: string; phone?: string; status: ClientStatus } = {
      name: '',
      company: undefined,
      email: undefined,
      phone: undefined,
      status: 'active',
    };

    row.forEach((cellValue: any, colIndex: number) => {
      const field = columnMap[colIndex];
      if (field && cellValue !== undefined && cellValue !== null) {
        const strVal = String(cellValue).trim();
        if (field === 'status') {
          const lower = strVal.toLowerCase();
          rowData.status = lower.includes('inact') || lower === '0' || lower === 'false' ? 'inactive' : 'active';
        } else {
          rowData[field] = strVal;
        }
      }
    });

    const errors: string[] = [];
    let isValid = true;
    let isDuplicate = false;

    // Validate Name
    if (!rowData.name || rowData.name.trim().length === 0) {
      errors.push('El nombre del cliente es obligatorio');
      isValid = false;
    }

    // Validate Email format if present
    if (rowData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
      errors.push('Formato de correo inválido');
    }

    // Check for Duplicates
    const normName = rowData.name.toLowerCase().trim();
    const normEmail = rowData.email ? rowData.email.toLowerCase().trim() : null;

    if (existingNames.has(normName) || sessionNames.has(normName)) {
      isDuplicate = true;
      errors.push('Posible duplicado (mismo nombre)');
    } else if (normEmail && (existingEmails.has(normEmail) || sessionEmails.has(normEmail))) {
      isDuplicate = true;
      errors.push('Posible duplicado (mismo correo)');
    }

    if (normName) sessionNames.add(normName);
    if (normEmail) sessionEmails.add(normEmail);

    parsedRows.push({
      rowIndex: r + 1,
      name: rowData.name,
      company: rowData.company || undefined,
      email: rowData.email || undefined,
      phone: rowData.phone || undefined,
      status: rowData.status,
      isValid,
      isDuplicate,
      errors,
    });
  }

  const validCount = parsedRows.filter((r) => r.isValid && !r.isDuplicate).length;
  const duplicateCount = parsedRows.filter((r) => r.isValid && r.isDuplicate).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return {
    rows: parsedRows,
    totalRows: parsedRows.length,
    validCount,
    duplicateCount,
    invalidCount,
  };
}

/**
 * Helper to safely trigger file downloads in browser & WebView2 environments.
 */
function triggerDownload(blobOrDataUrl: Blob | string, filename: string): void {
  let url: string;
  let isBlob = false;

  if (typeof blobOrDataUrl === 'string') {
    url = blobOrDataUrl;
  } else {
    url = URL.createObjectURL(blobOrDataUrl);
    isBlob = true;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  
  // Trigger click
  link.click();

  // Keep ObjectURL alive until download manager finishes fetching the buffer
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      if (isBlob) {
        URL.revokeObjectURL(url);
      }
    } catch (_) {
      // Ignore cleanup errors
    }
  }, 3000);
}

/**
 * Generates and downloads a sample Excel template for client import.
 */
export function generateClientTemplateExcel(): void {
  const sampleData = [
    {
      'Nombre del Cliente': 'Ing. Sofía Valenzuela',
      'Empresa': 'Tech Solutions SpA',
      'Correo Electrónico': 'sofia@techsolutions.cl',
      'Teléfono / WhatsApp': '+56 9 8765 4321',
      'Estado': 'Activo',
    },
    {
      'Nombre del Cliente': 'Dr. Matías Morales',
      'Empresa': 'Clínica Austral',
      'Correo Electrónico': 'mmorales@austral.com',
      'Teléfono / WhatsApp': '+56 9 1122 3344',
      'Estado': 'Activo',
    },
    {
      'Nombre del Cliente': 'Catalina Rivas',
      'Empresa': 'Constructora Horizonte',
      'Correo Electrónico': 'crivas@horizonte.cl',
      'Teléfono / WhatsApp': '+56 9 9988 7766',
      'Estado': 'Activo',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Auto-fit column widths
  worksheet['!cols'] = [
    { wch: 28 }, // Nombre
    { wch: 26 }, // Empresa
    { wch: 28 }, // Email
    { wch: 22 }, // Telefono
    { wch: 12 }, // Estado
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
  
  const excelArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, 'plantilla_clientes_workdesk.xlsx');
}

/**
 * Generates and downloads a sample CSV template for client import.
 */
export function generateClientTemplateCsv(): void {
  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel Spanish compatibility
    'Nombre del Cliente;Empresa;Correo Electrónico;Teléfono;Estado\r\n' +
    'Ing. Sofía Valenzuela;Tech Solutions SpA;sofia@techsolutions.cl;+56 9 8765 4321;Activo\r\n' +
    'Dr. Matías Morales;Clínica Austral;mmorales@austral.com;+56 9 1122 3344;Activo\r\n' +
    'Catalina Rivas;Constructora Horizonte;crivas@horizonte.cl;+56 9 9988 7766;Activo\r\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, 'plantilla_clientes_workdesk.csv');
}
