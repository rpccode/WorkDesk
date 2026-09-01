import { useStore } from '../store';
import { sendDesktopNotification } from '../utils/live-alerts';
import type { Commitment, Case } from '../types';

// Track already alerted commitments to avoid alerting repeatedly in the same session
const alertedCommitmentIds = new Set<string>();
const DRAFTS_BACKUP_KEY = 'workdesk_background_drafts_backup';

export interface BackgroundServiceStats {
  isRunning: boolean;
  lastScanTime: Date | null;
  overdueCount: number;
  dueTodayCount: number;
  emailsCheckedCount: number;
  lastSyncStatus: string;
}

class BackgroundEngine {
  private timer: any = null;
  private isScanning: boolean = false;
  private lastScanTime: Date | null = null;
  private listeners: ((stats: BackgroundServiceStats) => void)[] = [];

  public start(intervalSeconds: number = 60) {
    this.stop();
    // Run initial scan after 3 seconds of boot
    setTimeout(() => {
      this.executeCycle();
    }, 3000);

    const ms = Math.max(15, intervalSeconds) * 1000;
    this.timer = setInterval(() => {
      this.executeCycle();
    }, ms);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async forceScanNow(): Promise<BackgroundServiceStats> {
    await this.executeCycle();
    return this.getStats();
  }

  public subscribe(callback: (stats: BackgroundServiceStats) => void) {
    this.listeners.push(callback);
    callback(this.getStats());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public getStats(): BackgroundServiceStats {
    const store = useStore.getState();
    const nowStr = new Date().toISOString().split('T')[0];

    const overdueCount = store.commitments.filter((c) => {
      if (c.status === 'done') return false;
      const dueStr = c.due_date ? c.due_date.split('T')[0] : '';
      return dueStr && dueStr < nowStr;
    }).length;

    const dueTodayCount = store.commitments.filter((c) => {
      if (c.status === 'done') return false;
      const dueStr = c.due_date ? c.due_date.split('T')[0] : '';
      return dueStr === nowStr;
    }).length;

    return {
      isRunning: this.timer !== null,
      lastScanTime: this.lastScanTime,
      overdueCount,
      dueTodayCount,
      emailsCheckedCount: store.emailAccounts.length,
      lastSyncStatus: this.isScanning ? 'Escaneando en segundo plano...' : 'Operativo y Vigilante',
    };
  }

  private notifyListeners() {
    const stats = this.getStats();
    this.listeners.forEach((l) => l(stats));
  }

  private async executeCycle() {
    if (this.isScanning) return;
    this.isScanning = true;
    this.notifyListeners();

    const store = useStore.getState();
    const prefs = store.consultantPreferences;

    try {
      // 1. Silent Data Sync
      await store.refreshAll();

      // 2. Background Email Sync if enabled
      if (prefs.enable_background_email_sync && store.emailAccounts.length > 0) {
        try {
          await store.syncInboxEmails();
        } catch (_) {
          // ignore background email sync errors quietly
        }
      }

      // 3. Background Watchdog: SLA & Commitments
      if (prefs.enable_background_watchdog) {
        this.checkCommitmentsWatchdog(store.commitments, store.cases);
      }

      // 4. Background Auto-Drafts Backup if enabled
      if (prefs.enable_auto_drafts) {
        this.saveDraftsBackup(store.notes);
      }

      this.lastScanTime = new Date();
    } catch (err) {
      console.warn('Error in background service cycle:', err);
    } finally {
      this.isScanning = false;
      this.notifyListeners();
    }
  }

  private checkCommitmentsWatchdog(commitments: Commitment[], cases: Case[]) {
    const store = useStore.getState();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (const c of commitments) {
      if (c.status === 'done' || !c.due_date) continue;
      const dueStr = c.due_date.split('T')[0];

      // Overdue Check
      if (dueStr < todayStr && !alertedCommitmentIds.has(`overdue-${c.id}`)) {
        alertedCommitmentIds.add(`overdue-${c.id}`);

        const caseItem = cases.find((item) => item.id === c.case_id);
        const caseTitle = caseItem ? ` en "${caseItem.title}"` : '';

        store.addNotification({
          type: 'critical',
          title: '⚠️ Compromiso Vencido (Vigilante)',
          message: `El compromiso "${c.description}"${caseTitle} expiró el ${new Date(c.due_date).toLocaleDateString('es')}.`,
          commitment_id: c.id,
          case_id: c.case_id,
          action_label: 'Ver Compromiso',
          action_type: 'open_commitment',
          show_toast: true,
        });

        if (store.consultantPreferences.enable_desktop_notifications) {
          sendDesktopNotification(
            '⚠️ Compromiso Vencido',
            `"${c.description}" requiere tu atención inmediata.`
          );
        }
      }

      // Due Today Check
      else if (dueStr === todayStr && !alertedCommitmentIds.has(`today-${c.id}`)) {
        alertedCommitmentIds.add(`today-${c.id}`);

        store.addNotification({
          type: 'warning',
          title: '⏰ Compromiso Vence Hoy',
          message: `El compromiso "${c.description}" está programado para cerrarse el día de hoy.`,
          commitment_id: c.id,
          case_id: c.case_id,
          action_label: 'Revisar',
          action_type: 'open_commitment',
          show_toast: true,
        });

        if (store.consultantPreferences.enable_desktop_notifications) {
          sendDesktopNotification(
            '⏰ Compromiso Vence Hoy',
            `"${c.description}" vence durante la jornada de hoy.`
          );
        }
      }
    }
  }

  private saveDraftsBackup(notes: any[]) {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        notesCount: notes.length,
        notesSnippet: notes.slice(0, 10),
      };
      localStorage.setItem(DRAFTS_BACKUP_KEY, JSON.stringify(backup));
    } catch (_) {}
  }
}

export const backgroundEngine = new BackgroundEngine();
