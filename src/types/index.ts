// Tipos TypeScript centrales para WorkDesk

export type ClientStatus = 'active' | 'inactive';
export type ClientComplexity = 'Alta' | 'Media' | 'Baja';

export interface Client {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  status: ClientStatus;
  
  // Diagnóstico Corporativo / Matriz de Complejidad
  category?: string | null;                // Financiera, Cooperativa, Educativo, Administrativo, etc.
  complexity_weighted?: ClientComplexity | null; // Complejidad Ponderada
  complexity_evaluated?: ClientComplexity | null; // Complejidad Evaluada
  ticket_avg?: number | null;              // Ticket Promedio
  branches_count?: number | null;          // Cantidad Sucursales
  employees_count?: number | null;         // Dotación de Empleados
  systems_count?: number | null;           // Cantidad de Sistemas
  has_it_department?: boolean | null;      // Depto. TI (Sí / No)

  created_at: string;
  updated_at?: string | null;
}

export type CaseStatus = 'open' | 'in_progress' | 'waiting' | 'closed';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface NextAction {
  description: string;
  due_date?: string | null;
  owner_type: 'me' | 'client' | 'third_party' | 'team';
  owner_name?: string | null;
  status: 'pending' | 'done';
}

export interface Case {
  id: string;
  client_id: string;
  client_name?: string | null;
  title: string;
  description?: string | null;
  status: CaseStatus;
  priority: CasePriority;
  next_action?: NextAction | null;
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
  condition?: string | null;
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

export type InboxItemStatus = 'inbox' | 'processed' | 'discarded';
export type InboxSuggestedType = 'task' | 'case' | 'followup' | 'note';

export interface InboxItem {
  id: string;
  content: string;
  suggested_type?: InboxSuggestedType;
  client_id?: string | null;
  client_name?: string | null;
  status: InboxItemStatus;
  processed_as?: 'case' | 'commitment' | 'followup' | 'note' | 'discarded' | null;
  created_at: string;
  processed_at?: string | null;
}

export type ActivityEventType =
  | 'case_created'
  | 'case_status_changed'
  | 'case_priority_changed'
  | 'next_action_updated'
  | 'commitment_created'
  | 'commitment_completed'
  | 'followup_created'
  | 'email_sent'
  | 'document_generated'
  | 'note_created';

export interface ActivityEvent {
  id: string;
  entity_type: 'case' | 'commitment' | 'client' | 'ticket' | 'followup' | 'document' | 'note' | 'inbox';
  entity_id: string;
  event_type: ActivityEventType;
  title: string;
  description?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  case_id?: string | null;
  case_title?: string | null;
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

export type ActiveTab =
  | 'my_day'
  | 'inbox'
  | 'waiting_on'
  | 'dashboard'
  | 'tickets'
  | 'cases'
  | 'commitments'
  | 'calendar'
  | 'clients'
  | 'notes'
  | 'emails'
  | 'reports'
  | 'settings';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
export type TicketCategory =
  | 'Soporte TI'
  | 'Incidencia'
  | 'Requerimiento'
  | 'Consultoría'
  | 'Facturación'
  | 'Infraestructura'
  | 'Configuración'
  | 'Otro';
export type TicketChannel = 'Email' | 'WhatsApp' | 'Teléfono' | 'Portal' | 'Reunión' | 'Otro';

export interface Ticket {
  id: string;
  ticket_number: string;
  client_id: string;
  client_name?: string | null;
  client_company?: string | null;
  case_id?: string | null;
  case_title?: string | null;
  title: string;
  description?: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  channel: TicketChannel;
  requester_name: string;
  requester_email?: string | null;
  assigned_to?: string | null;
  resolution?: string | null;
  sla_due_date?: string | null;
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
}

export interface CreateTicketInput {
  ticket_number?: string;
  client_id: string;
  case_id?: string;
  title: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  channel?: TicketChannel;
  requester_name: string;
  requester_email?: string;
  assigned_to?: string;
  resolution?: string;
  sla_due_date?: string;
}

export interface UpdateTicketInput {
  id: string;
  client_id?: string;
  case_id?: string | null;
  title?: string;
  description?: string | null;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  channel?: TicketChannel;
  requester_name?: string;
  requester_email?: string | null;
  assigned_to?: string | null;
  resolution?: string | null;
  sla_due_date?: string | null;
}

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

export type AccentColor = 'blue' | 'emerald' | 'indigo' | 'purple' | 'amber';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ConsultantProfile {
  name: string;
  role_title: string;
  company: string;
  email: string;
  phone: string;
  email_signature: string;
}

export interface ConsultantPreferences {
  inactive_client_days: number;
  enable_sound_alerts: boolean;
  enable_desktop_notifications: boolean;
  sync_interval_seconds: number;
  accent_color: AccentColor;
  theme_mode: ThemeMode;
  // Background Services & Watchdog
  enable_background_watchdog: boolean;
  enable_background_email_sync: boolean;
  enable_auto_drafts: boolean;
  background_check_interval_seconds: number;
  close_to_tray: boolean;
}

