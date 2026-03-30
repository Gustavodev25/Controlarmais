import { showChangelogNotification } from '../components/ChangelogModal';
import {
  canUserReceiveChangelog,
  getChangelogNotificationKey,
  hasUserDismissedChangelogNotification,
  listenToPendingChangelogCandidates,
  markChangelogNotificationDismissed,
} from './changelog';
import type { ChangelogEntry } from '../types/changelog';

type ChangelogListenerUser = {
  uid: string;
  isAdmin: boolean;
};

let stopListening = () => {};
let pendingResolution = 0;

async function resolvePendingNotification(entries: ChangelogEntry[], user: ChangelogListenerUser) {
  const resolutionId = ++pendingResolution;

  for (const entry of entries) {
    if (!canUserReceiveChangelog(entry, user.isAdmin)) continue;
    if (await hasUserDismissedChangelogNotification(user.uid, entry)) continue;
    if (resolutionId !== pendingResolution) return;

    showChangelogNotification(entry, {
      notificationKey: getChangelogNotificationKey(entry) ?? undefined,
      onDismiss: (action) => markChangelogNotificationDismissed(user.uid, entry, action),
    });
    return;
  }
}

export function startChangelogNotificationListener(user: ChangelogListenerUser) {
  stopChangelogNotificationListener();

  stopListening = listenToPendingChangelogCandidates((entries) => {
    void resolvePendingNotification(entries, user);
  });
}

export function stopChangelogNotificationListener() {
  pendingResolution += 1;
  stopListening();
  stopListening = () => {};
}
