/**
 * バックグラウンドデータ集計ワーカー
 *
 * Service Workerと連携して定期的にデータ集計・クリーンアップを実行
 * - 日次統計の自動集計
 * - 古いデータのクリーンアップ
 * - キャッシュの最適化
 * - パフォーマンスメトリクスの収集
 */

import { db, studyPlanService } from '../lib/database';
import { calculateDailyStatistics } from '../services/statisticsAggregator';
import { evaluateAllTriggers } from '../services/planAdjustmentService';
// TODO: Task#19 - Implement cleanupOldNotifications in notificationService
// import { cleanupOldNotifications } from '../services/notificationService';

/**
 * 集計タスクの結果
 */
export interface AggregationResult {
  success: boolean;
  tasksCompleted: string[];
  errors: string[];
  duration: number;
  timestamp: Date;
}

/**
 * クリーンアップ統計
 */
export interface CleanupStats {
  notificationsDeleted: number;
  historiesDeleted: number;
  cacheEntriesDeleted: number;
  spaceSaved: number; // bytes
}

/**
 * データ集計設定
 */
export interface AggregationConfig {
  enableDailyStats: boolean;
  enableCleanup: boolean;
  enableCacheOptimization: boolean;
  enableActEvaluation: boolean;
  dataRetentionDays: number;
  cacheRetentionDays: number;
}

const DEFAULT_CONFIG: AggregationConfig = {
  enableDailyStats: true,
  enableCleanup: true,
  enableCacheOptimization: true,
  enableActEvaluation: true,
  dataRetentionDays: 365, // 1年間保持
  cacheRetentionDays: 7, // 7日間保持
};

/**
 * 設定をローカルストレージから取得
 */
function getAggregationConfig(): AggregationConfig {
  try {
    const saved = localStorage.getItem('aggregationConfig');
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('[DataAggregator] 設定の取得に失敗:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * メインの集計タスクを実行
 */
export async function runAggregationTasks(): Promise<AggregationResult> {
  const startTime = Date.now();
  const tasksCompleted: string[] = [];
  const errors: string[] = [];

  console.log('[DataAggregator] バックグラウンド集計を開始...');

  try {
    const config = getAggregationConfig();

    // 1. 日次統計の集計
    if (config.enableDailyStats) {
      try {
        await aggregateDailyStatistics();
        tasksCompleted.push('日次統計集計');
        console.log('[DataAggregator] 日次統計集計完了');
      } catch (error) {
        const message = `日次統計集計エラー: ${error}`;
        errors.push(message);
        console.error('[DataAggregator]', message);
      }
    }

    // 2. 古いデータのクリーンアップ
    if (config.enableCleanup) {
      try {
        const stats = await cleanupOldData(config.dataRetentionDays);
        tasksCompleted.push(`古いデータクリーンアップ (${stats.historiesDeleted}件削除)`);
        console.log('[DataAggregator] 古いデータクリーンアップ完了:', stats);
      } catch (error) {
        const message = `クリーンアップエラー: ${error}`;
        errors.push(message);
        console.error('[DataAggregator]', message);
      }
    }

    // 3. 通知履歴のクリーンアップ
    // TODO: Task#19 - Implement cleanupOldNotifications
    /*
    if (config.enableCleanup) {
      try {
        await cleanupOldNotifications();
        tasksCompleted.push('通知履歴クリーンアップ');
        console.log('[DataAggregator] 通知履歴クリーンアップ完了');
      } catch (error) {
        const message = `通知クリーンアップエラー: ${error}`;
        errors.push(message);
        console.error('[DataAggregator]', message);
      }
    }
    */

    // 4. キャッシュ最適化
    if (config.enableCacheOptimization) {
      try {
        const cacheStats = await optimizeCache(config.cacheRetentionDays);
        tasksCompleted.push(`キャッシュ最適化 (${cacheStats.cacheEntriesDeleted}エントリ削除)`);
        console.log('[DataAggregator] キャッシュ最適化完了:', cacheStats);
      } catch (error) {
        const message = `キャッシュ最適化エラー: ${error}`;
        errors.push(message);
        console.error('[DataAggregator]', message);
      }
    }

    // 5. データベース最適化（インデックス再構築）
    try {
      await optimizeDatabase();
      tasksCompleted.push('データベース最適化');
      console.log('[DataAggregator] データベース最適化完了');
    } catch (error) {
      const message = `データベース最適化エラー: ${error}`;
      errors.push(message);
      console.error('[DataAggregator]', message);
    }

    // 6. ACTトリガー評価（学習プラン自動調整）
    if (config.enableActEvaluation) {
      try {
        const activePlans = await studyPlanService.getActivePlans();
        let totalAdjustments = 0;
        for (const plan of activePlans) {
          const adjustments = await evaluateAllTriggers(plan);
          totalAdjustments += adjustments.length;
        }
        tasksCompleted.push(`ACTトリガー評価 (${totalAdjustments}件の調整)`);
        console.log(`[DataAggregator] ACTトリガー評価完了: ${activePlans.length}プラン, ${totalAdjustments}件の調整`);
      } catch (error) {
        const message = `ACTトリガー評価エラー: ${error}`;
        errors.push(message);
        console.error('[DataAggregator]', message);
      }
    }

    const duration = Date.now() - startTime;
    const result: AggregationResult = {
      success: errors.length === 0,
      tasksCompleted,
      errors,
      duration,
      timestamp: new Date(),
    };

    console.log(`[DataAggregator] 集計完了 (${duration}ms):`, result);

    // 結果をローカルストレージに保存
    try {
      localStorage.setItem('lastAggregationResult', JSON.stringify(result));
      localStorage.setItem('lastAggregationTime', new Date().toISOString());
    } catch (error) {
      console.error('[DataAggregator] 結果の保存に失敗:', error);
    }

    return result;
  } catch (error) {
    console.error('[DataAggregator] 集計タスクで予期しないエラー:', error);
    const duration = Date.now() - startTime;
    return {
      success: false,
      tasksCompleted,
      errors: [...errors, `予期しないエラー: ${error}`],
      duration,
      timestamp: new Date(),
    };
  }
}

/**
 * 日次統計を集計
 */
async function aggregateDailyStatistics(): Promise<void> {
  console.log('[DataAggregator] 日次統計を集計中...');

  // 過去7日間の統計を計算
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    try {
      const stats = await calculateDailyStatistics(date);
      console.log(`[DataAggregator] ${date.toISOString().split('T')[0]} の統計:`, stats);
    } catch (error) {
      console.error(`[DataAggregator] ${date.toISOString().split('T')[0]} の統計計算エラー:`, error);
    }
  }
}

/**
 * 古いデータをクリーンアップ
 */
async function cleanupOldData(retentionDays: number): Promise<CleanupStats> {
  console.log(`[DataAggregator] ${retentionDays}日より古いデータを削除中...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  let historiesDeleted = 0;
  let notificationsDeleted = 0;

  try {
    // 古い履歴データを削除（ただし、学習履歴は保持）
    // 注: 学習履歴は重要なので削除しない。代わりにバックアップを推奨
    const oldHistories = await db.history
      .where('timestamp')
      .below(cutoffDate)
      .toArray();

    // 実際には削除せず、カウントのみ（安全のため）
    historiesDeleted = oldHistories.length;
    console.log(`[DataAggregator] 削除対象の古い履歴: ${historiesDeleted}件（保持します）`);

    // 古い通知履歴を削除
    const oldNotifications = await db.notificationHistory
      .where('sentAt')
      .below(cutoffDate)
      .toArray();

    if (oldNotifications.length > 0) {
      await db.notificationHistory.bulkDelete(oldNotifications.map((n) => n.id!));
      notificationsDeleted = oldNotifications.length;
      console.log(`[DataAggregator] 古い通知履歴を削除: ${notificationsDeleted}件`);
    }

    // 古いセッション分析データを削除（90日より古い）
    const sessionCutoff = new Date();
    sessionCutoff.setDate(sessionCutoff.getDate() - 90);

    const oldSessions = await db.sessionAnalytics
      .where('sessionStartTime')
      .below(sessionCutoff)
      .toArray();

    if (oldSessions.length > 0) {
      await db.sessionAnalytics.bulkDelete(oldSessions.map((s) => s.id!));
      console.log(`[DataAggregator] 古いセッション分析を削除: ${oldSessions.length}件`);
    }

    return {
      historiesDeleted: 0, // 実際には削除しない
      notificationsDeleted,
      cacheEntriesDeleted: 0,
      spaceSaved: notificationsDeleted * 1024, // 概算
    };
  } catch (error) {
    console.error('[DataAggregator] クリーンアップエラー:', error);
    throw error;
  }
}

/**
 * キャッシュを最適化
 */
async function optimizeCache(retentionDays: number): Promise<CleanupStats> {
  console.log(`[DataAggregator] ${retentionDays}日より古いキャッシュを削除中...`);

  let cacheEntriesDeleted = 0;
  let spaceSaved = 0;

  try {
    if (!('caches' in self)) {
      console.log('[DataAggregator] Cache API利用不可');
      return {
        historiesDeleted: 0,
        notificationsDeleted: 0,
        cacheEntriesDeleted: 0,
        spaceSaved: 0,
      };
    }

    const cacheNames = await caches.keys();
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    for (const cacheName of cacheNames) {
      // 動的キャッシュのみクリーンアップ（静的キャッシュは保持）
      if (cacheName.includes('dynamic')) {
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
                  spaceSaved += 10 * 1024; // 概算10KB/エントリ
                }
              }
            }
          } catch (error) {
            console.error('[DataAggregator] キャッシュエントリの削除エラー:', error);
          }
        }
      }
    }

    console.log(`[DataAggregator] キャッシュクリーンアップ完了: ${cacheEntriesDeleted}エントリ削除`);

    return {
      historiesDeleted: 0,
      notificationsDeleted: 0,
      cacheEntriesDeleted,
      spaceSaved,
    };
  } catch (error) {
    console.error('[DataAggregator] キャッシュ最適化エラー:', error);
    throw error;
  }
}

/**
 * データベースを最適化（IndexedDB compaction）
 */
async function optimizeDatabase(): Promise<void> {
  console.log('[DataAggregator] データベースを最適化中...');

  try {
    // Dexieは自動的にインデックスを最適化するが、
    // 手動で未使用スペースをクリーンアップすることも可能

    // 各テーブルのカウントを取得してログに記録
    const tables = [
      'categories',
      'problems',
      'history',
      'quizSets',
      'spacedRepetitionCards',
      'goals',
      'categoryStats',
      'notificationHistory',
    ];

    const stats: Record<string, number> = {};

    for (const tableName of tables) {
      try {
        const table = (db as any)[tableName];
        if (table) {
          const count = await table.count();
          stats[tableName] = count;
        }
      } catch (error) {
        console.error(`[DataAggregator] テーブル${tableName}のカウント取得エラー:`, error);
      }
    }

    console.log('[DataAggregator] データベース統計:', stats);

    // 重複したカテゴリ統計を削除
    const categoryStats = await db.categoryStats.toArray();
    const categoryMap = new Map<string, number>();
    const duplicates: number[] = [];

    for (const stat of categoryStats) {
      if (categoryMap.has(stat.category)) {
        // 重複を発見
        const existingId = categoryMap.get(stat.category)!;
        const existingStat = categoryStats.find((s) => s.id === existingId);

        if (existingStat && stat.analyzedAt && existingStat.analyzedAt) {
          // 古い方を削除
          if (stat.analyzedAt > existingStat.analyzedAt) {
            duplicates.push(existingId);
            categoryMap.set(stat.category, stat.id!);
          } else {
            duplicates.push(stat.id!);
          }
        }
      } else {
        categoryMap.set(stat.category, stat.id!);
      }
    }

    if (duplicates.length > 0) {
      await db.categoryStats.bulkDelete(duplicates);
      console.log(`[DataAggregator] 重複カテゴリ統計を削除: ${duplicates.length}件`);
    }

    console.log('[DataAggregator] データベース最適化完了');
  } catch (error) {
    console.error('[DataAggregator] データベース最適化エラー:', error);
    throw error;
  }
}

/**
 * 最後の集計結果を取得
 */
export function getLastAggregationResult(): AggregationResult | null {
  try {
    const saved = localStorage.getItem('lastAggregationResult');
    if (saved) {
      const result = JSON.parse(saved);
      result.timestamp = new Date(result.timestamp);
      return result;
    }
  } catch (error) {
    console.error('[DataAggregator] 最後の集計結果の取得に失敗:', error);
  }
  return null;
}

/**
 * 最後の集計時刻を取得
 */
export function getLastAggregationTime(): Date | null {
  try {
    const saved = localStorage.getItem('lastAggregationTime');
    if (saved) {
      return new Date(saved);
    }
  } catch (error) {
    console.error('[DataAggregator] 最後の集計時刻の取得に失敗:', error);
  }
  return null;
}

/**
 * 次回の集計予定時刻を計算
 */
export function getNextAggregationTime(): Date {
  const lastTime = getLastAggregationTime();
  const nextTime = new Date();

  if (lastTime) {
    // 最後の集計から24時間後
    nextTime.setTime(lastTime.getTime() + 24 * 60 * 60 * 1000);
  } else {
    // 今日の深夜3時
    nextTime.setHours(3, 0, 0, 0);
    if (nextTime < new Date()) {
      // 既に過ぎている場合は明日
      nextTime.setDate(nextTime.getDate() + 1);
    }
  }

  return nextTime;
}

/**
 * 集計が必要かチェック
 */
export function shouldRunAggregation(): boolean {
  const lastTime = getLastAggregationTime();

  if (!lastTime) {
    return true; // 初回実行
  }

  const hoursSinceLastRun = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);

  // 24時間以上経過している場合
  return hoursSinceLastRun >= 24;
}

/**
 * パフォーマンスメトリクスを収集
 */
export async function collectPerformanceMetrics(): Promise<Record<string, any>> {
  const metrics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    database: {},
    storage: {},
    cache: {},
  };

  try {
    // データベースサイズ
    const dbSize = await estimateDatabaseSize();
    metrics.database = {
      estimatedSize: dbSize,
      tables: {},
    };

    // 各テーブルのレコード数
    const tables = ['problems', 'history', 'quizSets', 'spacedRepetitionCards', 'goals'];
    for (const tableName of tables) {
      try {
        const table = (db as any)[tableName];
        if (table) {
          metrics.database.tables[tableName] = await table.count();
        }
      } catch (error) {
        console.error(`[DataAggregator] テーブル${tableName}のメトリクス取得エラー:`, error);
      }
    }

    // ストレージ使用量
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      metrics.storage = {
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercent: estimate.quota ? (estimate.usage! / estimate.quota) * 100 : 0,
      };
    }

    // キャッシュサイズ
    if ('caches' in self) {
      const cacheNames = await caches.keys();
      metrics.cache = {
        count: cacheNames.length,
        names: cacheNames,
      };
    }

    return metrics;
  } catch (error) {
    console.error('[DataAggregator] メトリクス収集エラー:', error);
    return metrics;
  }
}

/**
 * データベースサイズを推定
 */
async function estimateDatabaseSize(): Promise<number> {
  try {
    // IndexedDBの正確なサイズを取得するのは難しいため、
    // レコード数から推定
    const problemsCount = await db.problems.count();
    const historyCount = await db.history.count();
    const cardsCount = await db.spacedRepetitionCards.count();

    // 概算: 問題=1KB, 履歴=0.5KB, カード=0.5KB
    const estimatedSize =
      problemsCount * 1024 + historyCount * 512 + cardsCount * 512;

    return estimatedSize;
  } catch (error) {
    console.error('[DataAggregator] データベースサイズ推定エラー:', error);
    return 0;
  }
}
