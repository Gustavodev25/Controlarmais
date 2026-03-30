import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  ChangelogAudience,
  ChangelogEntry,
  ChangelogInput,
  ChangelogNotificationAction,
  ChangelogStatus,
  ChangelogTag,
} from '../types/changelog';

const CHANGELOGS_COLLECTION = 'changelogs';
const USER_CHANGELOG_STATE_COLLECTION = 'changelogStates';
const VALID_TAGS: ChangelogTag[] = ['feature', 'improvement', 'fix', 'security', 'performance', 'breaking'];

function normalizeIsoDate(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeTags(value: unknown): ChangelogTag[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is ChangelogTag => typeof tag === 'string' && VALID_TAGS.includes(tag as ChangelogTag));
}

function normalizeStatus(value: unknown): ChangelogStatus {
  return value === 'published' ? 'published' : 'draft';
}

export function normalizeChangelogEntry(id: string, data: Record<string, unknown>): ChangelogEntry {
  return {
    id,
    version: typeof data.version === 'string' ? data.version : '',
    title: typeof data.title === 'string' ? data.title : '',
    content: typeof data.content === 'string' ? data.content : '',
    imageUrl: typeof data.imageUrl === 'string' && data.imageUrl.trim() ? data.imageUrl : undefined,
    tags: normalizeTags(data.tags),
    status: normalizeStatus(data.status),
    createdAt: normalizeIsoDate(data.createdAt),
    updatedAt: data.updatedAt ? normalizeIsoDate(data.updatedAt) : undefined,
    lastNotificationAt: data.lastNotificationAt ? normalizeIsoDate(data.lastNotificationAt) : null,
    lastNotificationAudience:
      data.lastNotificationAudience === 'admins' || data.lastNotificationAudience === 'all'
        ? data.lastNotificationAudience
        : null,
  };
}

export async function fetchChangelogEntries(): Promise<ChangelogEntry[]> {
  const snapshot = await getDocs(query(collection(db, CHANGELOGS_COLLECTION), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((entryDoc) => normalizeChangelogEntry(entryDoc.id, entryDoc.data()));
}

export function listenToChangelogEntries(onChange: (entries: ChangelogEntry[]) => void): () => void {
  const changelogQuery = query(collection(db, CHANGELOGS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(changelogQuery, (snapshot) => {
    onChange(snapshot.docs.map((entryDoc) => normalizeChangelogEntry(entryDoc.id, entryDoc.data())));
  });
}

export function listenToPendingChangelogCandidates(onChange: (entries: ChangelogEntry[]) => void): () => void {
  const pendingQuery = query(
    collection(db, CHANGELOGS_COLLECTION),
    orderBy('lastNotificationAt', 'desc'),
    limit(10),
  );

  return onSnapshot(pendingQuery, (snapshot) => {
    onChange(snapshot.docs.map((entryDoc) => normalizeChangelogEntry(entryDoc.id, entryDoc.data())));
  });
}

export async function saveChangelogEntry(input: ChangelogInput, existingId?: string): Promise<ChangelogEntry> {
  const now = new Date().toISOString();
  const entryRef = existingId ? doc(db, CHANGELOGS_COLLECTION, existingId) : doc(collection(db, CHANGELOGS_COLLECTION));

  const payload = {
    version: input.version,
    title: input.title,
    content: input.content,
    imageUrl: input.imageUrl ?? null,
    tags: input.tags,
    status: input.status,
    updatedAt: now,
  };

  if (existingId) {
    await setDoc(entryRef, payload, { merge: true });
  } else {
    await setDoc(entryRef, {
      ...payload,
      createdAt: now,
      lastNotificationAt: null,
      lastNotificationAudience: null,
    });
  }

  const saved = await getDoc(entryRef);
  return normalizeChangelogEntry(saved.id, saved.data() as Record<string, unknown>);
}

export async function deleteChangelogEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, CHANGELOGS_COLLECTION, entryId));
}

export function getChangelogDispatchAudience(status: ChangelogStatus): ChangelogAudience {
  return status === 'draft' ? 'admins' : 'all';
}

export async function dispatchChangelogEntry(entry: ChangelogEntry): Promise<ChangelogEntry> {
  const entryRef = doc(db, CHANGELOGS_COLLECTION, entry.id);
  const now = new Date().toISOString();
  const audience = getChangelogDispatchAudience(entry.status);

  await updateDoc(entryRef, {
    lastNotificationAt: now,
    lastNotificationAudience: audience,
    updatedAt: now,
  });

  const updated = await getDoc(entryRef);
  return normalizeChangelogEntry(updated.id, updated.data() as Record<string, unknown>);
}

export function getChangelogNotificationKey(entry: Pick<ChangelogEntry, 'id' | 'lastNotificationAt'>): string | null {
  return entry.lastNotificationAt ? `${entry.id}:${entry.lastNotificationAt}` : null;
}

export function canUserReceiveChangelog(entry: ChangelogEntry, isAdmin: boolean): boolean {
  if (!entry.lastNotificationAt || !entry.lastNotificationAudience) return false;
  return entry.lastNotificationAudience === 'all' || isAdmin;
}

export async function hasUserDismissedChangelogNotification(
  userId: string,
  entry: Pick<ChangelogEntry, 'id' | 'lastNotificationAt'>,
): Promise<boolean> {
  if (!entry.lastNotificationAt) return false;

  const stateSnapshot = await getDoc(doc(db, 'users', userId, USER_CHANGELOG_STATE_COLLECTION, entry.id));
  if (!stateSnapshot.exists()) return false;

  const data = stateSnapshot.data();
  return data.lastDismissedNotificationAt === entry.lastNotificationAt;
}

export async function markChangelogNotificationDismissed(
  userId: string,
  entry: Pick<ChangelogEntry, 'id' | 'lastNotificationAt'>,
  action: ChangelogNotificationAction,
): Promise<void> {
  if (!entry.lastNotificationAt) return;

  await setDoc(
    doc(db, 'users', userId, USER_CHANGELOG_STATE_COLLECTION, entry.id),
    {
      entryId: entry.id,
      lastDismissedNotificationAt: entry.lastNotificationAt,
      dismissedAt: new Date().toISOString(),
      action,
    },
    { merge: true },
  );
}
