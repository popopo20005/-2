import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { canSync, uploadChange } = vi.hoisted(() => ({
  canSync: vi.fn(() => true),
  uploadChange: vi.fn(async () => undefined),
}));

vi.mock('../../services/syncService', () => ({
  syncService: { canSync, uploadChange },
}));

import { db } from '../../lib/database';
import {
  clearSyncedItems,
  getPendingSyncCount,
  historyDocId,
  processSyncQueue,
} from '../syncQueue';

function queueHistory(entityId: number, problemId = 7) {
  return db.syncQueue.add({
    operation: 'create',
    entityType: 'history',
    entityId,
    data: { problemId, timestamp: '2026-11-06T12:00:00.000Z' },
    createdAt: new Date(),
    retryCount: 0,
  } as never);
}

describe('同期キュー', () => {
  beforeEach(async () => {
    await db.syncQueue.clear();
    canSync.mockReturnValue(true);
    uploadChange.mockReset();
    uploadChange.mockResolvedValue(undefined);
  });

  it('未同期の項目を見つけて送り、同期済みにする', async () => {
    await queueHistory(1);
    expect(await getPendingSyncCount()).toBe(1);

    await processSyncQueue();

    expect(uploadChange).toHaveBeenCalledTimes(1);
    expect(await getPendingSyncCount()).toBe(0);
  });

  it('送信に失敗した項目は未同期のまま残して回数を数える', async () => {
    await queueHistory(1);
    uploadChange.mockRejectedValueOnce(new Error('network'));

    await processSyncQueue();

    expect(await getPendingSyncCount()).toBe(1);
    const [item] = await db.syncQueue.toArray();
    expect(item.retryCount).toBe(1);
    expect(item.lastError).toBe('network');
  });

  it('上限まで失敗した項目は自動では再送しない', async () => {
    await queueHistory(1);
    uploadChange.mockRejectedValue(new Error('network'));

    for (let i = 0; i < 4; i++) await processSyncQueue();

    expect(uploadChange).toHaveBeenCalledTimes(3);
  });

  it('未ログインの時は送らず、同期済みの印も付けない', async () => {
    await queueHistory(1);
    canSync.mockReturnValue(false);

    await processSyncQueue();

    expect(uploadChange).not.toHaveBeenCalled();
    expect(await getPendingSyncCount()).toBe(1);
  });

  it('IDが端末の連番に依存する種類は送らない', async () => {
    await db.syncQueue.add({
      operation: 'update',
      entityType: 'problem',
      entityId: 1,
      data: { question: '別の端末では違う問題かもしれない' },
      createdAt: new Date(),
      retryCount: 0,
    } as never);

    await processSyncQueue();

    expect(uploadChange).not.toHaveBeenCalled();
    expect(await getPendingSyncCount()).toBe(0);
    const [item] = await db.syncQueue.toArray();
    expect(item.syncedAt).toBeUndefined();
  });

  it('同時に呼ばれても二重に送らない', async () => {
    await queueHistory(1);

    await Promise.all([processSyncQueue(), processSyncQueue()]);

    expect(uploadChange).toHaveBeenCalledTimes(1);
  });

  it('同期済みの項目だけを消す', async () => {
    await queueHistory(1);
    await processSyncQueue();
    await queueHistory(2);

    expect(await clearSyncedItems()).toBe(1);
    expect(await db.syncQueue.count()).toBe(1);
  });

  it('履歴のIDは端末の連番ではなく、解答時刻と問題IDで決まる', () => {
    const data = { problemId: 7, timestamp: '2026-11-06T12:00:00.000Z' };
    const time = Date.parse(data.timestamp);

    expect(historyDocId({ entityId: 1, data })).toBe(`${time}_7`);
    expect(historyDocId({ entityId: 2, data })).toBe(`${time}_7`);
    expect(historyDocId({ entityId: 3, data: {} })).toBe('3');
  });

  it('履歴はそのIDでアップロードする', async () => {
    await queueHistory(1);

    await processSyncQueue();

    const time = Date.parse('2026-11-06T12:00:00.000Z');
    expect(uploadChange).toHaveBeenCalledWith('history', `${time}_7`, expect.anything(), 'set');
  });
});
