import type { Commitment, Followup } from '../types';

export interface CalendarDay {
  date: string; // 'YYYY-MM-DD'
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface CalendarEvent {
  id: string;
  type: 'commitment' | 'followup';
  title: string;
  subtitle?: string;
  date: string;
  status?: string;
  owner?: string;
  case_id: string;
  priority?: string;
  followup_type?: string;
}

/**
 * Returns a 35 or 42 day matrix for a month calendar starting on Monday.
 */
export function getMonthMatrix(year: number, month: number): CalendarDay[] {
  const result: CalendarDay[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  // First day of target month (0-indexed month)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const totalDaysInMonth = lastDay.getDate();

  // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
  // In Monday-based calendar: Mon=0, Tue=1, ..., Sun=6
  let startingDayOfWeek = firstDay.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  // Previous month padding days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const d = new Date(year, month - 1, dayNum);
    const dateStr = formatDateISO(d);
    result.push({
      date: dateStr,
      dayOfMonth: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = formatDateISO(dateObj);
    result.push({
      date: dateStr,
      dayOfMonth: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
    });
  }

  // Next month padding days to complete full grid (multiple of 7, 35 or 42 cells)
  const remainingCells = (7 - (result.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const dateObj = new Date(year, month + 1, d);
    const dateStr = formatDateISO(dateObj);
    result.push({
      date: dateStr,
      dayOfMonth: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
    });
  }

  return result;
}

/**
 * Returns the 7 days of the week containing the given date.
 */
export function getWeekDays(referenceDate: Date): CalendarDay[] {
  const result: CalendarDay[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  const current = new Date(referenceDate);
  let dayOfWeek = current.getDay() - 1;
  if (dayOfWeek === -1) dayOfWeek = 6;

  const monday = new Date(current);
  monday.setDate(current.getDate() - dayOfWeek);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatDateISO(d);
    result.push({
      date: dateStr,
      dayOfMonth: d.getDate(),
      isCurrentMonth: d.getMonth() === referenceDate.getMonth(),
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }

  return result;
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Formats month name and year (e.g. "Septiembre 2026")
 */
export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

/**
 * Groups commitments and followups into indexed calendar events by date.
 */
export function groupCalendarEvents(
  commitments: Commitment[],
  followups: Followup[]
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();

  const addEvent = (dateStr: string, event: CalendarEvent) => {
    if (!dateStr) return;
    const cleanDate = dateStr.substring(0, 10);
    const list = map.get(cleanDate) || [];
    list.push(event);
    map.set(cleanDate, list);
  };

  commitments.forEach((com) => {
    if (com.due_date) {
      addEvent(com.due_date, {
        id: `com-${com.id}`,
        type: 'commitment',
        title: com.description,
        subtitle: com.client_name ? `${com.client_name} • ${com.case_title || ''}` : com.case_title || '',
        date: com.due_date,
        status: com.status,
        owner: com.owner,
        case_id: com.case_id,
      });
    }
  });

  followups.forEach((f) => {
    if (f.date) {
      addEvent(f.date, {
        id: `fol-${f.id}`,
        type: 'followup',
        title: f.summary,
        date: f.date,
        followup_type: f.type,
        case_id: f.case_id,
      });
    }
  });

  return map;
}
