/**
 * calendar-sync.ts
 * Integración bidireccional de calendario:
 * - Generador y parseador de iCalendar (.ics - RFC 5545)
 * - Enlaces directos para Google Calendar y Outlook Web
 * - Exportador e importador universal de eventos y compromisos
 */

export interface CalendarEventExport {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss
  endDate?: string;
  location?: string;
  clientName?: string;
  status?: string;
}

export interface ParsedICSEvent {
  uid: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate?: string;
  location?: string;
  status?: string;
}

/**
 * Formatea una fecha a formato ICS (YYYYMMDD o YYYYMMDDTHHmmssZ)
 */
function formatICSDate(dateStr: string, isAllDay: boolean = true): string {
  const clean = dateStr.replace(/[-:]/g, '');
  if (isAllDay) {
    return clean.slice(0, 8); // YYYYMMDD
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return clean.slice(0, 8);
  }
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Genera el contenido de un archivo .ics estándar para uno o varios eventos
 */
export function generateICS(events: CalendarEventExport[], calName: string = 'WorkDesk Calendar'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WorkDesk//Consulting Operations Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    'X-WR-TIMEZONE:UTC',
  ];

  const nowICS = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const ev of events) {
    const isAllDay = !ev.startDate.includes('T');
    const startICS = formatICSDate(ev.startDate, isAllDay);
    
    // Si no hay endDate, asignar el mismo día
    let endICS = startICS;
    if (ev.endDate) {
      endICS = formatICSDate(ev.endDate, isAllDay);
    } else if (isAllDay) {
      // Para todo el día en RFC 5545, DTEND suele ser el día siguiente
      const d = new Date(ev.startDate);
      d.setDate(d.getDate() + 1);
      endICS = d.toISOString().replace(/[-:]/g, '').slice(0, 8);
    }

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:workdesk-${ev.id || Math.random().toString(36).substring(2)}@workdesk.app`);
    lines.push(`DTSTAMP:${nowICS}`);
    if (isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${startICS}`);
      lines.push(`DTEND;VALUE=DATE:${endICS}`);
    } else {
      lines.push(`DTSTART:${startICS}`);
      lines.push(`DTEND:${endICS}`);
    }
    lines.push(`SUMMARY:${escapeICSText(ev.title)}`);

    let fullDesc = ev.description || '';
    if (ev.clientName) {
      fullDesc = `Cliente: ${ev.clientName}\n\n${fullDesc}`.trim();
    }
    if (ev.status) {
      fullDesc = `Estado: ${ev.status}\n${fullDesc}`.trim();
    }
    if (fullDesc) {
      lines.push(`DESCRIPTION:${escapeICSText(fullDesc)}`);
    }

    if (ev.location) {
      lines.push(`LOCATION:${escapeICSText(ev.location)}`);
    }

    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function unescapeICSText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Parsea el contenido de un archivo .ics y extrae los eventos
 */
export function parseICS(icsContent: string): ParsedICSEvent[] {
  const events: ParsedICSEvent[] = [];
  const lines = icsContent.replace(/\r\n /g, '').split(/\r\n|\n|\r/);

  let inEvent = false;
  let currentEvent: Partial<ParsedICSEvent> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {
        description: '',
      };
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      if (inEvent && currentEvent.title) {
        events.push({
          uid: currentEvent.uid || `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: currentEvent.title || 'Evento importado',
          description: currentEvent.description || '',
          startDate: currentEvent.startDate || new Date().toISOString().split('T')[0],
          startTime: currentEvent.startTime,
          endDate: currentEvent.endDate,
          location: currentEvent.location,
          status: currentEvent.status,
        });
      }
      inEvent = false;
      currentEvent = {};
      continue;
    }

    if (!inEvent) continue;

    // Parse fields
    if (trimmed.startsWith('SUMMARY:')) {
      currentEvent.title = unescapeICSText(trimmed.substring(8));
    } else if (trimmed.startsWith('SUMMARY;')) {
      const idx = trimmed.indexOf(':');
      if (idx !== -1) {
        currentEvent.title = unescapeICSText(trimmed.substring(idx + 1));
      }
    } else if (trimmed.startsWith('DESCRIPTION:')) {
      currentEvent.description = unescapeICSText(trimmed.substring(12));
    } else if (trimmed.startsWith('DESCRIPTION;')) {
      const idx = trimmed.indexOf(':');
      if (idx !== -1) {
        currentEvent.description = unescapeICSText(trimmed.substring(idx + 1));
      }
    } else if (trimmed.startsWith('LOCATION:')) {
      currentEvent.location = unescapeICSText(trimmed.substring(9));
    } else if (trimmed.startsWith('UID:')) {
      currentEvent.uid = trimmed.substring(4);
    } else if (trimmed.startsWith('STATUS:')) {
      currentEvent.status = trimmed.substring(7);
    } else if (trimmed.startsWith('DTSTART')) {
      const dateVal = trimmed.split(':')[1];
      if (dateVal) {
        const parsed = parseICSDateString(dateVal);
        currentEvent.startDate = parsed.date;
        if (parsed.time) currentEvent.startTime = parsed.time;
      }
    } else if (trimmed.startsWith('DTEND')) {
      const dateVal = trimmed.split(':')[1];
      if (dateVal) {
        const parsed = parseICSDateString(dateVal);
        currentEvent.endDate = parsed.date;
      }
    }
  }

  return events;
}

function parseICSDateString(raw: string): { date: string; time?: string } {
  const clean = raw.trim().replace(/Z$/, '');
  if (clean.length >= 8) {
    const year = clean.substring(0, 4);
    const month = clean.substring(4, 6);
    const day = clean.substring(6, 8);
    const dateStr = `${year}-${month}-${day}`;

    if (clean.length >= 13 && clean.includes('T')) {
      const timePart = clean.split('T')[1];
      const hours = timePart.substring(0, 2);
      const minutes = timePart.substring(2, 4);
      return { date: dateStr, time: `${hours}:${minutes}` };
    }

    return { date: dateStr };
  }
  return { date: new Date().toISOString().split('T')[0] };
}

/**
 * Genera la URL para añadir directamente a Google Calendar
 */
export function generateGoogleCalendarUrl({
  title,
  description,
  startDate,
  endDate,
  location,
}: {
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  location?: string;
}): string {
  const startParam = startDate.replace(/-/g, '');
  let endParam = endDate ? endDate.replace(/-/g, '') : startParam;
  
  // Para Google Calendar, el rango all-day es start/end
  const dates = `${startParam}/${endParam}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: dates,
  });

  if (description) params.set('details', description);
  if (location) params.set('location', location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera la URL para añadir directamente a Outlook Calendar Web (Office 365 / Outlook.com)
 */
export function generateOutlookCalendarUrl({
  title,
  description,
  startDate,
  endDate,
  location,
}: {
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  location?: string;
}): string {
  const startIso = `${startDate}T09:00:00`;
  const endIso = endDate ? `${endDate}T18:00:00` : `${startDate}T18:00:00`;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: startIso,
    enddt: endIso,
    allday: 'true',
  });

  if (description) params.set('body', description);
  if (location) params.set('location', location);

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Dispara la descarga de un archivo .ics en el navegador
 */
export function triggerICSDownload(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
