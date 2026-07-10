/**
 * キャッシュ最適化ワーカー
 *
 * Service Workerキャッシュを最適化してパフォーマンスを向上
 */

import type { CacheStatistics } from '../types/backgroundTask';

/**
 * キャッシュ最適化設定
 */
export interface CacheOptimizerConfig {
  maxCacheSizeBytes: number; // 最大キャッシュサイズ（バイト）
  maxCacheAgeDays: number; // 最大キャッシュ保持期間（日）
  precacheEnabled: boolean; // プリキャッシュを有効にするか
  dynamicCacheEnabled: boolean; // 動的キャッシュを有効にするか
}

const DEFAULT_CACHE_CONFIG: CacheOptimizerConfig = {
  maxCacheSizeBytes: 50 * 1024 * 1024, // 50MB
  maxCacheAgeDays: 30, // 30日間
  precacheEnabled: true,
  dynamicCacheEnabled: true,
};

/**
 * キャッシュ最適化設定を取得
 */
function getCacheOptimizerConfig(): CacheOptimizerConfig {
  try {
    const saved = localStorage.getItem('cacheOptimizerConfig');
    if (saved) {
      return { ...DEFAULT_CACHE_CONFIG, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('[CacheOptimizer] 設定の取得に失敗:', error);
  }
  return DEFAULT_CACHE_CONFIG;
}

/**
 * キャッシュ最適化設定を保存
 */
export function saveCacheOptimizerConfig(config: Partial<CacheOptimizerConfig>): void {
  try {
    const current = getCacheOptimizerConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('cacheOptimizerConfig', JSON.stringify(updated));
    console.log('[CacheOptimizer] 設定を保存しました:', updated);
  } catch (error) {
    console.error('[CacheOptimizer] 設定の保存に失敗:', error);
  }
}

/**
 * 古いキャッシュをクリーンアップ
 *
 * @param maxAgeDays 最大保持期間（日）
 * @returns 削除したキャッシュエントリ数
 */
export async function cleanupOldCaches(maxAgeDays?: number): Promise<number> {
  const config = getCacheOptimizerConfig();
  const maxAge = maxAgeDays || config.maxCacheAgeDays;

  console.log(`[CacheOptimizer] ${maxAge}日より古いキャッシュを削除中...`);

  if (!('caches' in self)) {
    console.log('[CacheOptimizer] Cache API利用不可');
    return 0;
  }

  let cacheEntriesDeleted = 0;
  const cutoffTime = Date.now() - maxAge * 24 * 60 * 60 * 1000;

  try {
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      // 動的キャッシュのみクリーンアップ（静的キャッシュは保持）
      if (cacheName.includes('dynamic') || cacheName.includes('runtime')) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          try {
            const response = await cache.match(request);
            if (response) {
              const dateHeader = response.headers.get('date');
              if (dateHeader) {
                const responseTime = new Date(dateHeader).getTime();
                if (responseTime < cutoffTime) {
                  await cache.delete(request);
                  cacheEntriesDeleted++;
                }
              }
            }
          } catch (error) {
            console.error('[CacheOptimizer] キャッシュエントリの削除エラー:', error);
          }
        }
      }
    }

    console.log(`[CacheOptimizer] ${cacheEntriesDeleted}件のキャッシュエントリを削除しました`);
    return cacheEntriesDeleted;
  } catch (error) {
    console.error('[CacheOptimizer] キャッシュクリーンアップエラー:', error);
    return 0;
  }
}

/**
 * キャッシュサイズを最適化
 *
 * @param maxSizeBytes 最大サイズ（バイト）
 */
export async function optimizeCacheSize(maxSizeBytes?: number): Promise<void> {
  const config = getCacheOptimizerConfig();
  const maxSize = maxSizeBytes || config.maxCacheSizeBytes;

  console.log(`[CacheOptimizer] キャッシュサイズを最適化中（上限: ${(maxSize / 1024 / 1024).toFixed(2)}MB）...`);

  if (!('caches' in self)) {
    console.log('[CacheOptimizer] Cache API利用不可');
    return;
  }

  try {
    const stats = await getCacheStatistics();

    if (stats.totalSize > maxSize) {
      console.log(`[CacheOptimizer] キャッシュサイズが上限を超えています: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB > ${(maxSize / 1024 / 1024).toFixed(2)}MB`);

      // 動的キャッシュから古いエントリーを削除
      const cacheNames = await caches.keys();
      const dynamicCaches = cacheNames.filter(
        name => name.includes('dynamic') || name.includes('runtime')
      );

      for (const cacheName of dynamicCaches) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        // 日付でソート（古い順）
        const requestsWithDates = await Promise.all(
          requests.map(async request => {
            const response = await cache.match(request);
            const dateHeader = response?.headers.get('date');
            const date = dateHeader ? new Date(dateHeader).getTime() : 0;
            return { request, date };
          })
        );

        requestsWithDates.sort((a, b) => a.date - b.date);

        // 古いエントリーから削除
        const toDelete = Math.ceil(requests.length * 0.3); // 30%を削除
        for (let i = 0; i < toDelete && i < requestsWithDates.length; i++) {
          await cache.delete(requestsWithDates[i].request);
        }

        console.log(`[CacheOptimizer] ${cacheName}から${toDelete}件のエントリーを削除しました`);
      }
    } else {
      console.log(`[CacheOptimizer] キャッシュサイズは適正範囲内です: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    console.error('[CacheOptimizer] キャッシュサイズ最適化エラー:', error);
  }
}

/**
 * リソースをプリキャッシュ
 *
 * @param urls プリキャッシュするURLリスト
 */
export async function precacheResources(urls: string[]): Promise<void> {
  console.log(`[CacheOptimizer] ${urls.length}件のリソースをプリキャッシュ中...`);

  if (!('caches' in self)) {
    console.log('[CacheOptimizer] Cache API利用不可');
    return;
  }

  try {
    const cache = await caches.open('precache-v1');
    await cache.addAll(urls);
    console.log(`[CacheOptimizer] ${urls.length}件のリソースをプリキャッシュしました`);
  } catch (error) {
    console.error('[CacheOptimizer] プリキャッシュエラー:', error);
  }
}

/**
 * キャッシュ統計を取得
 */
export async function getCacheStatistics(): Promise<CacheStatistics> {
  console.log('[CacheOptimizer] キャッシュ統計を収集中...');

  if (!('caches' in self)) {
    return {
      totalSize: 0,
      itemCount: 0,
      hitRate: 0,
      oldestItem: new Date(),
      cacheNames: [],
    };
  }

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    let itemCount = 0;
    let oldestItemTime = Date.now();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      itemCount += requests.length;

      for (const request of requests) {
        try {
          const response = await cache.match(request);
          if (response) {
            // レスポンスサイズを概算
            const blob = await response.clone().blob();
            totalSize += blob.size;

            // 最も古いアイテムの日付を記録
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              const responseTime = new Date(dateHeader).getTime();
              if (responseTime < oldestItemTime) {
                oldestItemTime = responseTime;
              }
            }
          }
        } catch (error) {
          console.error('[CacheOptimizer] キャッシュエントリの読み取りエラー:', error);
        }
      }
    }

    // キャッシュヒット率を計算（localStorageから取得）
    const hitRate = calculateCacheHitRate();

    const stats: CacheStatistics = {
      totalSize,
      itemCount,
      hitRate,
      oldestItem: new Date(oldestItemTime),
      cacheNames,
    };

    console.log('[CacheOptimizer] キャッシュ統計:', stats);
    return stats;
  } catch (error) {
    console.error('[CacheOptimizer] 統計収集エラー:', error);
    return {
      totalSize: 0,
      itemCount: 0,
      hitRate: 0,
      oldestItem: new Date(),
      cacheNames: [],
    };
  }
}

/**
 * キャッシュヒット率を計算
 */
function calculateCacheHitRate(): number {
  try {
    const hits = parseInt(localStorage.getItem('cacheHits') || '0', 10);
    const misses = parseInt(localStorage.getItem('cacheMisses') || '0', 10);
    const total = hits + misses;

    if (total === 0) {
      return 0;
    }

    return hits / total;
  } catch (error) {
    console.error('[CacheOptimizer] ヒット率計算エラー:', error);
    return 0;
  }
}

/**
 * キャッシュヒットを記録
 */
export function recordCacheHit(): void {
  try {
    const hits = parseInt(localStorage.getItem('cacheHits') || '0', 10);
    localStorage.setItem('cacheHits', (hits + 1).toString());
  } catch (error) {
    console.error('[CacheOptimizer] ヒット記録エラー:', error);
  }
}

/**
 * キャッシュミスを記録
 */
export function recordCacheMiss(): void {
  try {
    const misses = parseInt(localStorage.getItem('cacheMisses') || '0', 10);
    localStorage.setItem('cacheMisses', (misses + 1).toString());
  } catch (error) {
    console.error('[CacheOptimizer] ミス記録エラー:', error);
  }
}

/**
 * 特定のキャッシュを削除
 */
export async function deleteCacheByName(cacheName: string): Promise<boolean> {
  console.log(`[CacheOptimizer] キャッシュを削除中: ${cacheName}`);

  if (!('caches' in self)) {
    console.log('[CacheOptimizer] Cache API利用不可');
    return false;
  }

  try {
    const deleted = await caches.delete(cacheName);
    if (deleted) {
      console.log(`[CacheOptimizer] キャッシュを削除しました: ${cacheName}`);
    } else {
      console.log(`[CacheOptimizer] キャッシュが見つかりません: ${cacheName}`);
    }
    return deleted;
  } catch (error) {
    console.error('[CacheOptimizer] キャッシュ削除エラー:', error);
    return false;
  }
}

/**
 * すべてのキャッシュをクリア
 */
export async function clearAllCaches(): Promise<number> {
  console.log('[CacheOptimizer] すべてのキャッシュをクリア中...');

  if (!('caches' in self)) {
    console.log('[CacheOptimizer] Cache API利用不可');
    return 0;
  }

  try {
    const cacheNames = await caches.keys();
    let deletedCount = 0;

    for (const cacheName of cacheNames) {
      // プリキャッシュは保持
      if (!cacheName.includes('precache')) {
        const deleted = await caches.delete(cacheName);
        if (deleted) {
          deletedCount++;
        }
      }
    }

    console.log(`[CacheOptimizer] ${deletedCount}件のキャッシュをクリアしました`);
    return deletedCount;
  } catch (error) {
    console.error('[CacheOptimizer] キャッシュクリアエラー:', error);
    return 0;
  }
}

/**
 * キャッシュを更新
 */
export async function updateCache(urls: string[]): Promise<void> {
  console.log(`[CacheOptimizer] ${urls.length}件のキャッシュを更新中...`);

  if (!('caches' in self)) {
    console.log('[CacheOptimizer] Cache API利用不可');
    return;
  }

  try {
    const cache = await caches.open('dynamic-v1');

    for (const url of urls) {
      try {
        // 既存のキャッシュを削除
        await cache.delete(url);

        // 新しいレスポンスをフェッチしてキャッシュ
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.error(`[CacheOptimizer] ${url}のキャッシュ更新エラー:`, error);
      }
    }

    console.log(`[CacheOptimizer] キャッシュ更新完了`);
  } catch (error) {
    console.error('[CacheOptimizer] キャッシュ更新エラー:', error);
  }
}

/**
 * キャッシュ最適化を実行
 */
export async function runCacheOptimization(): Promise<{
  entriesDeleted: number;
  sizeBefore: number;
  sizeAfter: number;
}> {
  console.log('[CacheOptimizer] キャッシュ最適化を実行中...');

  const statsBefore = await getCacheStatistics();
  const sizeBefore = statsBefore.totalSize;

  // 1. 古いキャッシュを削除
  const entriesDeleted = await cleanupOldCaches();

  // 2. キャッシュサイズを最適化
  await optimizeCacheSize();

  const statsAfter = await getCacheStatistics();
  const sizeAfter = statsAfter.totalSize;

  const result = {
    entriesDeleted,
    sizeBefore,
    sizeAfter,
  };

  console.log('[CacheOptimizer] 最適化完了:', result);

  // 結果を保存
  saveCacheOptimizationResult(result);

  return result;
}

/**
 * 最適化結果を保存
 */
function saveCacheOptimizationResult(result: { entriesDeleted: number; sizeBefore: number; sizeAfter: number }): void {
  try {
    localStorage.setItem('lastCacheOptimizationResult', JSON.stringify(result));
    localStorage.setItem('lastCacheOptimizationTime', new Date().toISOString());
  } catch (error) {
    console.error('[CacheOptimizer] 結果の保存に失敗:', error);
  }
}

/**
 * 最後の最適化結果を取得
 */
export function getLastOptimizationResult(): { entriesDeleted: number; sizeBefore: number; sizeAfter: number } | null {
  try {
    const saved = localStorage.getItem('lastCacheOptimizationResult');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('[CacheOptimizer] 最後の最適化結果の取得に失敗:', error);
  }
  return null;
}

/**
 * 最後の最適化時刻を取得
 */
export function getLastOptimizationTime(): Date | null {
  try {
    const saved = localStorage.getItem('lastCacheOptimizationTime');
    if (saved) {
      return new Date(saved);
    }
  } catch (error) {
    console.error('[CacheOptimizer] 最後の最適化時刻の取得に失敗:', error);
  }
  return null;
}
