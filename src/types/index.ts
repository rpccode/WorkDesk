// Tipos TypeScript centrales para WorkDesk

export type ClientStatus = 'active' | 'inactive';

export interface Client {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at?: string | null;
}

export type CaseStatus = 'open' | 'in_progress' | 'waiting' | 'closed';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Case {
  id: string;
  client_id: string;
  client_name?: string | null;
  title: string;
  description?: string | null;
  status: CaseStatus;
  priority: CasePriority;
  created_at: string;
  updated_at?: string | null;
  closed_at?: string | null;
}

export type CommitmentOwner = 'me' | 'client' | 'third_party';
export type CommitmentStatus = 'pending' | 'done' | 'overdue' | 'snoozed';

export interface Commitment {
  id: string;
  case_id: string;
  case_title?: string | null;
  client_name?: string | null;
  description: string;
  owner: CommitmentOwner;
  due_date?: string | null;
  status: CommitmentStatus;
  created_at: string;
  done_at?: string | null;
}

export type FollowupType = 'meeting' | 'call' | 'email' | 'note';

export interface Followup {
  id: string;
  case_id: string;
  type: FollowupType;
  summary: string;
  date: string;
  created_at: string;
}

export interface Note {
  id: string;
  case_id?: string | null;
  case_title?: string | null;
  client_name?: string | null;
  content: string;
  created_at: string;
}

export interface DashboardSummary {
  active_cases_count: number;
  critical_cases_count: number;
  pending_commitments_count: number;
  overdue_commitments_count: number;
  waiting_on_others_count: number;
  urgent_commitments: Commitment[];
  critical_cases: Case[];
}

export type ActiveTab = 'dashboard' | 'cases' | 'commitments' | 'clients' | 'notes' | 'emails' | 'reports';
