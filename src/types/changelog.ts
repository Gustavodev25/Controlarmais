export type ChangelogTag =
  | 'feature'
  | 'improvement'
  | 'fix'
  | 'security'
  | 'performance'
  | 'breaking';

export type ChangelogStatus = 'draft' | 'published';
export type ChangelogAudience = 'admins' | 'all';
export type ChangelogNotificationAction = 'close' | 'view';

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  content: string;
  imageUrl?: string;
  tags: ChangelogTag[];
  status: ChangelogStatus;
  createdAt: string;
  updatedAt?: string;
  lastNotificationAt?: string | null;
  lastNotificationAudience?: ChangelogAudience | null;
}

export type ChangelogInput = Omit<
  ChangelogEntry,
  'id' | 'createdAt' | 'updatedAt' | 'lastNotificationAt' | 'lastNotificationAudience'
>;
