import api from './api';

export interface PendingProgressSync {
  enrollmentId: string;
  progressPercent: number;
  updatedAt: string;
}

const OFFLINE_SYNC_QUEUE_KEY = 'syllabiq_offline_progress_queue';

export const offlineSyncService = {
  getPendingSyncs(): PendingProgressSync[] {
    try {
      const raw = localStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  enqueueProgress(enrollmentId: string, progressPercent: number) {
    const queue = this.getPendingSyncs();
    const existingIdx = queue.findIndex((item) => item.enrollmentId === enrollmentId);

    const item: PendingProgressSync = {
      enrollmentId,
      progressPercent,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      queue[existingIdx] = item;
    } else {
      queue.push(item);
    }

    localStorage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(queue));
  },

  async flushPendingSyncs(): Promise<{ synced: number; failed: number }> {
    if (!navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    const queue = this.getPendingSyncs();
    if (queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;
    const remaining: PendingProgressSync[] = [];

    for (const item of queue) {
      try {
        await api.patch(`/enrollments/${item.enrollmentId}/progress`, {
          progress_percent: item.progressPercent,
        });
        synced++;
      } catch (err) {
        failed++;
        remaining.push(item);
      }
    }

    localStorage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(remaining));
    return { synced, failed };
  },

  initAutoSync(onSyncComplete?: (result: { synced: number; failed: number }) => void) {
    window.addEventListener('online', async () => {
      const result = await this.flushPendingSyncs();
      if (result.synced > 0 && onSyncComplete) {
        onSyncComplete(result);
      }
    });
  },
};
