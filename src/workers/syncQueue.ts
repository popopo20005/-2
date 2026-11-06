/**
 * 同期キュー管理ワーカー
 *
 * オフライン時の変更を記録し、ネットワーク復帰時に自動同期
 */

import { db } from '../lib/database';
import type { SyncQueueItem } from '../types/backgroundTask';
import { syncService } from '../services/syncService';

// これ以上失敗した項目は自動では再送しない（retryFailedItems で手動再試行する）
const MAX_RETRIES = 3;
// 解答のたびに送らず、連続した変更をまとめて送る
const SYNC_DEBOUNCE_MS = 3000;
// ドキュメントIDが端末の連番に依存しない種類だけを送る。問題やクイズセットなどは
// ローカルIDとFirestoreのIDが一致しないので、送ると別の問題を上書きしたり消したりする
const SYNCABLE_TYPES = new Set<SyncQueueItem['entityType']>([
  'history',
  'studyDiary',
  'streakRecord',
  'unlockedBadge',
  'userProgress',
]);

let isProcessing = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 未同期のアイテムを取得
 *
 * syncedAt が無い行はインデックスに載らず、where().equals(undefined) は
 * 例外になるので、インデックスを使わずに絞り込む
 */
function pendingQueue() {
  return db.syncQueue.filter(
    (item) =>
      SYNCABLE_TYPES.has(item.entityType) && !item.syncedAt && item.retryCount < MAX_RETRIES
  );
}

/**
 * 少し待ってから同期キューを処理する
 */
export function scheduleSyncQueue(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    processSyncQueue().catch((err) => console.warn('[SyncQueue] 自動同期失敗:', err));
  }, SYNC_DEBOUNCE_MS);
}

/**
 * 同期キューに追加
 */
export async function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>
): Promise<void> {
  console.log('[SyncQueue] キューに追加:', item);

  try {
    const queueItem: Omit<SyncQueueItem, 'id'> = {
      ...item,
      createdAt: new Date(),
      retryCount: 0,
    };

    await db.syncQueue.add(queueItem as any);
    console.log('[SyncQueue] キューに追加しました');
    scheduleSyncQueue();
  } catch (error) {
    console.error('[SyncQueue] キューへの追加エラー:', error);
    throw error;
  }
}

/**
 * 同期キューを処理
 */
export async function processSyncQueue(): Promise<void> {
  console.log('[SyncQueue] キューを処理中...');

  if (!navigator.onLine) {
    console.log('[SyncQueue] オフラインのため処理をスキップします');
    return;
  }

  // 未ログインのまま進むと、送っていないのに同期済みの印が付いてしまう
  if (!syncService.canSync()) {
    console.log('[SyncQueue] 未ログインのため処理をスキップします');
    return;
  }

  if (isProcessing) return;
  isProcessing = true;

  try {
    // 同期待ちのアイテムを取得
    const pendingItems = await pendingQueue().toArray();

    console.log(`[SyncQueue] 処理待ちアイテム: ${pendingItems.length}件`);

    for (const item of pendingItems) {
      try {
        await processSyncItem(item);

        // 同期完了をマーク
        await db.syncQueue.update(item.id!, {
          syncedAt: new Date() as any,
        });

        console.log(`[SyncQueue] アイテムを同期しました: ${item.entityType} ${item.entityId}`);
      } catch (error) {
        console.error(`[SyncQueue] アイテムの同期エラー:`, error);

        // リトライカウントを増やす
        await db.syncQueue.update(item.id!, {
          retryCount: item.retryCount + 1,
          lastError: error instanceof Error ? error.message : String(error),
        });

        // 最大リトライ回数を超えた場合
        if (item.retryCount + 1 >= MAX_RETRIES) {
          console.error(`[SyncQueue] 最大リトライ回数を超えました: ${item.entityType} ${item.entityId}`);
          // エラーとしてマークするか、削除するかの判断
          // 現状は保持して手動対処を促す
        }
      }
    }

    console.log('[SyncQueue] キューの処理完了');
  } catch (error) {
    console.error('[SyncQueue] キュー処理エラー:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * 個別の同期アイテムを処理
 */
async function processSyncItem(item: SyncQueueItem): Promise<void> {
  console.log(`[SyncQueue] アイテムを処理中: ${item.operation} ${item.entityType} ${item.entityId}`);

  // TODO: 実際の同期ロジックを実装
  // 現在はローカルでの処理のみをサポート

  switch (item.entityType) {
    case 'problem':
      await syncProblem(item);
      break;
    case 'quizSet':
      await syncQuizSet(item);
      break;
    case 'history':
      await syncHistory(item);
      break;
    case 'goal':
      await syncGoal(item);
      break;
    case 'userProgress':
      await syncUserProgress(item);
      break;
    case 'unlockedBadge':
      await syncUnlockedBadge(item);
      break;
    case 'streakRecord':
      await syncStreakRecord(item);
      break;
    case 'spacedRepetitionCard':
      await syncSpacedRepetitionCard(item);
      break;
    case 'studyTimeSession':
      await syncStudyTimeSession(item);
      break;
    case 'studyDiary':
      await syncStudyDiary(item);
      break;
    default:
      console.warn(`[SyncQueue] 未対応のエンティティタイプ: ${item.entityType}`);
  }
}

/**
 * エンティティタイプごとの同期処理
 * syncService.uploadChange() を呼び出してFirestoreに反映する
 */
async function syncProblem(item: SyncQueueItem): Promise<void> {
  const operation = item.operation === 'delete' ? 'delete' : 'set';
  await syncService.uploadChange('problems', item.entityId, item.data, operation);
}

async function syncQuizSet(item: SyncQueueItem): Promise<void> {
  const operation = item.operation === 'delete' ? 'delete' : 'set';
  await syncService.uploadChange('quizSets', item.entityId, item.data, operation);
}

/**
 * 履歴のドキュメントIDを作る
 *
 * ローカルの連番は端末ごとに同じ番号が振られるので、そのままIDにすると
 * 別の端末の履歴を上書きしてしまう。解答時刻と問題IDから決める。
 */
export function historyDocId(item: Pick<SyncQueueItem, 'entityId' | 'data'>): string {
  const time = Date.parse(String(item.data?.timestamp));
  if (Number.isNaN(time)) return String(item.entityId);
  return `${time}_${item.data?.problemId ?? 'unknown'}`;
}

async function syncHistory(item: SyncQueueItem): Promise<void> {
  const operation = item.operation === 'delete' ? 'delete' : 'set';
  await syncService.uploadChange('history', historyDocId(item), item.data, operation);
}

async function syncGoal(item: SyncQueueItem): Promise<void> {
  const operation = item.operation === 'delete' ? 'delete' : 'set';
  await syncService.uploadChange('goals', item.entityId, item.data, operation);
}

async function syncUserProgress(item: SyncQueueItem): Promise<void> {
  // シングルトン: 常にdoc ID "1"、常にset
  await syncService.uploadChange('userProgress', '1', item.data, 'set');
}

async function syncUnlockedBadge(item: SyncQueueItem): Promise<void> {
  const operation = item.operation === 'delete' ? 'delete' : 'set';
  const docId = item.data?.badgeId || String(item.entityId);
  await syncService.uploadChange('unlockedBadges', docId, item.data, operation);
}

async function syncStreakRecord(item: SyncQueueItem): Promise<void> {
  const operation = item.operation === 'delete' ? 'delete' : 'set';
  const docId = item.data?.date || String(item.entityId);
  await syncService.uploadChange('streakRecords', docId, item.data, operation);
}

async function syncSpacedRepetitionCard(item: SyncQueueItem): Promise<void> {
  const operation = item.operation === 'delete' ? 'delete' : 'set';
  await syncService.uploadChange('spacedRepetitionCards', item.entityId, item.data, operation);
}

async function syncStudyTimeSession(item: SyncQueueItem): Promise<void> {
  const operation = item.operation === 'delete' ? 'delete' : 'set';
  await syncService.uploadChange('studyTimeSessions', item.entityId, item.data, operation);
}

async function syncStudyDiary(item: SyncQueueItem): Promise<void> {
  const operation = item.operation === 'delete' ? 'delete' : 'set';
  const docId = item.data?.date || String(item.entityId);
  await syncService.uploadChange('studyDiary', docId, item.data, operation);
}

/**
 * 同期キューを取得
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const items = await db.syncQueue.toArray();
    return items;
  } catch (error) {
    console.error('[SyncQueue] キューの取得エラー:', error);
    return [];
  }
}

/**
 * 同期待ちアイテム数を取得
 */
export async function getPendingSyncCount(): Promise<number> {
  try {
    return await pendingQueue().count();
  } catch (error) {
    console.error('[SyncQueue] 同期待ちカウント取得エラー:', error);
    return 0;
  }
}

/**
 * 失敗したアイテム数を取得
 */
export async function getFailedSyncCount(): Promise<number> {
  try {
    const count = await db.syncQueue
      .where('retryCount')
      .aboveOrEqual(MAX_RETRIES)
      .count();
    return count;
  } catch (error) {
    console.error('[SyncQueue] 失敗カウント取得エラー:', error);
    return 0;
  }
}

/**
 * 同期済みアイテムをクリア
 */
export async function clearSyncedItems(): Promise<number> {
  console.log('[SyncQueue] 同期済みアイテムをクリア中...');

  try {
    const syncedItems = await db.syncQueue
      .filter((item) => !!item.syncedAt)
      .toArray();

    if (syncedItems.length > 0) {
      const idsToDelete = syncedItems.map(item => item.id!);
      await db.syncQueue.bulkDelete(idsToDelete);
      console.log(`[SyncQueue] ${syncedItems.length}件の同期済みアイテムをクリアしました`);
      return syncedItems.length;
    }

    return 0;
  } catch (error) {
    console.error('[SyncQueue] 同期済みアイテムのクリアエラー:', error);
    return 0;
  }
}

/**
 * 失敗したアイテムを再試行
 */
export async function retryFailedItems(): Promise<void> {
  console.log('[SyncQueue] 失敗したアイテムを再試行中...');

  try {
    const failedItems = await db.syncQueue
      .where('retryCount')
      .aboveOrEqual(MAX_RETRIES)
      .toArray();

    for (const item of failedItems) {
      // リトライカウントをリセット
      await db.syncQueue.update(item.id!, {
        retryCount: 0,
        lastError: undefined,
      });
    }

    console.log(`[SyncQueue] ${failedItems.length}件のアイテムを再試行キューに追加しました`);

    // キューを処理
    await processSyncQueue();
  } catch (error) {
    console.error('[SyncQueue] 再試行エラー:', error);
  }
}

/**
 * 特定のアイテムを削除
 */
export async function removeSyncItem(id: number): Promise<void> {
  console.log(`[SyncQueue] アイテムを削除: ${id}`);

  try {
    await db.syncQueue.delete(id);
    console.log(`[SyncQueue] アイテムを削除しました: ${id}`);
  } catch (error) {
    console.error('[SyncQueue] アイテム削除エラー:', error);
    throw error;
  }
}

/**
 * すべてのアイテムをクリア
 */
export async function clearAllSyncItems(): Promise<number> {
  console.log('[SyncQueue] すべてのアイテムをクリア中...');

  try {
    const count = await db.syncQueue.count();
    await db.syncQueue.clear();
    console.log(`[SyncQueue] ${count}件のアイテムをクリアしました`);
    return count;
  } catch (error) {
    console.error('[SyncQueue] 全アイテムクリアエラー:', error);
    return 0;
  }
}

/**
 * 同期ステータスを取得
 */
export interface SyncStatus {
  totalItems: number;
  pendingItems: number;
  failedItems: number;
  syncedItems: number;
  lastSyncTime: Date | null;
  isOnline: boolean;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const totalItems = await db.syncQueue.count();
    const pendingItems = await getPendingSyncCount();
    const failedItems = await getFailedSyncCount();
    const syncedItems = totalItems - pendingItems - failedItems;
    const lastSyncTime = getLastSyncTime();
    const isOnline = navigator.onLine;

    return {
      totalItems,
      pendingItems,
      failedItems,
      syncedItems,
      lastSyncTime,
      isOnline,
    };
  } catch (error) {
    console.error('[SyncQueue] ステータス取得エラー:', error);
    return {
      totalItems: 0,
      pendingItems: 0,
      failedItems: 0,
      syncedItems: 0,
      lastSyncTime: null,
      isOnline: navigator.onLine,
    };
  }
}

/**
 * 最後の同期時刻を取得
 */
function getLastSyncTime(): Date | null {
  try {
    const saved = localStorage.getItem('lastSyncTime');
    if (saved) {
      return new Date(saved);
    }
  } catch (error) {
    console.error('[SyncQueue] 最後の同期時刻の取得に失敗:', error);
  }
  return null;
}

/**
 * 最後の同期時刻を保存
 */
export function saveLastSyncTime(): void {
  try {
    localStorage.setItem('lastSyncTime', new Date().toISOString());
  } catch (error) {
    console.error('[SyncQueue] 同期時刻の保存に失敗:', error);
  }
}

/**
 * ネットワーク状態のリスナーを設定
 */
export function setupNetworkListeners(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('online', async () => {
    console.log('[SyncQueue] オンラインに復帰しました。同期を開始します...');
    await processSyncQueue();
    saveLastSyncTime();
  });

  window.addEventListener('offline', () => {
    console.log('[SyncQueue] オフラインになりました');
  });

  console.log('[SyncQueue] ネットワークリスナーをセットアップしました');
}
