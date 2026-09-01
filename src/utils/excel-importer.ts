import * as XLSX from 'xlsx';
import type { Client, ClientComplexity, ClientStatus } from '../types';

export interface ParsedClientRow {
  rowNumber: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
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
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: ParsedClientRow[];
}

/**
 * Normalizes a header string for fuzzy column detection.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Normalizes complexity strings to 'Alta' | 'Media' | 'Baja'
 */
function parseComplexity(val: any): ClientComplexity | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const str = String(val).toLowerCase().trim();
  if (
    str.includes('alt') ||
    str === 'a' ||
    str === 'high' ||
    str === 'h' ||
    str === '3' ||
    str.includes('crit') ||
    str.includes('mayor') ||
    str.includes('complej')
  ) {
    return 'Alta';
  }
  if (
    str.includes('med') ||
    str === 'm' ||
    str === 'medium' ||
    str === '2' ||
    str.includes('reg') ||
    str.includes('mod') ||
    str.includes('inter') ||
    str.includes('norm')
  ) {
    return 'Media';
  }
  if (
    str.includes('baj') ||
    str === 'b' ||
    str === 'low' ||
    str === 'l' ||
    str === '1' ||
    str.includes('simp') ||
    str.includes('men') ||
    str.includes('bas') ||
    str.includes('lev')
  ) {
    return 'Baja';
  }
  return undefined;
}

/**
 * Normalizes boolean strings to boolean
 */
function parseBoolean(val: any): boolean | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;

  const str = String(val).toLowerCase().trim();
  if (
    str === 'si' ||
    str === 'sí' ||
    str === 's' ||
    str === 'yes' ||
    str === 'y' ||
    str === 'true' ||
    str === 'verdadero' ||
    str === 'v' ||
    str === '1' ||
    str === 'x' ||
    str.includes('posee') ||
    str.includes('cuenta') ||
    str.includes('tiene') ||
    str.includes('existe')
  ) {
    return true;
  }

  if (
    str === 'no' ||
    str === 'n' ||
    str === 'false' ||
    str === 'falso' ||
    str === 'f' ||
    str === '0' ||
    str.includes('no tiene') ||
    str.includes('no posee') ||
    str.includes('carece') ||
    str.includes('sin')
  ) {
    return false;
  }

  return undefined;
}

/**
 * Flexible number parser handling Spanish/Latin-American numbers, thousands separators and units.
 */
function parseFlexibleNumber(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;

  let str = String(val).trim();
  // Remove currency symbols, letters, spaces
  str = str.replace(/[^0-9,.-]/g, '');
  if (!str) return undefined;

  // If there are multiple dots or dots before comma (e.g. 1.500.000 or 1.500,50)
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.split('.').length > 2) {
    str = str.replace(/\./g, '');
  } else if (str.split(',').length > 2) {
    str = str.replace(/,/g, '');
  } else if (str.includes(',')) {
    if (/,\d{3}$/.test(str)) {
      str = str.replace(',', '');
    } else {
      str = str.replace(',', '.');
    }
  } else if (str.includes('.')) {
    if (/\.\d{3}$/.test(str)) {
      str = str.replace('.', '');
    }
  }

  const result = parseFloat(str);
  return isNaN(result) ? undefined : result;
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
  if (!norm) return null;

  // 1. Complexity Weighted
  if (
    norm.includes('ponderad') ||
    norm.includes('cponderada') ||
    norm.includes('complejidadpond') ||
    norm.includes('peso')
  ) {
    return 'complexity_weighted';
  }

  // 2. Complexity Evaluated
  if (
    norm.includes('evaluad') ||
    norm.includes('cevaluada') ||
    norm.includes('complejidadeval') ||
    norm.includes('complejidad') ||
    norm.includes('calificacion') ||
    norm === 'nivel' ||
    norm === 'dificultad'
  ) {
    return 'complexity_evaluated';
  }

  // 3. Ticket Promedio
  if (
    norm.includes('ticket') ||
    norm.includes('monto') ||
    norm.includes('factura') ||
    norm.includes('fee') ||
    norm.includes('honorario') ||
    norm.includes('tarifa') ||
    norm.includes('precio') ||
    norm.includes('costo') ||
    norm.includes('ingreso') ||
    norm.includes('venta') ||
    norm.includes('promedio') ||
    norm.includes('valor')
  ) {
    return 'ticket_avg';
  }

  // 4. Categoría / Rubro / Sector
  if (
    norm.includes('categoria') ||
    norm.includes('rubro') ||
    norm.includes('sector') ||
    norm.includes('industria') ||
    norm.includes('giro') ||
    norm.includes('segmento') ||
    norm.includes('tipo') ||
    norm.includes('clasificacion')
  ) {
    return 'category';
  }

  // 5. Cantidad Sucursales / Sedes
  if (
    norm.includes('sucursal') ||
    norm.includes('sede') ||
    norm.includes('planta') ||
    norm.includes('local') ||
    norm.includes('oficina') ||
    norm.includes('agencia') ||
    norm.includes('tienda') ||
    norm.includes('filial') ||
    norm.includes('establecimiento') ||
    norm.includes('puntoventa')
  ) {
    return 'branches_count';
  }

  // 6. Empleados / Dotación / Personal
  if (
    norm.includes('emplead') ||
    norm.includes('dotacion') ||
    norm.includes('personal') ||
    norm.includes('colaborador') ||
    norm.includes('trabajador') ||
    norm.includes('nomina') ||
    norm.includes('headcount') ||
    norm.includes('plantilla') ||
    norm.includes('persona') ||
    norm.includes('equipo')
  ) {
    return 'employees_count';
  }

  // 7. Cantidad de Sistemas
  if (
    norm.includes('sistema') ||
    norm.includes('software') ||
    norm.includes('aplicacion') ||
    norm.includes('app') ||
    norm.includes('programa') ||
    norm.includes('plataforma') ||
    norm.includes('erp') ||
    norm.includes('crm')
  ) {
    return 'systems_count';
  }

  // 8. Depto TI (Strict targeted match to avoid false positive 'ti' in general words)
  if (
    norm === 'ti' ||
    norm === 'it' ||
    norm === 'deptoti' ||
    norm === 'deptoit' ||
    norm === 'departamentoti' ||
    norm === 'departamentoit' ||
    norm === 'areati' ||
    norm === 'areait' ||
    norm === 'equipoti' ||
    norm === 'equipoit' ||
    norm.includes('deptoti') ||
    norm.includes('deptoit') ||
    norm.includes('departamentoti') ||
    norm.includes('departamentodeit') ||
    norm.includes('departamentodeti') ||
    norm.includes('sistemasdepto') ||
    norm.includes('personalti') ||
    norm.includes('personalit') ||
    norm.includes('tiinterno') ||
    norm.includes('itinterno') ||
    norm.includes('informati')
  ) {
    return 'has_it_department';
  }

  // 9. Email matches
  if (norm.includes('mail') || norm.includes('correo') || norm.includes('email')) {
    return 'email';
  }

  // 10. Phone matches
  if (
    norm.includes('tel') ||
    norm.includes('phone') ||
    norm.includes('cel') ||
    norm.includes('movil') ||
    norm.includes('whatsapp') ||
    (norm.includes('contacto') && (norm.includes('tel') || norm.includes('cel')))
  ) {
    return 'phone';
  }

  // 11. Company matches
  if (
    norm.includes('empresa') ||
    norm.includes('company') ||
    norm.includes('compania') ||
    norm.includes('firma') ||
    norm.includes('organizacion') ||
    norm.includes('institucion') ||
    norm.includes('corporacion')
  ) {
    return 'company';
  }

  // 12. Status matches
  if (norm.includes('estad') || norm.includes('status') || norm.includes('activ') || norm.includes('vigente')) {
    return 'status';
  }

  // 13. Name matches (Cliente, Contacto, Titular, Razon Social, Rudy Header column)
  if (
    norm.includes('nombre') ||
    norm.includes('cliente') ||
    norm.includes('name') ||
    norm.includes('contacto') ||
    norm.includes('titular') ||
    norm.includes('razonsocial') ||
    norm.includes('cuenta') ||
    norm === 'rudy'
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

  // Scan the first 10 rows to detect the true header row
  let bestHeaderRowIndex = 0;
  let maxMatchedFields = 0;
  let columnMap: { [colIndex: number]: string } = {};

  const maxScanRows = Math.min(10, rawData.length);
  for (let r = 0; r < maxScanRows; r++) {
    const candidateRow = rawData[r];
    if (!candidateRow || !Array.isArray(candidateRow)) continue;

    const tempMap: { [colIndex: number]: string } = {};
    let matchesCount = 0;

    candidateRow.forEach((colHeader: any, index: number) => {
      if (colHeader !== undefined && colHeader !== null && String(colHeader).trim().length > 0) {
        const field = matchColumnField(String(colHeader));
        if (field) {
          tempMap[index] = field;
          matchesCount++;
        }
      }
    });

    if (matchesCount > maxMatchedFields) {
      maxMatchedFields = matchesCount;
      bestHeaderRowIndex = r;
      columnMap = tempMap;
    }
  }

  // Positional fallback if standard headers couldn't be detected (e.g. 9 standard columns)
  if (maxMatchedFields <= 1 && rawData[bestHeaderRowIndex] && rawData[bestHeaderRowIndex].length >= 5) {
    const fallbackCols: string[] = [
      'name',
      'complexity_weighted',
      'complexity_evaluated',
      'ticket_avg',
      'category',
      'branches_count',
      'employees_count',
      'systems_count',
      'has_it_department',
    ];
    fallbackCols.forEach((f, idx) => {
      if (!columnMap[idx]) {
        columnMap[idx] = f;
      }
    });
  }

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

  // Process data rows starting after the detected header row
  for (let r = bestHeaderRowIndex + 1; r < rawData.length; r++) {
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
          rowData[field] = parseFlexibleNumber(cellValue);
        } else {
          rowData[field] = strVal || undefined;
        }
      }
    });

    const errors: string[] = [];
    let isValid = true;
    let isDuplicate = false;

    // Check if this row is a trailing summary/total row (e.g. Rudy's spreadsheet footer)
    const rawName = String(rowData.name || '').trim();
    const isSummaryRow =
      (r === rawData.length - 1 || r === rawData.length - 2) &&
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
      rowNumber: r + 1,
      name: rawName,
      company: rowData.company,
      email: rowData.email,
      phone: rowData.phone,
      status: rowData.status,
      category: rowData.category,
      complexity_weighted: rowData.complexity_weighted,
      complexity_evaluated: rowData.complexity_evaluated,
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
    totalRows: parsedRows.length,
    validCount,
    duplicateCount,
    invalidCount,
    rows: parsedRows,
  };
}

/**
 * Full reference enterprise client matrix sample
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
    'Cliente': 'FUNDAPEC',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 20,
    'Categoría': 'Educativo',
    'Cantidad Sucursales': 1,
    'Empleados': 300,
    'Cantidad de sistemas': 3,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'AGRO-VETERINARIA LA HERRADURA',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 9,
    'Categoría': 'Comercial',
    'Cantidad Sucursales': 1,
    'Empleados': 25,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'CAMARA DE COMERCIO (SANTIAGO)',
    'Complejidad Ponderada': 'Media',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 2,
    'Categoría': 'Comercial',
    'Cantidad Sucursales': 1,
    'Empleados': 20,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'COLEGIO DA VINCI',
    'Complejidad Ponderada': 'Media',
    'Complejidad Evaluada': 'Alta',
    'Ticket Promedio': 6,
    'Categoría': 'Educativo',
    'Cantidad Sucursales': 1,
    'Empleados': 50,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'COOP DENOR',
    'Complejidad Ponderada': 'Media',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 2,
    'Categoría': 'Cooperativa',
    'Cantidad Sucursales': 1,
    'Empleados': 10,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'COOP REALTY',
    'Complejidad Ponderada': 'Media',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 2,
    'Categoría': 'Cooperativa',
    'Cantidad Sucursales': 1,
    'Empleados': 10,
    'Cantidad de sistemas': 1,
    'Depto. TI': 'No',
  },
  {
    'Cliente': 'COOP SAN JOSE',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 10,
    'Categoría': 'Cooperativa',
    'Cantidad Sucursales': 18,
    'Empleados': 300,
    'Cantidad de sistemas': 5,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'COOP SAN RAFAEL',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 11,
    'Categoría': 'Cooperativa',
    'Cantidad Sucursales': 7,
    'Empleados': 150,
    'Cantidad de sistemas': 5,
    'Depto. TI': 'Si',
  },
  {
    'Cliente': 'COOP VALVERDE',
    'Complejidad Ponderada': 'Alta',
    'Complejidad Evaluada': 'Media',
    'Ticket Promedio': 11,
    'Categoría': 'Cooperativa',
    'Cantidad Sucursales': 6,
    'Empleados': 100,
    'Cantidad de sistemas': 5,
    'Depto. TI': 'Si',
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
    { wch: 16 }, // Empleados
    { wch: 22 }, // Cantidad de sistemas
    { wch: 14 }, // Depto. TI
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Matriz Clientes');
  XLSX.writeFile(workbook, 'Plantilla_Matriz_Clientes_WorkDesk.xlsx');
}

/**
 * Generates and downloads a basic CSV template for client import.
 */
export function generateClientTemplateCsv(): void {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_CLIENTS_MATRIX);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Plantilla_Matriz_Clientes_WorkDesk.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
