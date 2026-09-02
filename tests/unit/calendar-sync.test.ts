import { describe, it, expect } from 'vitest';
import {
  generateICS,
  parseICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  type CalendarEventExport,
} from '../../src/utils/calendar-sync';

describe('calendar-sync', () => {
  const mockEvents: CalendarEventExport[] = [
    {
      id: 'evt-1',
      title: 'Entrega informe final',
      description: 'Presentación del diagnóstico de arquitectura',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      location: 'Oficina Central',
      clientName: 'Banco Innova',
    },
    {
      id: 'evt-2',
      title: 'Reunión de kickoff',
      description: 'Alineación de objetivos y equipo',
      startDate: '2026-09-15',
    },
  ];

  describe('generateICS', () => {
    it('generates valid RFC 5545 iCalendar content', () => {
      const ics = generateICS(mockEvents, 'WorkDesk Test Calendar');

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('X-WR-CALNAME:WorkDesk Test Calendar');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Entrega informe final');
      expect(ics).toContain('Presentación del diagnóstico de arquitectura');
      expect(ics).toContain('LOCATION:Oficina Central');
      expect(ics).toContain('SUMMARY:Reunión de kickoff');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('handles empty events list', () => {
      const ics = generateICS([]);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).not.toContain('BEGIN:VEVENT');
    });
  });

  describe('parseICS', () => {
    it('parses valid ICS file content into structured events', () => {
      const sampleICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-uid-123
SUMMARY:Revisión de arquitectura cloud
DESCRIPTION:Sesión técnica con equipo de desarrollo
LOCATION:Sala Virtual
DTSTART;VALUE=DATE:20260920
DTEND;VALUE=DATE:20260920
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(sampleICS);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Revisión de arquitectura cloud');
      expect(events[0].description).toBe('Sesión técnica con equipo de desarrollo');
      expect(events[0].location).toBe('Sala Virtual');
      expect(events[0].startDate).toBe('2026-09-20');
    });
  });

  describe('generateGoogleCalendarUrl', () => {
    it('generates a valid Google Calendar render URL', () => {
      const url = generateGoogleCalendarUrl({
        title: 'Comité de Dirección',
        description: 'Revisión semestral',
        startDate: '2026-09-25',
      });

      expect(url).toContain('https://calendar.google.com/calendar/render');
      expect(url).toContain('text=Comit%C3%A9+de+Direcci%C3%B3n');
      expect(url).toContain('details=Revisi%C3%B3n+semestral');
      expect(url).toContain('dates=20260925%2F20260925');
    });
  });

  describe('generateOutlookCalendarUrl', () => {
    it('generates a valid Outlook Web deeplink URL', () => {
      const url = generateOutlookCalendarUrl({
        title: 'Revisión SLA',
        description: 'Revisión de métricas mensuales',
        startDate: '2026-09-28',
      });

      expect(url).toContain('https://outlook.office.com/calendar/0/deeplink/compose');
      expect(url).toContain('subject=Revisi%C3%B3n+SLA');
      expect(url).toContain('body=Revisi%C3%B3n+de+m%C3%A9tricas+mensuales');
    });
  });
});
