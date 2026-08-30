/**
 * Shared domain types between API and frontend.
 * These mirror the Prisma models but are decoupled so the frontend
 * never depends directly on Prisma client internals.
 */

// ── Enums ──────────────────────────────────────────────

export type UserRole = 'PRINCIPAL' | 'SALES' | 'ADMIN' | 'SALES_REPRESENTATIVE' | 'ADMINISTRATOR';

export type LeadSource =
  | 'Instagram'
  | 'Google'
  | 'Referral'
  | 'Website'
  | 'Direct'
  | 'Walk-in';

export type LeadPriority = 'HOT' | 'WARM' | 'COLD';

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'CALL_BACK'
  | 'MEETING'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export type ActivityType =
  | 'CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'NOTE'
  | 'MEETING'
  | 'STAGE_CHANGE'
  | 'FILE';

export type MeetingType =
  | 'VideoCall'
  | 'StudioMeeting'
  | 'SiteVisit'
  | 'PhoneCall';

export type FileKind = 'pdf' | 'dwg' | 'img' | 'xls';

export type ProposalStatus = 'Sent' | 'Viewed' | 'Accepted' | 'Rejected';

export type LostReason =
  | 'Budget mismatch'
  | 'Went with another firm'
  | "Timeline didn't work"
  | 'Stopped responding'
  | 'Project dropped';

// ── Core Entities ──────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  initials?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  projectType: string;
  projectDescription?: string | null;
  location: string;
  budgetLakhs: number;
  source: LeadSource;
  priority: LeadPriority;
  stage: LeadStage;
  phone?: string | null;
  email?: string | null;
  ownerId: string;
  createdAt: string;
  stageChangedAt?: string | null;
  wonAt?: string | null;
  lostReason?: string | null;
  lostNote?: string | null;
  callBackAt?: string | null;
  callBackNote?: string | null;
  meetingUrl?: string | null;
  totalCallDurationSecs?: number;
  winProbability: number;
  tags: string[];
  owner?: Partial<User> | null;
  _count?: Record<string, number>;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  text?: string | null;
  quote?: string | null;
  durationSecs?: number | null;
  createdById: string;
  createdAt: string;
}

export interface Note {
  id: string;
  leadId: string;
  text: string;
  pinned: boolean;
  createdById: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  leadId: string;
  title: string;
  type: MeetingType;
  scheduledAt: string;
  durationMins: number;
  completed: boolean;
  meetingUrl?: string | null;
  createdBy: User;
  createdAt: string;
}

export interface FileAsset {
  id: string;
  leadId: string;
  fileName: string;
  kind: FileKind;
  sizeBytes: number;
  storagePath: string;
  uploadedById: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  leadId: string;
  version: number;
  amountLakhs: number;
  sentAt: string;
  viewCount: number;
  lastViewedAt?: string | null;
  status: ProposalStatus;
}

// ── Auth ───────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// ── API Shapes ─────────────────────────────────────────

export interface LeadWithRelations extends Lead {
  owner: User;
  activities: Activity[];
  notes: Note[];
  meetings: Meeting[];
  fileAssets: FileAsset[];
  proposal?: Proposal | null;
}

export interface AnalyticsOverview {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  pipelineValueLakhs: number;
  weightedForecastLakhs: number;
  winLoss: { won: number; lost: number; stalled: number };
  funnel: { stage: LeadStage; count: number; valueLakhs: number }[];
  bySource?: { source: string; count: number }[];
  todaysMeetings?: number;
}

// ── Utility Types ──────────────────────────────────────

export type Nullable<T> = T | null;

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
