import { describe, it, expect } from 'vitest';
import { DESTINATIONS, destinationOf, labelOf, summaryOf } from '../../src/navigation/destinations';
import type { ActiveTab } from '../../src/types';

/**
 * El registro de destinos es la fuente única de verdad de la navegación:
 * el sidebar, el Command Center y los títulos de página leen de aquí.
 * Estos tests blindan las invariantes que evitan que la app vuelva a
 * divergir entre capas.
 */
describe('Registro de destinos', () => {
  it('cubre todos los destinos de la aplicación', () => {
    // Todos los ActiveTab posibles deben tener una entrada: si se añade una
    // vista nueva sin registrar, el sidebar no la mostraría.
    const tabs: ActiveTab[] = [
      'my_day', 'inbox', 'waiting_on', 'dashboard', 'tickets', 'cases',
      'commitments', 'calendar', 'clients', 'notes', 'emails', 'reports',
      'analytics', 'settings',
    ];
    expect(DESTINATIONS.map((d) => d.id).sort()).toEqual([...tabs].sort());
  });

  it('no tiene destinos duplicados', () => {
    const ids = DESTINATIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no tiene nombres duplicados', () => {
    const labels = DESTINATIONS.map((d) => d.label.toLowerCase());
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('todos los destinos tienen nombre, resumen, icono y sección', () => {
    for (const d of DESTINATIONS) {
      expect(d.label.trim().length).toBeGreaterThan(0);
      expect(d.summary.trim().length).toBeGreaterThan(0);
      expect(d.icon).toBeTruthy();
      expect(d.section.trim().length).toBeGreaterThan(0);
    }
  });

  it('agrupa los destinos en secciones contiguas', () => {
    // Las secciones no deben alternarse: un grupo partido en dos bloques
    // rompe la lectura del sidebar.
    const vistas: string[] = [];
    for (const d of DESTINATIONS) {
      if (vistas[vistas.length - 1] !== d.section) vistas.push(d.section);
    }
    expect(new Set(vistas).size).toBe(vistas.length);
  });

  it('devuelve el destino canónico por id', () => {
    expect(labelOf('my_day')).toBe('Mi Día');
    expect(labelOf('reports')).toBe('Documentos & Word');
    expect(summaryOf('my_day')).toContain('jornada');
  });

  it('lanza ante un id desconocido', () => {
    expect(() => destinationOf('inexistente' as ActiveTab)).toThrow();
  });
});
