/**
 * データクリーンアップワーカー
 *
 * 古いデータや孤立したデータを自動削除してストレージを最適化
 */

import { db } from '../lib/database';
import type { CleanupStatistics } from '../types/backgroundTask';

/**
 * クリーンアップ設定
 */
export interface CleanupConfig {
  retentionDays: number; // データ保持期間（日）
  batchSize: number; // 一度に削除する件数
  deleteOrphanedData: boolean; // 孤立データを削除するか
  deleteOldNotifications: boolean; // 古い通知履歴を削除するか
  deleteOldSessions: boolean; // 古いセッション分析を削除するか
}

const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  retentionDays: 365, // 1年間保持
  batchSize: 1000, // 1000件ずつ削除
  deleteOrphanedData: true,
  deleteOldNotifications: true,
  deleteOldSessions: true,
};

/**
 * クリーンアップ設定を取得
 */
function getCleanupConfig(): CleanupConfig {
  try {
    const saved = localStorage.getItem('dataCleanupConfig');
    if (saved) {
      return { ...DEFAULT_CLEANUP_CONFIG, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('[DataCleanup] 設定の取得に失敗:', error);
  }
  return DEFAULT_CLEANUP_CONFIG;
}

/**
 * クリーンアップ設定を保存
 */
export function saveCleanupConfig(config: Partial<CleanupConfig>): void {
  try {
    const current = getCleanupConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('dataCleanupConfig', JSON.stringify(updated));
    console.log('[DataCleanup] 設定を保存しました:', updated);
  } catch (error) {
    console.error('[DataCleanup] 設定の保存に失敗:', error);
  }
}

/**
 * 古いデータをクリーンアップ
 *
 * @param retentionDays データ保持期間（デフォルト: 365日）
 * @returns クリーンアップ統計
 */
export async function cleanupOldData(retentionDays?: number): Promise<CleanupStatistics> {
  const config = getCleanupConfig();
  const retention = retentionDays || config.retentionDays;

  console.log(`[DataCleanup] ${retention}日より古いデータをクリーンアップ中...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retention);
  const cutoffTimestamp = cutoffDate.getTime();

  let totalRecords = 0;
  let deletableRecords = 0;
  let estimatedSpaceSaved = 0;

  try {
    // 1. 古い通知履歴を削除
    if (config.deleteOldNotifications) {
      const oldNotifications = await db.notificationHistory
        .where('sentAt')
        .below(cutoffTimestamp)
        .toArray();

      if (oldNotifications.length > 0) {
        const idsToDelete = oldNotifications.map(n => n.id!);
        await db.notificationHistory.bulkDelete(idsToDelete);
        deletableRecords += oldNotifications.length;
        estimatedSpaceSaved += oldNotifications.length * 512; // 概算512バイト/通知
        console.log(`[DataCleanup] 古い通知履歴を削除: ${oldNotifications.length}件`);
      }
    }

    // 2. 古いセッション分析データを削除（90日より古い）
    if (config.deleteOldSessions) {
      const sessionCutoff = new Date();
      sessionCutoff.setDate(sessionCutoff.getDate() - 90);
      const sessionCutoffTimestamp = sessionCutoff.getTime();

      const oldSessions = await db.sessionAnalytics
        .where('sessionStartTime')
        .below(sessionCutoffTimestamp)
        .toArray();

      if (oldSessions.length > 0) {
        const idsToDelete = oldSessions.map(s => s.id!);
        await db.sessionAnalytics.bulkDelete(idsToDelete);
        deletableRecords += oldSessions.length;
        estimatedSpaceSaved += oldSessions.length * 2048; // 概算2KB/セッション
        console.log(`[DataCleanup] 古いセッション分析を削除: ${oldSessions.length}件`);
      }

      // 関連する回答分析も削除
      const oldAnswerAnalytics = await db.answerAnalytics
        .where('answerStartTime')
        .below(sessionCutoffTimestamp)
        .toArray();

      if (oldAnswerAnalytics.length > 0) {
        const idsToDelete = oldAnswerAnalytics.map(a => a.id!);
        await db.answerAnalytics.bulkDelete(idsToDelete);
        deletableRecords += oldAnswerAnalytics.length;
        estimatedSpaceSaved += oldAnswerAnalytics.length * 1024; // 概算1KB/回答
        console.log(`[DataCleanup] 古い回答分析を削除: ${oldAnswerAnalytics.length}件`);
      }
    }

    // 3. 孤立したデータを削除
    if (config.deleteOrphanedData) {
      const orphanedStats = await cleanupOrphanedData();
      deletableRecords += orphanedStats.deletableRecords;
      estimatedSpaceSaved += orphanedStats.estimatedSpaceSaved;
    }

    // 4. 古いバックグラウンドタスクログを削除（30日より古い）
    const taskLogCutoff = new Date();
    taskLogCutoff.setDate(taskLogCutoff.getDate() - 30);
    const taskLogCutoffTimestamp = taskLogCutoff.getTime();

    const oldTaskLogs = await db.backgroundTaskLog
      .where('startedAt')
      .below(taskLogCutoffTimestamp)
      .toArray();

    if (oldTaskLogs.length > 0) {
      const idsToDelete = oldTaskLogs.map(t => t.id!);
      await db.backgroundTaskLog.bulkDelete(idsToDelete);
      deletableRecords += oldTaskLogs.length;
      estimatedSpaceSaved += oldTaskLogs.length * 256; // 概算256バイト/ログ
      console.log(`[DataCleanup] 古いタスクログを削除: ${oldTaskLogs.length}件`);
    }

    // 5. 統計データのカウント
    totalRecords = await getTotalRecordCount();

    const stats: CleanupStatistics = {
      totalRecords,
      deletableRecords,
      estimatedSpaceSaved,
    };

    console.log('[DataCleanup] クリーンアップ完了:', stats);

    // 結果を保存
    saveCleanupResult(stats);

    return stats;
  } catch (error) {
    console.error('[DataCleanup] クリーンアップエラー:', error);
    throw error;
  }
}

/**
 * 孤立したデータを削除
 */
export async function cleanupOrphanedData(): Promise<{ deletableRecords: number; estimatedSpaceSaved: number }> {
  console.log('[DataCleanup] 孤立したデータを検出中...');

  let deletableRecords = 0;
  let estimatedSpaceSaved = 0;

  try {
    // 1. 無効なカテゴリーの問題を検出
    const allProblems = await db.problems.toArray();
    const allCategories = await db.categories.toArray();
    const validCategoryNames = new Set(allCategories.map(c => c.name));

    const orphanedProblems = allProblems.filter(
      p => p.category && !validCategoryNames.has(p.category)
    );

    if (orphanedProblems.length > 0) {
      console.log(`[DataCleanup] 孤立した問題を検出: ${orphanedProblems.length}件`);
      // 実際には削除せず、カウントのみ（安全のため）
      // 本番環境では削除を有効化できます
      // await db.problems.bulkDelete(orphanedProblems.map(p => p.id!));
      deletableRecords += orphanedProblems.length;
      estimatedSpaceSaved += orphanedProblems.length * 1024; // 概算1KB/問題
    }

    // 2. 削除された問題の履歴を検出
    const allHistory = await db.history.toArray();
    const validProblemIds = new Set(allProblems.map(p => p.id));

    const orphanedHistory = allHistory.filter(
      h => h.problemId && !validProblemIds.has(h.problemId)
    );

    if (orphanedHistory.length > 0) {
      console.log(`[DataCleanup] 孤立した履歴を検出: ${orphanedHistory.length}件`);
      // 実際には削除せず、カウントのみ
      // await db.history.bulkDelete(orphanedHistory.map(h => h.id!));
      deletableRecords += orphanedHistory.length;
      estimatedSpaceSaved += orphanedHistory.length * 512; // 概算512バイト/履歴
    }

    // 3. 削除された問題のSM-2カードを削除
    const allCards = await db.spacedRepetitionCards.toArray();
    const orphanedCards = allCards.filter(
      c => c.problemId && !validProblemIds.has(c.problemId)
    );

    if (orphanedCards.length > 0) {
      const idsToDelete = orphanedCards.map(c => c.id!);
      await db.spacedRepetitionCards.bulkDelete(idsToDelete);
      deletableRecords += orphanedCards.length;
      estimatedSpaceSaved += orphanedCards.length * 512; // 概算512バイト/カード
      console.log(`[DataCleanup] 孤立したSM-2カードを削除: ${orphanedCards.length}件`);
    }

    // 4. 重複したカテゴリ統計を削除
    const categoryStats = await db.categoryStats.toArray();
    const categoryMap = new Map<string, number[]>();

    for (const stat of categoryStats) {
      const existing = categoryMap.get(stat.category) || [];
      existing.push(stat.id!);
      categoryMap.set(stat.category, existing);
    }

    const duplicateIds: number[] = [];
    for (const [, ids] of categoryMap) {
      if (ids.length > 1) {
        // 最新のもの以外を削除対象とする
        const stats = await db.categoryStats
          .where('id')
          .anyOf(ids)
          .toArray();

        stats.sort((a, b) => {
          const aTime = a.analyzedAt ? new Date(a.analyzedAt).getTime() : 0;
          const bTime = b.analyzedAt ? new Date(b.analyzedAt).getTime() : 0;
          return bTime - aTime;
        });

        // 最新のもの以外を削除
        for (let i = 1; i < stats.length; i++) {
          duplicateIds.push(stats[i].id!);
        }
      }
    }

    if (duplicateIds.length > 0) {
      await db.categoryStats.bulkDelete(duplicateIds);
      deletableRecords += duplicateIds.length;
      estimatedSpaceSaved += duplicateIds.length * 256; // 概算256バイト/統計
      console.log(`[DataCleanup] 重複したカテゴリ統計を削除: ${duplicateIds.length}件`);
    }

    return {
      deletableRecords,
      estimatedSpaceSaved,
    };
  } catch (error) {
    console.error('[DataCleanup] 孤立データのクリーンアップエラー:', error);
    return {
      deletableRecords: 0,
      estimatedSpaceSaved: 0,
    };
  }
}

/**
 * データ整合性を検証
 */
export async function validateDataIntegrity(): Promise<{ errors: string[]; fixed: number }> {
  console.log('[DataCleanup] データ整合性を検証中...');

  const errors: string[] = [];
  let fixed = 0;

  try {
    // 1. 問題とカテゴリーの整合性チェック
    const problems = await db.problems.toArray();
    const categories = await db.categories.toArray();
    const validCategoryNames = new Set(categories.map(c => c.name));

    const invalidProblems = problems.filter(
      p => p.category && !validCategoryNames.has(p.category)
    );

    if (invalidProblems.length > 0) {
      errors.push(`${invalidProblems.length}件の問題が無効なカテゴリーを参照しています`);
    }

    // 2. 履歴と問題の整合性チェック
    const history = await db.history.toArray();
    const validProblemIds = new Set(problems.map(p => p.id));

    const invalidHistory = history.filter(
      h => h.problemId && !validProblemIds.has(h.problemId)
    );

    if (invalidHistory.length > 0) {
      errors.push(`${invalidHistory.length}件の履歴が無効な問題を参照しています`);
    }

    // 3. SM-2カードと問題の整合性チェック
    const cards = await db.spacedRepetitionCards.toArray();
    const invalidCards = cards.filter(
      c => c.problemId && !validProblemIds.has(c.problemId)
    );

    if (invalidCards.length > 0) {
      errors.push(`${invalidCards.length}件のSM-2カードが無効な問題を参照しています`);
      // 自動修正: 無効なカードを削除
      await db.spacedRepetitionCards.bulkDelete(invalidCards.map(c => c.id!));
      fixed += invalidCards.length;
    }

    // 4. 目標とカテゴリーの整合性チェック
    const goals = await db.goals.toArray();
    const invalidGoals = goals.filter(
      g => g.category && !validCategoryNames.has(g.category)
    );

    if (invalidGoals.length > 0) {
      errors.push(`${invalidGoals.length}件の目標が無効なクイズセットを参照しています`);
    }

    console.log('[DataCleanup] 整合性検証完了:', { errors: errors.length, fixed });

    return { errors, fixed };
  } catch (error) {
    console.error('[DataCleanup] 整合性検証エラー:', error);
    return { errors: [`検証エラー: ${error}`], fixed: 0 };
  }
}

/**
 * クリーンアップ統計を取得
 */
export async function getCleanupStatistics(): Promise<CleanupStatistics> {
  try {
    const totalRecords = await getTotalRecordCount();

    // 削除可能なレコード数を概算
    const config = getCleanupConfig();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);
    const cutoffTimestamp = cutoffDate.getTime();

    let deletableRecords = 0;

    // 古い通知
    if (config.deleteOldNotifications) {
      const oldNotifications = await db.notificationHistory
        .where('sentAt')
        .below(cutoffTimestamp)
        .count();
      deletableRecords += oldNotifications;
    }

    // 古いセッション
    if (config.deleteOldSessions) {
      const sessionCutoff = new Date();
      sessionCutoff.setDate(sessionCutoff.getDate() - 90);
      const oldSessions = await db.sessionAnalytics
        .where('sessionStartTime')
        .below(sessionCutoff.getTime())
        .count();
      deletableRecords += oldSessions;
    }

    const estimatedSpaceSaved = deletableRecords * 512; // 概算512バイト/レコード

    return {
      totalRecords,
      deletableRecords,
      estimatedSpaceSaved,
    };
  } catch (error) {
    console.error('[DataCleanup] 統計取得エラー:', error);
    return {
      totalRecords: 0,
      deletableRecords: 0,
      estimatedSpaceSaved: 0,
    };
  }
}

// ===== ヘルパー関数 =====

/**
 * 全レコード数を取得
 */
async function getTotalRecordCount(): Promise<number> {
  try {
    const tables = [
      'problems',
      'history',
      'quizSets',
      'spacedRepetitionCards',
      'goals',
      'categoryStats',
      'notificationHistory',
      'sessionAnalytics',
      'answerAnalytics',
    ];

    let total = 0;
    for (const tableName of tables) {
      try {
        const table = (db as any)[tableName];
        if (table) {
          const count = await table.count();
          total += count;
        }
      } catch (error) {
        console.error(`[DataCleanup] テーブル${tableName}のカウント取得エラー:`, error);
      }
    }

    return total;
  } catch (error) {
    console.error('[DataCleanup] レコード数取得エラー:', error);
    return 0;
  }
}

/**
 * クリーンアップ結果を保存
 */
function saveCleanupResult(stats: CleanupStatistics): void {
  try {
    localStorage.setItem('lastCleanupResult', JSON.stringify(stats));
    localStorage.setItem('lastCleanupTime', new Date().toISOString());
  } catch (error) {
    console.error('[DataCleanup] 結果の保存に失敗:', error);
  }
}

/**
 * 最後のクリーンアップ結果を取得
 */
export function getLastCleanupResult(): CleanupStatistics | null {
  try {
    const saved = localStorage.getItem('lastCleanupResult');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('[DataCleanup] 最後のクリーンアップ結果の取得に失敗:', error);
  }
  return null;
}

/**
 * 最後のクリーンアップ時刻を取得
 */
export function getLastCleanupTime(): Date | null {
  try {
    const saved = localStorage.getItem('lastCleanupTime');
    if (saved) {
      return new Date(saved);
    }
  } catch (error) {
    console.error('[DataCleanup] 最後のクリーンアップ時刻の取得に失敗:', error);
  }
  return null;
}
