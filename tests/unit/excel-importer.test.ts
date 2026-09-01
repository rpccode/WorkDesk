import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseClientSpreadsheet } from '../../src/utils/excel-importer';
import type { Client } from '../../src/types';

describe('Excel & CSV Client Importer', () => {
  it('parses Excel workbook and automatically maps columns and detects duplicates', async () => {
    const data = [
      ['Nombre del Contacto', 'Empresa / Firma', 'Correo', 'Teléfono / Móvil', 'Estado'],
      ['Rodrigo Valenzuela', 'Tech Corp', 'rodrigo@tech.com', '+56912345678', 'Activo'],
      ['Beatriz Soto', 'Finanzas Global', 'beatriz@finanzas.com', '+56987654321', 'Activo'],
      ['Rodrigo Valenzuela', 'Otra Empresa', 'rodrigo2@tech.com', '+56911112222', 'Activo'], // Duplicate name
      ['', 'Empresa Fantasma', 'sin-nombre@test.com', '+56900000000', 'Inactivo'], // Invalid (missing name)
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const u8 = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    const file = new File([u8], 'test_clients.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const existingClients: Client[] = [
      {
        id: 'cli-1',
        name: 'Cliente Existente',
        email: 'existente@test.com',
        status: 'active',
        created_at: '2026-09-01',
      },
    ];

    const result = await parseClientSpreadsheet(file, existingClients);

    expect(result.totalRows).toBe(4);
    expect(result.validCount).toBe(2); // Rodrigo, Beatriz
    expect(result.duplicateCount).toBe(1); // Second Rodrigo (duplicate name in session)
    expect(result.invalidCount).toBe(1); // Empty name

    expect(result.rows[0].name).toBe('Rodrigo Valenzuela');
    expect(result.rows[0].company).toBe('Tech Corp');
    expect(result.rows[0].email).toBe('rodrigo@tech.com');
  });
});
