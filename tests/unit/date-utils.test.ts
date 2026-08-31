import { describe, it, expect } from 'vitest';
import { isOverdue, isDueToday, formatDate, formatRelativeDate, getTodayIso } from '../../src/utils/date';

describe('date-utils', () => {
  const today = getTodayIso();

  it('isOverdue detects past dates', () => {
    expect(isOverdue('2020-01-01')).toBe(true);
    expect(isOverdue('2099-01-01')).toBe(false);
    expect(isOverdue(today)).toBe(false);
    expect(isOverdue(null)).toBe(false);
  });

  it('isDueToday identifies today', () => {
    expect(isDueToday(today)).toBe(true);
    expect(isDueToday('2020-01-01')).toBe(false);
  });

  it('formatDate formats YYYY-MM-DD into DD/MM/YYYY', () => {
    expect(formatDate('2026-08-31')).toBe('31/08/2026');
    expect(formatDate(null)).toBe('Sin fecha');
  });

  it('formatRelativeDate returns human readable status', () => {
    expect(formatRelativeDate(today)).toBe('¡Vence hoy!');
    expect(formatRelativeDate('2020-01-01')).toContain('Vencido');
    expect(formatRelativeDate(null)).toBe('Sin fecha límite');
  });
});
