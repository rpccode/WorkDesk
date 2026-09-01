import { create } from 'zustand';
import { api } from '../api/tauri';
import type {
  Client,
  ClientStatus,
  Case,
  Commitment,
  Followup,
  Note,
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
  DashboardSummary,
  ActiveTab,
  AppNotification,
  AddNotificationInput,
  ConsultantProfile,
  ConsultantPreferences,
  InboxItem,
  InboxSuggestedType,
  ActivityEvent,
  NextAction,
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
const CLIENTS_CACHE_KEY = 'workdesk_clients_cache_v1';
const CASES_CACHE_KEY = 'workdesk_cases_cache_v1';
const COMMITMENTS_CACHE_KEY = 'workdesk_commitments_cache_v1';
const NOTES_CACHE_KEY = 'workdesk_notes_cache_v1';
const TICKETS_STORAGE_KEY = 'workdesk_tickets_v1';
const EMAIL_ACCOUNTS_CACHE_KEY = 'workdesk_email_accounts_cache_v1';
const DASHBOARD_CACHE_KEY = 'workdesk_dashboard_cache_v1';
const NOTIFICATIONS_CACHE_KEY = 'workdesk_notifications_cache_v1';
const INBOX_STORAGE_KEY = 'workdesk_inbox_items_v1';
const ACTIVITIES_STORAGE_KEY = 'workdesk_activities_v1';
const CASES_NEXT_ACTIONS_KEY = 'workdesk_cases_next_actions_v1';

function getStoredCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Error saving cache for ${key}:`, e);
  }
}

function getStoredInboxItems(): InboxItem[] {
  return getStoredCache<InboxItem[]>(INBOX_STORAGE_KEY, []);
}

function saveStoredInboxItems(items: InboxItem[]) {
  saveStoredCache(INBOX_STORAGE_KEY, items);
}

function getStoredNextActions(): Record<string, NextAction> {
  return getStoredCache<Record<string, NextAction>>(CASES_NEXT_ACTIONS_KEY, {});
}

function saveStoredNextActions(actions: Record<string, NextAction>) {
  saveStoredCache(CASES_NEXT_ACTIONS_KEY, actions);
}

function getStoredActivities(): ActivityEvent[] {
  return getStoredCache<ActivityEvent[]>(ACTIVITIES_STORAGE_KEY, []);
}

function saveStoredActivities(events: ActivityEvent[]) {
  saveStoredCache(ACTIVITIES_STORAGE_KEY, events);
}

function getStoredTickets(): Ticket[] {
  return getStoredCache<Ticket[]>(TICKETS_STORAGE_KEY, []);
}

function saveStoredTickets(tickets: Ticket[]) {
  saveStoredCache(TICKETS_STORAGE_KEY, tickets);
}

function computeLocalDashboardSummary(
  _clients: Client[],
  cases: Case[],
  commitments: Commitment[]
): DashboardSummary {
  const activeCases = cases.filter((c) => c.status !== 'closed');
  const criticalCases = cases.filter((c) => c.priority === 'critical' && c.status !== 'closed');
  const pendingCommitments = commitments.filter((c) => c.status !== 'done');
  const today = new Date().toISOString().split('T')[0];
  const overdueCommitments = pendingCommitments.filter((c) => c.due_date && c.due_date < today);
  const waitingCommitments = commitments.filter((c) => c.owner !== 'me' && c.status !== 'done');

  return {
    active_cases_count: activeCases.length,
    critical_cases_count: criticalCases.length,
    pending_commitments_count: pendingCommitments.length,
    overdue_commitments_count: overdueCommitments.length,
    waiting_on_others_count: waitingCommitments.length,
    urgent_commitments: overdueCommitments.slice(0, 5),
    critical_cases: criticalCases.slice(0, 5),
  };
}

function enrichTicket(ticket: Ticket, clients: Client[], cases: Case[]): Ticket {
  const client = clients.find((c) => c.id === ticket.client_id);
  const foundCase = ticket.case_id ? cases.find((cs) => cs.id === ticket.case_id) : undefined;
  return {
    ...ticket,
    client_name: ticket.client_name || (client ? client.name : undefined),
    client_company: ticket.client_company || (client ? client.company : undefined),
    case_title: ticket.case_title || (foundCase ? foundCase.title : undefined),
  };
}

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
  deleteClient: (id: string) => Promise<void>;
  deleteAllClients: () => Promise<void>;

  // Cases
  cases: Case[];
  caseFilter: string;
  setCaseFilter: (filter: string) => void;
  isLoadingCases: boolean;
  fetchCases: () => Promise<void>;
  createCase: (input: { client_id: string; title: string; description?: string; priority?: string; next_action?: NextAction | null }) => Promise<Case>;
  updateCase: (input: { id: string; client_id?: string; title: string; description?: string; status: string; priority: string; next_action?: NextAction | null }) => Promise<Case>;
  updateCaseNextAction: (caseId: string, nextAction: NextAction | null) => void;
  closeCase: (id: string) => Promise<void>;

  // Inbox GTD
  inboxItems: InboxItem[];
  addInboxItem: (content: string, suggestedType?: InboxSuggestedType, clientId?: string | null) => InboxItem;
  updateInboxItem: (id: string, updates: Partial<InboxItem>) => void;
  deleteInboxItem: (id: string) => void;
  processInboxItem: (id: string, target: 'case' | 'commitment' | 'followup' | 'note' | 'discarded', targetData?: any) => Promise<any>;

  // Activity Log
  activityEvents: ActivityEvent[];
  logActivity: (event: Omit<ActivityEvent, 'id' | 'created_at'>) => void;

  // Tickets
  tickets: Ticket[];
  isLoadingTickets: boolean;
  fetchTickets: () => Promise<void>;
  createTicket: (input: CreateTicketInput) => Promise<Ticket>;
  updateTicket: (input: UpdateTicketInput) => Promise<Ticket>;
  deleteTicket: (id: string) => Promise<void>;
  deleteAllTickets: () => Promise<number>;
  bulkCreateTickets: (inputs: CreateTicketInput[]) => Promise<Ticket[]>;

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
  notifications: getStoredCache<AppNotification[]>(NOTIFICATIONS_CACHE_KEY, []),
  activeToasts: [],

  // Clients
  clients: getStoredCache<Client[]>(CLIENTS_CACHE_KEY, []),
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
      saveStoredCache(CLIENTS_CACHE_KEY, merged);
      set({ clients: merged });
    } catch (err) {
      console.error('Error fetching clients (using local cache):', err);
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
    set((state) => {
      const updated = [...state.clients, fullClient];
      saveStoredCache(CLIENTS_CACHE_KEY, updated);
      return { clients: updated };
    });
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
    set((state) => {
      const updatedList = state.clients.map((c) => (c.id === input.id ? fullClient : c));
      saveStoredCache(CLIENTS_CACHE_KEY, updatedList);
      return { clients: updatedList };
    });
    return fullClient;
  },
  deleteClient: async (id: string) => {
    try {
      await api.deleteClient(id);
    } catch (_) {}
    const meta = getStoredClientsMetadata();
    delete meta[id];
    localStorage.setItem(CLIENTS_METADATA_KEY, JSON.stringify(meta));
    set((state) => {
      const filtered = state.clients.filter((c) => c.id !== id);
      saveStoredCache(CLIENTS_CACHE_KEY, filtered);
      return { clients: filtered };
    });
    get().fetchDashboardSummary();
  },
  deleteAllClients: async () => {
    try {
      await api.deleteAllClients();
    } catch (err) {
      console.warn('Fallback deleting clients one by one:', err);
      const current = get().clients;
      for (const c of current) {
        try {
          await api.deleteClient(c.id);
        } catch (_) {}
      }
    }
    localStorage.removeItem(CLIENTS_METADATA_KEY);
    saveStoredCache(CLIENTS_CACHE_KEY, []);
    set({ clients: [] });
    get().fetchDashboardSummary();
  },

  // Cases
  cases: (getStoredCache<Case[]>(CASES_CACHE_KEY, []) || []).map((c) => {
    const nextMap = getStoredNextActions();
    return { ...c, next_action: c.next_action || nextMap[c.id] || null };
  }),
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
      const nextMap = getStoredNextActions();
      const enriched = (data || []).map((c) => ({
        ...c,
        next_action: c.next_action || nextMap[c.id] || null,
      }));
      if (filter === 'all') {
        saveStoredCache(CASES_CACHE_KEY, enriched);
      }
      set({ cases: enriched });
    } catch (err) {
      console.error('Error fetching cases (using local cache):', err);
    } finally {
      set({ isLoadingCases: false });
    }
  },
  createCase: async (input) => {
    const created = await api.createCase(input);
    let finalCase = created;
    if (input.next_action) {
      const nextMap = getStoredNextActions();
      nextMap[created.id] = input.next_action;
      saveStoredNextActions(nextMap);
      finalCase = { ...created, next_action: input.next_action };
    }
    set((state) => {
      const updated = [finalCase, ...state.cases];
      saveStoredCache(CASES_CACHE_KEY, updated);
      return { cases: updated };
    });
    get().logActivity({
      entity_type: 'case',
      entity_id: created.id,
      event_type: 'case_created',
      title: `Caso creado: "${created.title}"`,
      case_id: created.id,
      case_title: created.title,
      client_id: created.client_id,
    });
    get().fetchDashboardSummary();
    return finalCase;
  },
  updateCase: async (input) => {
    const updated = await api.updateCase(input);
    let finalCase = updated;
    if (input.next_action !== undefined) {
      const nextMap = getStoredNextActions();
      if (input.next_action) {
        nextMap[input.id] = input.next_action;
      } else {
        delete nextMap[input.id];
      }
      saveStoredNextActions(nextMap);
      finalCase = { ...updated, next_action: input.next_action };
    }
    set((state) => {
      const updatedList = state.cases.map((c) => (c.id === input.id ? { ...c, ...finalCase } : c));
      saveStoredCache(CASES_CACHE_KEY, updatedList);
      return { cases: updatedList };
    });
    get().fetchDashboardSummary();
    return finalCase;
  },
  updateCaseNextAction: (caseId, nextAction) => {
    const nextMap = getStoredNextActions();
    if (nextAction) {
      nextMap[caseId] = nextAction;
    } else {
      delete nextMap[caseId];
    }
    saveStoredNextActions(nextMap);

    const targetCase = get().cases.find((c) => c.id === caseId);

    set((state) => {
      const updatedList = state.cases.map((c) =>
        c.id === caseId ? { ...c, next_action: nextAction } : c
      );
      saveStoredCache(CASES_CACHE_KEY, updatedList);
      return { cases: updatedList };
    });

    if (nextAction && targetCase) {
      get().logActivity({
        entity_type: 'case',
        entity_id: caseId,
        event_type: 'next_action_updated',
        title: `Próxima acción en "${targetCase.title}": ${nextAction.description}`,
        case_id: caseId,
        case_title: targetCase.title,
        client_id: targetCase.client_id,
      });
    }
  },
  closeCase: async (id) => {
    await api.closeCase(id);
    const targetCase = get().cases.find((c) => c.id === id);
    set((state) => {
      const updatedList: Case[] = state.cases.map((c) =>
        c.id === id ? { ...c, status: 'closed' as const, closed_at: new Date().toISOString() } : c
      );
      saveStoredCache(CASES_CACHE_KEY, updatedList);
      return { cases: updatedList };
    });
    if (targetCase) {
      get().logActivity({
        entity_type: 'case',
        entity_id: id,
        event_type: 'case_status_changed',
        title: `Caso cerrado: "${targetCase.title}"`,
        case_id: id,
        case_title: targetCase.title,
        client_id: targetCase.client_id,
      });
    }
    get().fetchDashboardSummary();
  },

  // Inbox GTD
  inboxItems: getStoredInboxItems(),
  addInboxItem: (content, suggestedType = 'task', clientId = null) => {
    const clients = get().clients;
    const client = clientId ? clients.find((c) => c.id === clientId) : null;
    const newItem: InboxItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      content: content.trim(),
      suggested_type: suggestedType,
      client_id: clientId,
      client_name: client?.name || null,
      status: 'inbox',
      created_at: new Date().toISOString(),
    };

    const updated = [newItem, ...get().inboxItems];
    saveStoredInboxItems(updated);
    set({ inboxItems: updated });
    return newItem;
  },
  updateInboxItem: (id, updates) => {
    const updated = get().inboxItems.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    saveStoredInboxItems(updated);
    set({ inboxItems: updated });
  },
  deleteInboxItem: (id) => {
    const updated = get().inboxItems.filter((item) => item.id !== id);
    saveStoredInboxItems(updated);
    set({ inboxItems: updated });
  },
  processInboxItem: async (id, target, targetData) => {
    const item = get().inboxItems.find((i) => i.id === id);
    if (!item) return;

    const now = new Date().toISOString();
    let result: any = null;

    if (target === 'case' && targetData) {
      result = await get().createCase({
        client_id: targetData.client_id || item.client_id || get().clients[0]?.id || '',
        title: targetData.title || item.content.substring(0, 80),
        description: item.content,
        priority: targetData.priority || 'medium',
      });
    } else if (target === 'commitment' && targetData) {
      result = await get().createCommitment({
        case_id: targetData.case_id,
        description: item.content,
        owner: targetData.owner || 'me',
        due_date: targetData.due_date,
      });
    } else if (target === 'note' && targetData) {
      result = await get().createNote({
        case_id: targetData.case_id,
        content: item.content,
      });
    } else if (target === 'followup' && targetData) {
      result = await get().createFollowup({
        case_id: targetData.case_id,
        type: targetData.type || 'call',
        summary: item.content,
        date: targetData.date || now.split('T')[0],
      });
    }

    const updated = get().inboxItems.map((i) =>
      i.id === id
        ? {
            ...i,
            status: target === 'discarded' ? ('discarded' as const) : ('processed' as const),
            processed_as: target,
            processed_at: now,
          }
        : i
    );
    saveStoredInboxItems(updated);
    set({ inboxItems: updated });
    return result;
  },

  // Activity Log
  activityEvents: getStoredActivities(),
  logActivity: (event) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    const list = [newEvent, ...get().activityEvents].slice(0, 300);
    saveStoredActivities(list);
    set({ activityEvents: list });
  },

  // Tickets
  tickets: getStoredTickets(),
  isLoadingTickets: false,
  fetchTickets: async () => {
    set({ isLoadingTickets: true });
    try {
      let data: Ticket[] = [];
      try {
        data = await api.getTickets();
      } catch {
        data = getStoredTickets();
      }
      const clients = get().clients;
      const cases = get().cases;
      const enriched = (data || []).map((t) => enrichTicket(t, clients, cases));
      saveStoredTickets(enriched);
      set({ tickets: enriched });
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      set({ isLoadingTickets: false });
    }
  },
  createTicket: async (input) => {
    const clients = get().clients;
    const cases = get().cases;
    const existingCount = get().tickets.length + 1;
    const autoNumber = input.ticket_number || `TCK-${String(existingCount).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const newTicket: Ticket = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ticket_number: autoNumber,
      client_id: input.client_id,
      case_id: input.case_id || null,
      title: input.title,
      description: input.description || null,
      category: input.category || 'Soporte TI',
      priority: input.priority || 'medium',
      status: input.status || 'open',
      channel: input.channel || 'Email',
      requester_name: input.requester_name,
      requester_email: input.requester_email || null,
      assigned_to: input.assigned_to || null,
      resolution: input.resolution || null,
      sla_due_date: input.sla_due_date || null,
      created_at: now,
      updated_at: now,
      resolved_at: input.status === 'resolved' || input.status === 'closed' ? now : null,
      closed_at: input.status === 'closed' ? now : null,
    };

    let finalTicket = newTicket;
    try {
      const created = await api.createTicket(input);
      if (created) finalTicket = created;
    } catch (e) {
      console.warn('Backend ticket API fallback to local store:', e);
    }

    const enriched = enrichTicket(finalTicket, clients, cases);
    set((state) => {
      const updated = [enriched, ...state.tickets];
      saveStoredTickets(updated);
      return { tickets: updated };
    });
    return enriched;
  },
  updateTicket: async (input) => {
    const clients = get().clients;
    const cases = get().cases;
    const now = new Date().toISOString();

    let finalTicket: Ticket | undefined;
    try {
      finalTicket = await api.updateTicket(input);
    } catch (e) {
      console.warn('Backend update ticket fallback to local store:', e);
    }

    set((state) => {
      const updated = state.tickets.map((t) => {
        if (t.id === input.id) {
          const merged: Ticket = {
            ...t,
            ...input,
            updated_at: now,
            resolved_at: input.status === 'resolved' || input.status === 'closed' ? (t.resolved_at || now) : null,
            closed_at: input.status === 'closed' ? (t.closed_at || now) : null,
          };
          return enrichTicket(finalTicket || merged, clients, cases);
        }
        return t;
      });
      saveStoredTickets(updated);
      return { tickets: updated };
    });

    return get().tickets.find((t) => t.id === input.id)!;
  },
  deleteTicket: async (id) => {
    try {
      await api.deleteTicket(id);
    } catch (e) {
      console.warn('Backend delete ticket fallback:', e);
    }
    set((state) => {
      const filtered = state.tickets.filter((t) => t.id !== id);
      saveStoredTickets(filtered);
      return { tickets: filtered };
    });
  },
  deleteAllTickets: async () => {
    const list = get().tickets;
    const count = list.length;
    for (const t of list) {
      try {
        await api.deleteTicket(t.id);
      } catch (e) {
        console.warn('Backend delete ticket fallback:', e);
      }
    }
    set({ tickets: [] });
    saveStoredTickets([]);
    return count;
  },
  bulkCreateTickets: async (inputs) => {
    const clients = get().clients;
    const cases = get().cases;
    const now = new Date().toISOString();
    let currentCount = get().tickets.length;

    const newTickets: Ticket[] = inputs.map((input) => {
      currentCount++;
      const autoNumber = input.ticket_number || `TCK-${String(currentCount).padStart(3, '0')}`;
      const ticket: Ticket = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ticket_number: autoNumber,
        client_id: input.client_id,
        case_id: input.case_id || null,
        title: input.title,
        description: input.description || null,
        category: input.category || 'Soporte TI',
        priority: input.priority || 'medium',
        status: input.status || 'open',
        channel: input.channel || 'Email',
        requester_name: input.requester_name,
        requester_email: input.requester_email || null,
        assigned_to: input.assigned_to || null,
        resolution: input.resolution || null,
        sla_due_date: input.sla_due_date || null,
        created_at: now,
        updated_at: now,
        resolved_at: input.status === 'resolved' || input.status === 'closed' ? now : null,
        closed_at: input.status === 'closed' ? now : null,
      };
      return enrichTicket(ticket, clients, cases);
    });

    try {
      await api.bulkCreateTickets(inputs);
    } catch (e) {
      console.warn('Backend bulk create tickets fallback to local store:', e);
    }

    set((state) => {
      const combined = [...newTickets, ...state.tickets];
      saveStoredTickets(combined);
      return { tickets: combined };
    });
    return newTickets;
  },

  // Commitments
  commitments: getStoredCache<Commitment[]>(COMMITMENTS_CACHE_KEY, []),
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
      if (!caseId && filter === 'all') {
        saveStoredCache(COMMITMENTS_CACHE_KEY, data);
      }
      set({ commitments: data });
    } catch (err) {
      console.error('Error fetching commitments (using local cache):', err);
    } finally {
      set({ isLoadingCommitments: false });
    }
  },
  createCommitment: async (input) => {
    const created = await api.createCommitment(input);
    set((state) => {
      const updated = [created, ...state.commitments];
      saveStoredCache(COMMITMENTS_CACHE_KEY, updated);
      return { commitments: updated };
    });
    get().fetchDashboardSummary();
    return created;
  },
  markCommitmentDone: async (id) => {
    await api.markCommitmentDone(id);
    set((state) => {
      const updated: Commitment[] = state.commitments.map((c) =>
        c.id === id ? { ...c, status: 'done' as const, done_at: new Date().toISOString() } : c
      );
      saveStoredCache(COMMITMENTS_CACHE_KEY, updated);
      return { commitments: updated };
    });
    get().fetchDashboardSummary();
  },
  snoozeCommitment: async (id, newDueDate) => {
    await api.snoozeCommitment(id, newDueDate);
    set((state) => {
      const updated: Commitment[] = state.commitments.map((c) =>
        c.id === id ? { ...c, due_date: newDueDate, status: 'pending' as const } : c
      );
      saveStoredCache(COMMITMENTS_CACHE_KEY, updated);
      return { commitments: updated };
    });
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
  notes: getStoredCache<Note[]>(NOTES_CACHE_KEY, []),
  isLoadingNotes: false,
  fetchNotes: async (caseId) => {
    set({ isLoadingNotes: true });
    try {
      const data = await api.getNotes(caseId);
      if (!caseId) {
        saveStoredCache(NOTES_CACHE_KEY, data);
      }
      set({ notes: data });
    } catch (err) {
      console.error('Error fetching notes (using local cache):', err);
    } finally {
      set({ isLoadingNotes: false });
    }
  },
  createNote: async (input) => {
    const created = await api.createNote(input);
    set((state) => {
      const updated = [created, ...state.notes];
      saveStoredCache(NOTES_CACHE_KEY, updated);
      return { notes: updated };
    });
    return created;
  },
  deleteNote: async (id) => {
    await api.deleteNote(id);
    set((state) => {
      const updated = state.notes.filter((n) => n.id !== id);
      saveStoredCache(NOTES_CACHE_KEY, updated);
      return { notes: updated };
    });
  },

  // Dashboard
  dashboardSummary:
    getStoredCache<DashboardSummary | null>(DASHBOARD_CACHE_KEY, null) ||
    computeLocalDashboardSummary(
      getStoredCache<Client[]>(CLIENTS_CACHE_KEY, []),
      getStoredCache<Case[]>(CASES_CACHE_KEY, []),
      getStoredCache<Commitment[]>(COMMITMENTS_CACHE_KEY, [])
    ),
  isLoadingDashboard: false,
  fetchDashboardSummary: async () => {
    set({ isLoadingDashboard: true });
    try {
      const data = await api.getDashboardSummary();
      if (data) {
        saveStoredCache(DASHBOARD_CACHE_KEY, data);
        set({ dashboardSummary: data });
      }
    } catch (err) {
      console.error('Error fetching dashboard summary (computing local):', err);
      const computed = computeLocalDashboardSummary(get().clients, get().cases, get().commitments);
      saveStoredCache(DASHBOARD_CACHE_KEY, computed);
      set({ dashboardSummary: computed });
    } finally {
      set({ isLoadingDashboard: false });
    }
  },

  // Email Accounts & Synchronization
  emailAccounts: getStoredCache<import('../types').EmailAccount[]>(EMAIL_ACCOUNTS_CACHE_KEY, []),
  isLoadingEmailAccounts: false,
  fetchEmailAccounts: async () => {
    set({ isLoadingEmailAccounts: true });
    try {
      const data = await api.getEmailAccounts();
      saveStoredCache(EMAIL_ACCOUNTS_CACHE_KEY, data);
      set({ emailAccounts: data });
    } catch (err) {
      console.error('Error fetching email accounts (using local cache):', err);
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
    set((state) => {
      const updated = state.emailAccounts.filter((a) => a.id !== id);
      saveStoredCache(EMAIL_ACCOUNTS_CACHE_KEY, updated);
      return { emailAccounts: updated };
    });
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
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    set((state) => {
      const updated = [newNotif, ...state.notifications];
      saveStoredCache(NOTIFICATIONS_CACHE_KEY, updated);
      return {
        notifications: updated,
        activeToasts: input.show_toast !== false ? [newNotif, ...state.activeToasts.slice(0, 3)] : state.activeToasts,
      };
    });

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
    set((state) => {
      const updated = state.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      saveStoredCache(NOTIFICATIONS_CACHE_KEY, updated);
      return { notifications: updated };
    });
  },

  markAllNotificationsRead: () => {
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, is_read: true }));
      saveStoredCache(NOTIFICATIONS_CACHE_KEY, updated);
      return { notifications: updated };
    });
  },

  clearAllNotifications: () => {
    saveStoredCache(NOTIFICATIONS_CACHE_KEY, []);
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
      tickets: state.tickets,
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
      get().fetchTickets(),
      get().fetchCommitments(),
      get().fetchNotes(),
      get().fetchEmailAccounts(),
    ]);
    get().triggerLiveAlertsCheck();
  },
}));
