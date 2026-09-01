import * as XLSX from 'xlsx';
import type { Client, ClientStatus, ClientComplexity } from '../types';

export interface ParsedClientRow {
  rowIndex: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: ClientStatus;

  // Corporate Profile & Complexity Matrix fields
  category?: string;
  complexity_weighted?: ClientComplexity;
  complexity_evaluated?: ClientComplexity;
  ticket_avg?: number;
  branches_count?: number;
  employees_count?: number;
  systems_count?: number;
  has_it_department?: boolean;

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
 * Normalizes complexity strings to 'Alta' | 'Media' | 'Baja'
 */
function parseComplexity(val: any): ClientComplexity | undefined {
  if (!val) return undefined;
  const str = String(val).toLowerCase().trim();
  if (str.includes('alt') || str === 'high' || str === '3') return 'Alta';
  if (str.includes('med') || str === 'medium' || str === '2') return 'Media';
  if (str.includes('baj') || str === 'low' || str === '1') return 'Baja';
  return undefined;
}

/**
 * Normalizes boolean strings to boolean
 */
function parseBoolean(val: any): boolean | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const str = String(val).toLowerCase().trim();
  if (str === 'si' || str === 'sí' || str === 'yes' || str === 'true' || str === '1') return true;
  if (str === 'no' || str === 'false' || str === '0') return false;
  return undefined;
}

/**
 * Detects the matching field for a given spreadsheet column header.
 */
function matchColumnField(
  header: string
):
  | 'name'
  | 'company'
  | 'email'
  | 'phone'
  | 'status'
  | 'category'
  | 'complexity_weighted'
  | 'complexity_evaluated'
  | 'ticket_avg'
  | 'branches_count'
  | 'employees_count'
  | 'systems_count'
  | 'has_it_department'
  | null {
  const norm = normalizeHeader(header);

  // Complexity Ponderada / Evaluada
  if (norm.includes('ponderad')) {
    return 'complexity_weighted';
  }
  if (norm.includes('evaluad')) {
    return 'complexity_evaluated';
  }
  if (norm.includes('complejidad')) {
    return 'complexity_evaluated';
  }

  // Ticket Promedio
  if (norm.includes('ticket') || norm.includes('ticketpromedio') || norm.includes('promedioticket')) {
    return 'ticket_avg';
  }

  // Categoría / Rubro / Sector
  if (norm.includes('categoria') || norm.includes('rubro') || norm.includes('sector')) {
    return 'category';
  }

  // Cantidad Sucursales
  if (norm.includes('sucursal') || norm.includes('sucursales') || norm.includes('sedes') || norm.includes('plantas')) {
    return 'branches_count';
  }

  // Empleados / Dotación / Personal
  if (norm.includes('empleado') || norm.includes('empleados') || norm.includes('dotacion') || norm.includes('personal') || norm.includes('colaborador')) {
    return 'employees_count';
  }

  // Cantidad de Sistemas
  if (norm.includes('sistema') || norm.includes('sistemas') || norm.includes('softwares') || norm.includes('aplicaciones')) {
    return 'systems_count';
  }

  // Depto TI
  if (norm.includes('deptoti') || norm.includes('departamentoti') || norm.includes('ti') || norm.includes('it') || norm.includes('sistemasdepto')) {
    return 'has_it_department';
  }

  // Email matches
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
  // Name matches (Cliente, Contacto, Titular, Razon Social, Rudy Header column)
  if (
    norm.includes('nombre') ||
    norm.includes('cliente') ||
    norm.includes('name') ||
    norm.includes('contacto') ||
    norm.includes('titular') ||
    norm.includes('razonsocial') ||
    norm === 'rudy' ||
    norm === 'cuenta'
  ) {
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
  const columnMap: { [colIndex: number]: string } = {};

  headerRow.forEach((colHeader: any, index: number) => {
    if (colHeader !== undefined && colHeader !== null && String(colHeader).trim().length > 0) {
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
    if (!row || row.length === 0 || row.every((val) => val === undefined || val === null || String(val).trim() === '')) {
      continue; // Skip empty rows
    }

    const rowData: Record<string, any> = {
      name: '',
      company: undefined,
      email: undefined,
      phone: undefined,
      status: 'active',
      category: undefined,
      complexity_weighted: undefined,
      complexity_evaluated: undefined,
      ticket_avg: undefined,
      branches_count: undefined,
      employees_count: undefined,
      systems_count: undefined,
      has_it_department: undefined,
    };

    row.forEach((cellValue: any, colIndex: number) => {
      const field = columnMap[colIndex];
      if (field && cellValue !== undefined && cellValue !== null) {
        const strVal = String(cellValue).trim();
        if (field === 'status') {
          const lower = strVal.toLowerCase();
          rowData.status = lower.includes('inact') || lower === '0' || lower === 'false' ? 'inactive' : 'active';
        } else if (field === 'complexity_weighted' || field === 'complexity_evaluated') {
          rowData[field] = parseComplexity(strVal);
        } else if (field === 'has_it_department') {
          rowData[field] = parseBoolean(strVal);
        } else if (['ticket_avg', 'branches_count', 'employees_count', 'systems_count'].includes(field)) {
          const num = Number(strVal.replace(/[^0-9.-]+/g, ''));
          rowData[field] = isNaN(num) ? undefined : num;
        } else {
          rowData[field] = strVal;
        }
      }
    });

    const errors: string[] = [];
    let isValid = true;
    let isDuplicate = false;

    // Check if this row is a trailing summary/total row (e.g. Rudy's spreadsheet footer)
    const rawName = String(rowData.name || '').trim();
    const isSummaryRow =
      r === rawData.length - 1 &&
      !rowData.email &&
      !rowData.phone &&
      (!rawName || /^\d+$/.test(rawName) || rawName.toLowerCase().includes('total') || rawName.toLowerCase().includes('clientes'));

    if (isSummaryRow && !rowData.company) {
      continue;
    }

    // Validate Name
    if (!rawName || /^\d+$/.test(rawName) || rawName.toLowerCase().includes('clientes complejos')) {
      errors.push('El nombre del cliente es obligatorio');
      isValid = false;
    }

    // Validate Email format if present
    if (rowData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
      errors.push('Formato de correo inválido');
    }

    // Check for Duplicates
    const normName = rawName.toLowerCase();
    const normEmail = rowData.email ? rowData.email.toLowerCase().trim() : null;

    if (normName) {
      if (existingNames.has(normName) || sessionNames.has(normName)) {
        isDuplicate = true;
        errors.push('Posible duplicado (mismo nombre)');
      }
      sessionNames.add(normName);
    }
    if (normEmail) {
      if (existingEmails.has(normEmail) || sessionEmails.has(normEmail)) {
        isDuplicate = true;
        errors.push('Posible duplicado (mismo correo)');
      }
      sessionEmails.add(normEmail);
    }

    parsedRows.push({
      rowIndex: r + 1,
      name: rawName,
      company: rowData.company || undefined,
      email: rowData.email || undefined,
      phone: rowData.phone || undefined,
      status: rowData.status,
      category: rowData.category || undefined,
      complexity_weighted: rowData.complexity_weighted || undefined,
      complexity_evaluated: rowData.complexity_evaluated || undefined,
      ticket_avg: rowData.ticket_avg,
      branches_count: rowData.branches_count,
      employees_count: rowData.employees_count,
      systems_count: rowData.systems_count,
      has_it_department: rowData.has_it_department,
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
 * Sample dataset containing the 17 clients from the consultant matrix.
 */
export const SAMPLE_CLIENTS_MATRIX = [
  {
    'Cliente': 'PREFIAUTO',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 9,
    'Categoría': 'Financiera',
    'Cantidad Sucursales': 5,
    'Empleados': 100,
    'Cantidad de sistemas': 2,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'OCHOA HERMANOS',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 16,
    'Categoría': 'Financiera/Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 100,
    'Cantidad de sistemas': 4,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'G5 (GRUPO JCM)',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 1,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 20,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'CAMARA DE COMERCIO (SANTIAGO)',
    'Complejidad Ponderada': 'Media',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 3,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 10,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'COOP DENOR',
    'Complejidad Ponderada': 'Media',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 4,
    'Categoría': 'Cooperativa',
    'Cantidad Sucursales': 2,
    'Empleados': 50,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'FUNDAPEC',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 20,
    'Categoría': 'Educativo',
    'Cantidad Sucursales': 3,
    'Empleados': 300,
    'Cantidad de sistemas': 3,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'OCHOA FINAUTO',
    'Complejidad Ponderada': 'Media',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 3,
    'Categoría': 'Financiera',
    'Cantidad Sucursales': 1,
    'Empleados': 15,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'COOP REALTY',
    'Complejidad Ponderada': 'Media',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 1,
    'Categoría': 'Cooperativa',
    'Cantidad Sucursales': 1,
    'Empleados': 30,
    'Cantidad de sistemas': 2,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'JCM Agrícola',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 11,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 80,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'DIAS S.A.',
    'Complejidad Ponderada': 'Media',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 4,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 10,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'COLEGIO DA VINCI',
    'Complejidad Ponderada': 'Baja',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 2,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 5,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'BECG Comunicaciones (Inversiones Emma Collado)',
    'Complejidad Ponderada': 'Baja',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 3,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 5,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'COOP. DEMON',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 6,
    'Categoría': 'Cooperativa',
    'Cantidad Sucursales': 1,
    'Empleados': 30,
    'Cantidad de sistemas': 2,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'TROQUEDOM',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Baja',
    'Ticket Promedio': 4,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 10,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'AGROVISION',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Baja',
    'Ticket Promedio': 1,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 20,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'PRO-SEMILLAS',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Baja',
    'Ticket Promedio': 1,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 20,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'HACIENDA OCHOA',
    'Complejidad Ponderada': 'Baja',
    'Complejidad Evaluada': 'Baja',
    'Ticket Promedio': 1,
    'Categoría': 'Administrativo',
    'Cantidad Sucursales': 1,
    'Empleados': 5,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'Si',
  },
];

/**
 * Generates and downloads the full sample Excel template for client import.
 */
export function generateClientTemplateExcel(): void {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_CLIENTS_MATRIX);
  // Auto-fit column widths
  worksheet['!cols'] = [
    { wch: 36 }, // Cliente
    { wch: 22 }, // Complejidad Ponderada
    { wch: 22 }, // Complejidad Evaluada
    { wch: 16 }, // Ticket Promedio
    { wch: 26 }, // Categoría
    { wch: 20 }, // Cantidad Sucursales
    { wch: 14 }, // Empleados
    { wch: 22 }, // Cantidad de sistemas
    { wch: 12 }, // Depto. TI
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Matriz Clientes');
  
  const excelArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, 'plantilla_matriz_clientes_workdesk.xlsx');
}

/**
 * Generates and downloads a sample CSV template for client import.
 */
export function generateClientTemplateCsv(): void {
  const headers = 'Cliente;Complejidad Ponderada;Complejidad Evaluada;Ticket Promedio;Categoría;Cantidad Sucursales;Empleados;Cantidad de sistemas;Depto. TI\r\n';
  const lines = SAMPLE_CLIENTS_MATRIX.map(
    (c) =>
      `"${c.Cliente}";"${c['Complejidad Ponderada']}";"${c['Complejidad Evaluada']}";${c['Ticket Promedio']};"${c.Categoría}";${c['Cantidad Sucursales']};${c.Empleados};${c['Cantidad de sistemas']};"${c['Depto. TI']}"`
  ).join('\r\n');

  const csvContent = '\uFEFF' + headers + lines;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, 'plantilla_matriz_clientes_workdesk.csv');
}
