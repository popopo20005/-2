/**
 * パフォーマンス最適化サービス
 *
 * Task#22: パフォーマンス最適化
 *
 * IndexedDBクエリ最適化、キャッシング、バッチ処理
 */

import { db } from '../lib/database';
import type { Problem, HistoryEntry } from '../types';

/**
 * クエリ結果のメモリキャッシュ
 */
class QueryCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5分

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // TTL チェック
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }
}

export const queryCache = new QueryCache();

/**
 * 最適化されたクエリサービス
 */
export const optimizedQueries = {
  /**
   * カテゴリ別の問題を取得（キャッシュ付き）
   */
  async getProblemsByCategory(category: string): Promise<Problem[]> {
    const cacheKey = `problems-category-${category}`;
    const cached = queryCache.get(cacheKey);
    if (cached) {
      console.log('[PerformanceOptimizer] Cache hit:', cacheKey);
      return cached;
    }

    console.log('[PerformanceOptimizer] Cache miss, querying:', cacheKey);
    // インデックスを使用したクエリ
    const problems = await db.problems.where('category').equals(category).toArray();

    queryCache.set(cacheKey, problems);
    return problems;
  },

  /**
   * 最近の履歴を取得（バッチ最適化）
   */
  async getRecentHistory(limit: number = 100): Promise<HistoryEntry[]> {
    const cacheKey = `history-recent-${limit}`;
    const cached = queryCache.get(cacheKey);
    if (cached) {
      console.log('[PerformanceOptimizer] Cache hit:', cacheKey);
      return cached;
    }

    console.log('[PerformanceOptimizer] Cache miss, querying:', cacheKey);
    // インデックスを使用して降順ソート
    const history = await db.history
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();

    queryCache.set(cacheKey, history);
    return history;
  },

  /**
   * バッチで問題を取得
   */
  async getProblemsBatch(ids: number[]): Promise<Problem[]> {
    if (ids.length === 0) return [];

    // IndexedDBのbulkGetを使用（Dexie 3.0+）
    const problems = await db.problems.bulkGet(ids);
    return problems.filter((p): p is Problem => p !== undefined);
  },

  /**
   * カテゴリごとの統計を集計（最適化版）
   */
  async getCategoryStats(): Promise<Map<string, { total: number; correct: number }>> {
    const cacheKey = 'category-stats';
    const cached = queryCache.get(cacheKey);
    if (cached) {
      console.log('[PerformanceOptimizer] Cache hit:', cacheKey);
      return cached;
    }

    console.log('[PerformanceOptimizer] Cache miss, querying:', cacheKey);

    // 並列クエリで高速化
    const [problems, history] = await Promise.all([
      db.problems.toArray(),
      db.history.toArray(),
    ]);

    const stats = new Map<string, { total: number; correct: number }>();

    // 問題IDとカテゴリのマップを作成
    const problemCategoryMap = new Map<number, string>();
    problems.forEach((p) => {
      if (p.id) problemCategoryMap.set(p.id, p.category);
    });

    // 履歴から統計を集計
    history.forEach((h) => {
      const category = problemCategoryMap.get(h.problemId);
      if (!category) return;

      const current = stats.get(category) || { total: 0, correct: 0 };
      current.total++;
      if (h.isCorrect) current.correct++;
      stats.set(category, current);
    });

    queryCache.set(cacheKey, stats);
    return stats;
  },

  /**
   * 問題をページネーション付きで取得
   */
  async getProblemsPaginated(
    offset: number,
    limit: number,
    category?: string
  ): Promise<Problem[]> {
    let query = db.problems.toCollection();

    if (category) {
      query = db.problems.where('category').equals(category);
    }

    return await query.offset(offset).limit(limit).toArray();
  },
};

/**
 * バッチ書き込み最適化
 */
export const optimizedWrites = {
  /**
   * 複数の履歴を一括追加
   */
  async bulkAddHistory(entries: Omit<HistoryEntry, 'id'>[]): Promise<void> {
    if (entries.length === 0) return;

    // Dexieのbulk操作を使用
    await db.history.bulkAdd(entries as HistoryEntry[]);

    // キャッシュを無効化
    queryCache.invalidate('history');
    queryCache.invalidate('category-stats');
  },

  /**
   * 複数の問題を一括更新
   */
  async bulkUpdateProblems(updates: Array<{ id: number; changes: Partial<Problem> }>): Promise<void> {
    if (updates.length === 0) return;

    // トランザクションで一括更新
    await db.transaction('rw', db.problems, async () => {
      for (const { id, changes } of updates) {
        await db.problems.update(id, changes);
      }
    });

    // キャッシュを無効化
    queryCache.invalidate('problems');
  },
};

/**
 * パフォーマンス測定
 */
export class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;

      // 測定結果を記録
      const measurements = this.measurements.get(label) || [];
      measurements.push(duration);
      this.measurements.set(label, measurements);

      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Performance] ${label} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  getStats(label: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) return null;

    return {
      avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      count: measurements.length,
    };
  }

  getAllStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const allStats: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    for (const [label, measurements] of this.measurements.entries()) {
      if (measurements.length > 0) {
        allStats[label] = {
          avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
          min: Math.min(...measurements),
          max: Math.max(...measurements),
          count: measurements.length,
        };
      }
    }

    return allStats;
  }

  clear(): void {
    this.measurements.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * 使用例:
 *
 * // キャッシュ付きクエリ
 * const problems = await optimizedQueries.getProblemsByCategory('Math');
 *
 * // バッチ取得
 * const problems = await optimizedQueries.getProblemsBatch([1, 2, 3, 4, 5]);
 *
 * // パフォーマンス測定
 * const result = await performanceMonitor.measure('loadDashboard', async () => {
 *   return await loadDashboardData();
 * });
 *
 * // 統計表示
 * const stats = performanceMonitor.getStats('loadDashboard');
 * console.log('Average:', stats?.avg, 'ms');
 */
