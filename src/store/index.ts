import { create } from 'zustand';
import { api } from '../api/tauri';
import type {
  Client,
  ClientStatus,
  Case,
  Commitment,
  Followup,
  Note,
  DashboardSummary,
  ActiveTab,
  AppNotification,
  AddNotificationInput,
  ConsultantProfile,
  ConsultantPreferences,
} from '../types';
import { evaluateLiveAlerts, playNotificationSound, sendDesktopNotification } from '../utils/live-alerts';
import {
  DEFAULT_CONSULTANT_PROFILE,
  DEFAULT_CONSULTANT_PREFERENCES,
  applyAccentColor,
} from '../utils/theme-manager';

const PROFILE_KEY = 'workdesk_consultant_profile';
const PREFERENCES_KEY = 'workdesk_consultant_preferences';
const CLIENTS_METADATA_KEY = 'workdesk_clients_metadata';

function getStoredClientsMetadata(): Record<string, Partial<Client>> {
  try {
    const raw = localStorage.getItem(CLIENTS_METADATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveClientMetadata(id: string, name: string, meta: Partial<Client>) {
  try {
    const all = getStoredClientsMetadata();
    all[id] = { ...all[id], ...meta };
    if (name) {
      all[name.toLowerCase().trim()] = { ...all[name.toLowerCase().trim()], ...meta };
    }
    localStorage.setItem(CLIENTS_METADATA_KEY, JSON.stringify(all));
  } catch {}
}

function loadStoredProfile(): ConsultantProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_CONSULTANT_PROFILE, ...JSON.parse(raw) } : DEFAULT_CONSULTANT_PROFILE;
  } catch {
    return DEFAULT_CONSULTANT_PROFILE;
  }
}

function loadStoredPreferences(): ConsultantPreferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    const prefs = raw ? { ...DEFAULT_CONSULTANT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_CONSULTANT_PREFERENCES;
    applyAccentColor(prefs.accent_color);
    return prefs;
  } catch {
    applyAccentColor(DEFAULT_CONSULTANT_PREFERENCES.accent_color);
    return DEFAULT_CONSULTANT_PREFERENCES;
  }
}

interface WorkDeskState {
  // Navigation & UI
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isQuickCaptureOpen: boolean;
  setQuickCaptureOpen: (open: boolean) => void;
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string | null) => void;
  caseForEmail: Case | null;
  setCaseForEmail: (c: Case | null) => void;

  // Clients
  clients: Client[];
  isLoadingClients: boolean;
  fetchClients: () => Promise<void>;
  createClient: (input: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    category?: string;
    complexity_weighted?: import('../types').ClientComplexity;
    complexity_evaluated?: import('../types').ClientComplexity;
    ticket_avg?: number;
    branches_count?: number;
    employees_count?: number;
    systems_count?: number;
    has_it_department?: boolean;
  }) => Promise<Client>;
  updateClient: (input: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    status: string;
    category?: string;
    complexity_weighted?: import('../types').ClientComplexity;
    complexity_evaluated?: import('../types').ClientComplexity;
    ticket_avg?: number;
    branches_count?: number;
    employees_count?: number;
    systems_count?: number;
    has_it_department?: boolean;
  }) => Promise<Client>;

  // Cases
  cases: Case[];
  caseFilter: string;
  setCaseFilter: (filter: string) => void;
  isLoadingCases: boolean;
  fetchCases: () => Promise<void>;
  createCase: (input: { client_id: string; title: string; description?: string; priority?: string }) => Promise<Case>;
  updateCase: (input: { id: string; title: string; description?: string; status: string; priority: string }) => Promise<Case>;
  closeCase: (id: string) => Promise<void>;

  // Commitments
  commitments: Commitment[];
  commitmentFilter: string;
  setCommitmentFilter: (filter: string) => void;
  isLoadingCommitments: boolean;
  fetchCommitments: (caseId?: string) => Promise<void>;
  createCommitment: (input: { case_id: string; description: string; owner?: string; due_date?: string }) => Promise<Commitment>;
  markCommitmentDone: (id: string) => Promise<void>;
  snoozeCommitment: (id: string, newDueDate: string) => Promise<void>;

  // Followups
  followups: Followup[];
  fetchFollowups: (caseId: string) => Promise<void>;
  createFollowup: (input: { case_id: string; type?: string; summary: string; date?: string }) => Promise<Followup>;

  // Notes
  notes: Note[];
  isLoadingNotes: boolean;
  fetchNotes: (caseId?: string) => Promise<void>;
  createNote: (input: { case_id?: string; content: string }) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;

  // Dashboard
  dashboardSummary: DashboardSummary | null;
  isLoadingDashboard: boolean;
  fetchDashboardSummary: () => Promise<void>;

  // Email Accounts & Synchronization
  emailAccounts: import('../types').EmailAccount[];
  isLoadingEmailAccounts: boolean;
  fetchEmailAccounts: () => Promise<void>;
  saveEmailAccount: (input: import('../types').SaveEmailAccountInput) => Promise<import('../types').EmailAccount>;
  deleteEmailAccount: (id: string) => Promise<void>;
  testEmailConnection: (input: import('../types').SaveEmailAccountInput) => Promise<import('../types').TestConnectionResponse>;
  sendEmailDirect: (input: import('../types').SendEmailInput) => Promise<import('../types').SendEmailResponse>;
  caseEmails: import('../types').CaseEmail[];
  fetchCaseEmails: (caseId: string) => Promise<void>;
  syncInboxEmails: () => Promise<import('../types').SyncEmailsResult>;
  startOAuthLogin: (input: import('../types').StartOAuthInput) => Promise<import('../types').OAuthLoginResult>;

  // Master refresh
  refreshAll: () => Promise<void>;

  // Live Notifications
  isNotificationCenterOpen: boolean;
  setNotificationCenterOpen: (open: boolean) => void;
  notifications: AppNotification[];
  activeToasts: AppNotification[];
  addNotification: (input: AddNotificationInput) => void;
  dismissToast: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;
  triggerLiveAlertsCheck: () => void;

  // Consultant Profile & Personalization
  consultantProfile: ConsultantProfile;
  consultantPreferences: ConsultantPreferences;
  updateConsultantProfile: (profile: Partial<ConsultantProfile>) => void;
  updateConsultantPreferences: (prefs: Partial<ConsultantPreferences>) => void;
  exportFullBackupJson: () => string;
}

export const useStore = create<WorkDeskState>((set, get) => ({
  // UI
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isQuickCaptureOpen: false,
  setQuickCaptureOpen: (open) => set({ isQuickCaptureOpen: open }),
  selectedCaseId: null,
  setSelectedCaseId: (id) => set({ selectedCaseId: id }),
  caseForEmail: null,
  setCaseForEmail: (c) => set({ caseForEmail: c, activeTab: 'emails' }),
  isNotificationCenterOpen: false,
  setNotificationCenterOpen: (open) => set({ isNotificationCenterOpen: open }),
  notifications: [],
  activeToasts: [],

  // Clients
  clients: [],
  isLoadingClients: false,
  fetchClients: async () => {
    set({ isLoadingClients: true });
    try {
      const data = await api.getClients();
      const meta = getStoredClientsMetadata();
      const merged = data.map((c) => {
        const byId = meta[c.id] || {};
        const byName = meta[c.name.toLowerCase().trim()] || {};
        return { ...c, ...byName, ...byId };
      });
      set({ clients: merged });
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      set({ isLoadingClients: false });
    }
  },
  createClient: async (input) => {
    const created = await api.createClient(input);
    saveClientMetadata(created.id, input.name, input);
    const fullClient: Client = {
      ...created,
      ...input,
      status: 'active',
      created_at: created.created_at || new Date().toISOString(),
    };
    set((state) => ({ clients: [...state.clients, fullClient] }));
    get().fetchDashboardSummary();
    return fullClient;
  },
  updateClient: async (input) => {
    const updated = await api.updateClient(input);
    const clientStatus = (input.status as ClientStatus) || 'active';
    saveClientMetadata(input.id, input.name, { ...input, status: clientStatus });
    const fullClient: Client = {
      ...updated,
      ...input,
      status: clientStatus,
    };
    set((state) => ({
      clients: state.clients.map((c) => (c.id === input.id ? fullClient : c)),
    }));
    return fullClient;
  },

  // Cases
  cases: [],
  caseFilter: 'all',
  setCaseFilter: (filter) => {
    set({ caseFilter: filter });
    get().fetchCases();
  },
  isLoadingCases: false,
  fetchCases: async () => {
    set({ isLoadingCases: true });
    try {
      const filter = get().caseFilter;
      const data = await api.getCases(filter === 'all' ? undefined : filter);
      set({ cases: data });
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      set({ isLoadingCases: false });
    }
  },
  createCase: async (input) => {
    const created = await api.createCase(input);
    set((state) => ({ cases: [created, ...state.cases] }));
    get().fetchDashboardSummary();
    return created;
  },
  updateCase: async (input) => {
    const updated = await api.updateCase(input);
    set((state) => ({
      cases: state.cases.map((c) => (c.id === input.id ? updated : c)),
    }));
    get().fetchDashboardSummary();
    return updated;
  },
  closeCase: async (id) => {
    await api.closeCase(id);
    set((state) => ({
      cases: state.cases.map((c) => (c.id === id ? { ...c, status: 'closed' } : c)),
    }));
    get().fetchDashboardSummary();
  },

  // Commitments
  commitments: [],
  commitmentFilter: 'all',
  setCommitmentFilter: (filter) => {
    set({ commitmentFilter: filter });
    get().fetchCommitments();
  },
  isLoadingCommitments: false,
  fetchCommitments: async (caseId) => {
    set({ isLoadingCommitments: true });
    try {
      const filter = get().commitmentFilter;
      const data = await api.getCommitments(caseId, filter === 'all' ? undefined : filter);
      set({ commitments: data });
    } catch (err) {
      console.error('Error fetching commitments:', err);
    } finally {
      set({ isLoadingCommitments: false });
    }
  },
  createCommitment: async (input) => {
    const created = await api.createCommitment(input);
    set((state) => ({ commitments: [created, ...state.commitments] }));
    get().fetchDashboardSummary();
    return created;
  },
  markCommitmentDone: async (id) => {
    await api.markCommitmentDone(id);
    set((state) => ({
      commitments: state.commitments.map((c) =>
        c.id === id ? { ...c, status: 'done', done_at: new Date().toISOString() } : c
      ),
    }));
    get().fetchDashboardSummary();
  },
  snoozeCommitment: async (id, newDueDate) => {
    await api.snoozeCommitment(id, newDueDate);
    set((state) => ({
      commitments: state.commitments.map((c) =>
        c.id === id ? { ...c, due_date: newDueDate, status: 'pending' } : c
      ),
    }));
    get().fetchDashboardSummary();
  },

  // Followups
  followups: [],
  fetchFollowups: async (caseId) => {
    try {
      const data = await api.getFollowups(caseId);
      set({ followups: data });
    } catch (err) {
      console.error('Error fetching followups:', err);
    }
  },
  createFollowup: async (input) => {
    const created = await api.createFollowup(input);
    set((state) => ({ followups: [created, ...state.followups] }));
    return created;
  },

  // Notes
  notes: [],
  isLoadingNotes: false,
  fetchNotes: async (caseId) => {
    set({ isLoadingNotes: true });
    try {
      const data = await api.getNotes(caseId);
      set({ notes: data });
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      set({ isLoadingNotes: false });
    }
  },
  createNote: async (input) => {
    const created = await api.createNote(input);
    set((state) => ({ notes: [created, ...state.notes] }));
    return created;
  },
  deleteNote: async (id) => {
    await api.deleteNote(id);
    set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
  },

  // Dashboard
  dashboardSummary: null,
  isLoadingDashboard: false,
  fetchDashboardSummary: async () => {
    set({ isLoadingDashboard: true });
    try {
      const data = await api.getDashboardSummary();
      set({ dashboardSummary: data });
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      set({ isLoadingDashboard: false });
    }
  },

  // Email Accounts & Synchronization
  emailAccounts: [],
  isLoadingEmailAccounts: false,
  fetchEmailAccounts: async () => {
    set({ isLoadingEmailAccounts: true });
    try {
      const data = await api.getEmailAccounts();
      set({ emailAccounts: data });
    } catch (err) {
      console.error('Error fetching email accounts:', err);
    } finally {
      set({ isLoadingEmailAccounts: false });
    }
  },
  saveEmailAccount: async (input) => {
    const saved = await api.saveEmailAccount(input);
    await get().fetchEmailAccounts();
    return saved;
  },
  deleteEmailAccount: async (id) => {
    await api.deleteEmailAccount(id);
    set((state) => ({ emailAccounts: state.emailAccounts.filter((a) => a.id !== id) }));
  },
  testEmailConnection: async (input) => {
    return await api.testEmailConnection(input);
  },
  sendEmailDirect: async (input) => {
    const res = await api.sendEmailDirect(input);
    get().fetchDashboardSummary();
    get().fetchFollowups(input.case_id);
    get().fetchCaseEmails(input.case_id);
    return res;
  },
  caseEmails: [],
  fetchCaseEmails: async (caseId) => {
    try {
      const data = await api.getCaseEmails(caseId);
      set({ caseEmails: data });
    } catch (err) {
      console.error('Error fetching case emails:', err);
    }
  },
  syncInboxEmails: async () => {
    const res = await api.syncInboxEmails();
    get().fetchDashboardSummary();
    get().fetchEmailAccounts();

    if (res.new_emails_count > 0) {
      get().addNotification({
        type: 'email',
        title: 'Nuevos Correos de Clientes',
        message: res.message,
        action_label: 'Ver Casos',
        action_type: 'open_case',
        show_toast: true,
      });
    }

    return res;
  },
  startOAuthLogin: async (input) => {
    const res = await api.startOAuthLogin(input);
    await get().fetchEmailAccounts();
    return res;
  },

  // Notification actions
  addNotification: (input) => {
    const newNotif: AppNotification = {
      id: crypto.randomUUID ? crypto.randomUUID() : `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: input.type,
      title: input.title,
      message: input.message,
      case_id: input.case_id,
      commitment_id: input.commitment_id,
      client_id: input.client_id,
      is_read: false,
      created_at: new Date().toISOString(),
      action_label: input.action_label,
      action_type: input.action_type,
    };

    set((state) => ({
      notifications: [newNotif, ...state.notifications],
      activeToasts: input.show_toast !== false ? [newNotif, ...state.activeToasts.slice(0, 3)] : state.activeToasts,
    }));

    if (input.show_toast !== false) {
      playNotificationSound(input.type);
      sendDesktopNotification(input.title, input.message);
    }
  },

  dismissToast: (id) => {
    set((state) => ({
      activeToasts: state.activeToasts.filter((t) => t.id !== id),
    }));
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
    }));
  },

  clearAllNotifications: () => {
    set({ notifications: [], activeToasts: [] });
  },

  triggerLiveAlertsCheck: () => {
    const { commitments, cases, clients, addNotification } = get();
    const alerts = evaluateLiveAlerts(commitments, cases, clients);
    alerts.forEach((alert) => addNotification(alert));
  },

  // Consultant Profile & Personalization
  consultantProfile: loadStoredProfile(),
  consultantPreferences: loadStoredPreferences(),

  updateConsultantProfile: (profileUpdate) => {
    set((state) => {
      const updated = { ...state.consultantProfile, ...profileUpdate };
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving profile:', e);
      }
      return { consultantProfile: updated };
    });
  },

  updateConsultantPreferences: (prefsUpdate) => {
    set((state) => {
      const updated = { ...state.consultantPreferences, ...prefsUpdate };
      try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving preferences:', e);
      }
      if (prefsUpdate.accent_color) {
        applyAccentColor(prefsUpdate.accent_color);
      }
      return { consultantPreferences: updated };
    });
  },

  exportFullBackupJson: () => {
    const state = get();
    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      consultant_profile: state.consultantProfile,
      consultant_preferences: state.consultantPreferences,
      clients: state.clients,
      cases: state.cases,
      commitments: state.commitments,
      notes: state.notes,
      followups: state.followups,
    };
    return JSON.stringify(backupData, null, 2);
  },

  // Master refresh
  refreshAll: async () => {
    await Promise.all([
      get().fetchDashboardSummary(),
      get().fetchClients(),
      get().fetchCases(),
      get().fetchCommitments(),
      get().fetchNotes(),
      get().fetchEmailAccounts(),
    ]);
    get().triggerLiveAlertsCheck();
  },
}));
