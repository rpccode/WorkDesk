import { invoke } from '@tauri-apps/api/core';
import type {
  Client,
  Case,
  Commitment,
  Followup,
  Note,
  DashboardSummary,
} from '../types';

// Wrapper con fallback o logs claros de error
export const api = {
  // Clients
  getClients: () => invoke<Client[]>('get_clients'),
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
  }) => invoke<Client>('create_client', { input }),
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
  }) => invoke<Client>('update_client', { input }),
  deleteClient: (id: string) => invoke<boolean>('delete_client', { id }),
  deleteAllClients: () => invoke<number>('delete_all_clients'),

  // Cases
  getCases: (statusFilter?: string) =>
    invoke<Case[]>('get_cases', { statusFilter }),
  createCase: (input: { client_id: string; title: string; description?: string; priority?: string }) =>
    invoke<Case>('create_case', { input }),
  updateCase: (input: { id: string; client_id?: string; title: string; description?: string; status: string; priority: string }) =>
    invoke<Case>('update_case', { input }),
  closeCase: (id: string) => invoke<void>('close_case', { id }),

  // Tickets
  getTickets: () => invoke<import('../types').Ticket[]>('get_tickets'),
  createTicket: (input: import('../types').CreateTicketInput) =>
    invoke<import('../types').Ticket>('create_ticket', { input }),
  updateTicket: (input: import('../types').UpdateTicketInput) =>
    invoke<import('../types').Ticket>('update_ticket', { input }),
  deleteTicket: (id: string) => invoke<void>('delete_ticket', { id }),
  bulkCreateTickets: (inputs: import('../types').CreateTicketInput[]) =>
    invoke<import('../types').Ticket[]>('bulk_create_tickets', { inputs }),

  // Commitments
  getCommitments: (caseId?: string, statusFilter?: string) =>
    invoke<Commitment[]>('get_commitments', { caseId, statusFilter }),
  createCommitment: (input: { case_id: string; description: string; owner?: string; due_date?: string }) =>
    invoke<Commitment>('create_commitment', { input }),
  markCommitmentDone: (id: string) => invoke<void>('mark_commitment_done', { id }),
  snoozeCommitment: (id: string, newDueDate: string) =>
    invoke<void>('snooze_commitment', { id, newDueDate }),

  // Followups
  getFollowups: (caseId: string) => invoke<Followup[]>('get_followups', { caseId }),
  createFollowup: (input: { case_id: string; type?: string; summary: string; date?: string }) =>
    invoke<Followup>('create_followup', { input }),

  // Notes
  getNotes: (caseId?: string) => invoke<Note[]>('get_notes', { caseId }),
  createNote: (input: { case_id?: string; content: string }) =>
    invoke<Note>('create_note', { input }),
  deleteNote: (id: string) => invoke<void>('delete_note', { id }),

  // Dashboard
  getDashboardSummary: () => invoke<DashboardSummary>('get_dashboard_summary'),

  // Email Accounts & Synchronization
  getEmailAccounts: () => invoke<import('../types').EmailAccount[]>('get_email_accounts'),
  saveEmailAccount: (input: import('../types').SaveEmailAccountInput) =>
    invoke<import('../types').EmailAccount>('save_email_account', { input }),
  deleteEmailAccount: (id: string) => invoke<void>('delete_email_account', { id }),
  testEmailConnection: (input: import('../types').SaveEmailAccountInput) =>
    invoke<import('../types').TestConnectionResponse>('test_email_connection', { input }),
  sendEmailDirect: (input: import('../types').SendEmailInput) =>
    invoke<import('../types').SendEmailResponse>('send_email_direct', { input }),
  getCaseEmails: (caseId: string) =>
    invoke<import('../types').CaseEmail[]>('get_case_emails', { caseId }),
  syncInboxEmails: () => invoke<import('../types').SyncEmailsResult>('sync_inbox_emails'),
  startOAuthLogin: (input: import('../types').StartOAuthInput) =>
    invoke<import('../types').OAuthLoginResult>('start_oauth_login', { input }),

  // Window Controls & Mini Desktop Widget
  toggleMiniWidget: (enable: boolean) => invoke<void>('toggle_mini_widget', { enable }),
  hideToTray: () => invoke<void>('hide_to_tray'),
  showMainWindow: () => invoke<void>('show_main_window'),
};
