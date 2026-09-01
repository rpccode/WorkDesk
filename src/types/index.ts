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

export type EmailAccountProvider = 'smtp_imap' | 'microsoft_graph' | 'gmail_api';

export interface EmailAccount {
  id: string;
  name: string;
  email: string;
  provider: EmailAccountProvider;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  imap_host?: string | null;
  imap_port?: number | null;
  imap_user?: string | null;
  imap_password?: string | null;
  oauth_access_token?: string | null;
  oauth_refresh_token?: string | null;
  is_default: boolean;
  created_at: string;
  last_synced_at?: string | null;
}

export interface SaveEmailAccountInput {
  id?: string;
  name: string;
  email: string;
  provider: EmailAccountProvider;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  imap_host?: string;
  imap_port?: number;
  imap_user?: string;
  imap_password?: string;
  oauth_access_token?: string;
  oauth_refresh_token?: string;
  is_default?: boolean;
}

export interface CaseEmail {
  id: string;
  case_id: string;
  account_id?: string | null;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient: string;
  subject: string;
  body_text: string;
  body_html?: string | null;
  message_id?: string | null;
  date: string;
  created_at: string;
}

export interface SendEmailInput {
  account_id?: string;
  case_id: string;
  recipient: string;
  subject: string;
  body: string;
  auto_log_followup?: boolean;
}

export interface SendEmailResponse {
  success: boolean;
  email_id: string;
  message: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export interface SyncEmailsResult {
  new_emails_count: number;
  updated_cases_count: number;
  message: string;
}

export interface StartOAuthInput {
  provider: string; // 'microsoft' | 'google'
  custom_client_id?: string;
  custom_tenant_id?: string;
}

export interface OAuthLoginResult {
  success: boolean;
  account_id: string;
  name: string;
  email: string;
  provider: string;
  message: string;
}

export type NotificationType = 'critical' | 'warning' | 'email' | 'success' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  case_id?: string;
  commitment_id?: string;
  client_id?: string;
  is_read: boolean;
  created_at: string;
  action_label?: string;
  action_type?: 'open_case' | 'open_commitment' | 'open_email';
}

export interface AddNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  case_id?: string;
  commitment_id?: string;
  client_id?: string;
  action_label?: string;
  action_type?: 'open_case' | 'open_commitment' | 'open_email';
  show_toast?: boolean;
}
