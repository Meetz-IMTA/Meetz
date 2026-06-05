export type ReportReason =
  | 'inappropriate_behavior'
  | 'no_show'
  | 'harassment'
  | 'spam'
  | 'fake_profile'
  | 'other';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate_behavior: 'Comportement inapproprié',
  no_show: 'No-show (absent sans prévenir)',
  harassment: 'Harcèlement',
  spam: 'Spam / publicité',
  fake_profile: 'Faux profil',
  other: 'Autre',
};

export interface Report {
  id: string;
  reportedUserId: string;
  reason: ReportReason;
  details: string | null;
  eventId?: string;
  createdAt: Date;
}
