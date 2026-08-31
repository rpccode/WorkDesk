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
  createClient: (input: { name: string; company?: string; email?: string; phone?: string }) =>
    invoke<Client>('create_client', { input }),
  updateClient: (input: { id: string; name: string; company?: string; email?: string; phone?: string; status: string }) =>
    invoke<Client>('update_client', { input }),

  // Cases
  getCases: (statusFilter?: string) =>
    invoke<Case[]>('get_cases', { statusFilter }),
  createCase: (input: { client_id: string; title: string; description?: string; priority?: string }) =>
    invoke<Case>('create_case', { input }),
  updateCase: (input: { id: string; title: string; description?: string; status: string; priority: string }) =>
    invoke<Case>('update_case', { input }),
  closeCase: (id: string) => invoke<void>('close_case', { id }),

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
};
