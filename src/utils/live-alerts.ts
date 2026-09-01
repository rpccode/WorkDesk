import type { Commitment, Case, Client, NotificationType, AddNotificationInput } from '../types';
import { isOverdue, isDueToday } from './date';

// In-memory set of notified entity IDs to prevent duplicate spam in the same session
const alertedEntityIds = new Set<string>();

/**
 * Synthesizes a subtle, pleasant notification chime using standard Web Audio API.
 * No external .mp3 files required.
 */
export function playNotificationSound(type: NotificationType = 'info'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'critical') {
      // Urgent two-tone chime (F#5 -> A5)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(739.99, now); // F#5
      osc.frequency.setValueAtTime(880.0, now + 0.12); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'email') {
      // Gentle mail chime (C5 -> E5 -> G5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Soft ping (E5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (err) {
    // Audio context may be restricted before first user interaction
    console.debug('Audio notification not allowed yet:', err);
  }
}

/**
 * Requests desktop OS notification permissions.
 */
export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

/**
 * Emits a native OS desktop notification if permissions are granted.
 */
export function sendDesktopNotification(title: string, body: string, tag?: string): void {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/app-icon.png',
        tag: tag || 'workdesk-alert',
      });
    }
  } catch (err) {
    console.debug('Error showing OS notification:', err);
  }
}

/**
 * Scans commitments, cases, and clients to generate smart live alerts.
 */
export function evaluateLiveAlerts(
  commitments: Commitment[],
  cases: Case[],
  _clients: Client[]
): AddNotificationInput[] {
  const newAlerts: AddNotificationInput[] = [];

  const casesMap = new Map<string, Case>();
  cases.forEach((c) => casesMap.set(c.id, c));

  for (const com of commitments) {
    if (com.status === 'done') continue;

    const caseItem = casesMap.get(com.case_id);
    const caseName = caseItem?.title || 'Caso general';
    const clientName = caseItem?.client_name || '';

    // 1. Overdue commitment alert
    if (isOverdue(com.due_date)) {
      const alertKey = `overdue-${com.id}`;
      if (!alertedEntityIds.has(alertKey)) {
        alertedEntityIds.add(alertKey);
        newAlerts.push({
          type: 'critical',
          title: `Compromiso Vencido: ${com.description}`,
          message: `${clientName ? `Cliente: ${clientName} • ` : ''}Caso: ${caseName}. Debió entregarse el ${com.due_date}.`,
          case_id: com.case_id,
          commitment_id: com.id,
          action_label: 'Ver Caso',
          action_type: 'open_case',
          show_toast: true,
        });
      }
    }
    // 2. Due today commitment alert
    else if (isDueToday(com.due_date)) {
      const alertKey = `duetoday-${com.id}`;
      if (!alertedEntityIds.has(alertKey)) {
        alertedEntityIds.add(alertKey);
        newAlerts.push({
          type: 'warning',
          title: `Vence Hoy: ${com.description}`,
          message: `${clientName ? `Cliente: ${clientName} • ` : ''}Caso: ${caseName}. Compromiso programado para hoy.`,
          case_id: com.case_id,
          commitment_id: com.id,
          action_label: 'Ver Caso',
          action_type: 'open_case',
          show_toast: true,
        });
      }
    }
  }

  // 3. High priority / critical open cases
  for (const c of cases) {
    if (c.status === 'closed') continue;
    if (c.priority === 'critical') {
      const alertKey = `critical-case-${c.id}`;
      if (!alertedEntityIds.has(alertKey)) {
        alertedEntityIds.add(alertKey);
        newAlerts.push({
          type: 'critical',
          title: `Caso en Estado Crítico: ${c.title}`,
          message: `El cliente ${c.client_name || 'asignado'} tiene un caso de máxima prioridad abierto.`,
          case_id: c.id,
          action_label: 'Abrir Caso',
          action_type: 'open_case',
          show_toast: false,
        });
      }
    }
  }

  return newAlerts;
}

/**
 * Resets the session alert cache (useful for testing or full refresh).
 */
export function resetAlertSessionCache(): void {
  alertedEntityIds.clear();
}
