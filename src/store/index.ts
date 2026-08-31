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
} from '../types';

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
  createClient: (input: { name: string; company?: string; email?: string; phone?: string }) => Promise<Client>;
  updateClient: (input: { id: string; name: string; company?: string; email?: string; phone?: string; status: string }) => Promise<Client>;

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

  // Master refresh
  refreshAll: () => Promise<void>;
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

  // Clients
  clients: [],
  isLoadingClients: false,
  fetchClients: async () => {
    set({ isLoadingClients: true });
    try {
      const data = await api.getClients();
      set({ clients: data });
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      set({ isLoadingClients: false });
    }
  },
  createClient: async (input) => {
    const created = await api.createClient(input);
    set((state) => ({ clients: [...state.clients, created] }));
    get().fetchDashboardSummary();
    return created;
  },
  updateClient: async (input) => {
    const updated = await api.updateClient(input);
    set((state) => ({
      clients: state.clients.map((c) => (c.id === input.id ? { ...c, ...input, status: input.status as ClientStatus } : c)),
    }));
    return updated;
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
    return res;
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
  },
}));
