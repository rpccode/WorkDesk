import { describe, it, expect } from 'vitest';
import { getMonthMatrix, getWeekDays, formatMonthYear, groupCalendarEvents } from '../../src/utils/calendar-utils';
import type { Commitment, Followup } from '../../src/types';

describe('Calendar Utilities', () => {
  it('generates a clean matrix of days for a month', () => {
    // September 2026 (month index 8)
    const days = getMonthMatrix(2026, 8);

    // Should be a multiple of 7 (35 or 42 cells)
    expect(days.length % 7).toBe(0);
    expect(days.length).toBeGreaterThanOrEqual(35);

    // Should contain day 1 of September
    const dayOne = days.find((d) => d.dayOfMonth === 1 && d.isCurrentMonth);
    expect(dayOne).toBeDefined();
    expect(dayOne?.date).toBe('2026-09-01');

    // Should contain day 30 of September
    const dayThirty = days.find((d) => d.dayOfMonth === 30 && d.isCurrentMonth);
    expect(dayThirty).toBeDefined();
    expect(dayThirty?.date).toBe('2026-09-30');
  });

  it('generates 7 days for a week view starting on Monday', () => {
    const refDate = new Date(2026, 8, 15); // Tuesday Sept 15, 2026
    const week = getWeekDays(refDate);

    expect(week.length).toBe(7);
    expect(week[0].date).toBe('2026-09-14'); // Monday
    expect(week[6].date).toBe('2026-09-20'); // Sunday
  });

  it('formats month and year in Spanish correctly', () => {
    expect(formatMonthYear(2026, 8)).toBe('Septiembre 2026');
    expect(formatMonthYear(2026, 0)).toBe('Enero 2026');
    expect(formatMonthYear(2026, 11)).toBe('Diciembre 2026');
  });

  it('groups commitments and followups by date key', () => {
    const commitments: Commitment[] = [
      {
        id: 'com-1',
        case_id: 'case-1',
        case_title: 'Caso Alpha',
        description: 'Entrega de informe',
        owner: 'me',
        due_date: '2026-09-15',
        status: 'pending',
        created_at: '2026-09-01',
      },
      {
        id: 'com-2',
        case_id: 'case-1',
        case_title: 'Caso Alpha',
        description: 'Llamada de seguimiento',
        owner: 'client',
        due_date: '2026-09-15',
        status: 'done',
        created_at: '2026-09-01',
      },
    ];

    const followups: Followup[] = [
      {
        id: 'fol-1',
        case_id: 'case-1',
        type: 'meeting',
        summary: 'Reunión de avance',
        date: '2026-09-15',
        created_at: '2026-09-01',
      },
    ];

    const grouped = groupCalendarEvents(commitments, followups);

    expect(grouped.has('2026-09-15')).toBe(true);
    const eventsOn15 = grouped.get('2026-09-15')!;
    expect(eventsOn15.length).toBe(3);
    expect(eventsOn15.filter((e) => e.type === 'commitment').length).toBe(2);
    expect(eventsOn15.filter((e) => e.type === 'followup').length).toBe(1);
  });
});
