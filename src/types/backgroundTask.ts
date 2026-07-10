/**
 * バックグラウンドタスク型定義
 *
 * Service Workerで実行されるバックグラウンドタスクの型を定義
 */

/**
 * バックグラウンドタスクの種類
 */
export type BackgroundTaskType =
  | 'daily_stats'      // 日次統計集計
  | 'weekly_stats'     // 週次統計集計
  | 'monthly_stats'    // 月次統計集計
  | 'cleanup'          // データクリーンアップ
  | 'cache_optimize'   // キャッシュ最適化
  | 'sync';            // オフライン同期

/**
 * タスクステータス
 */
export type BackgroundTaskStatus = 'pending' | 'running' | 'success' | 'failed';

/**
 * バックグラウンドタスクログ
 */
export interface BackgroundTaskLog {
  id?: number;
  taskType: BackgroundTaskType;
  status: BackgroundTaskStatus;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: {
    itemsProcessed?: number;
    itemsDeleted?: number;
    cacheSize?: number;
    cacheSizeBefore?: number;
    cacheSizeAfter?: number;
    executionTime?: number;
    [key: string]: any;
  };
}

/**
 * 日次統計データ
 */
export interface DailyStatistics {
  id?: number;
  date: Date; // 統計対象日
  totalProblems: number;
  correctProblems: number;
  accuracy: number;
  studyTimeMinutes: number;
  quizSetsStudied: number;
  categoriesStudied: string[];
  streakDays: number;
  createdAt: Date;
}

/**
 * 週次統計データ
 */
export interface WeeklyStatistics {
  id?: number;
  weekStart: Date; // 週の開始日（月曜日）
  weekEnd: Date;   // 週の終了日（日曜日）
  totalProblems: number;
  correctProblems: number;
  accuracy: number;
  studyTimeMinutes: number;
  daysStudied: number; // 週のうち何日学習したか
  quizSetsStudied: number;
  averageDailyStudyTime: number;
  createdAt: Date;
}

/**
 * 月次統計データ
 */
export interface MonthlyStatistics {
  id?: number;
  year: number;
  month: number; // 1-12
  totalProblems: number;
  correctProblems: number;
  accuracy: number;
  studyTimeMinutes: number;
  daysStudied: number; // 月のうち何日学習したか
  quizSetsStudied: number;
  averageDailyStudyTime: number;
  createdAt: Date;
}

/**
 * 同期キューアイテム
 */
export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  entityType: 'problem' | 'quizSet' | 'history' | 'goal';
  entityId: number;
  data: any;
  createdAt: Date;
  syncedAt?: Date;
  retryCount: number;
  lastError?: string;
}

/**
 * クリーンアップ統計
 */
export interface CleanupStatistics {
  totalRecords: number;
  deletableRecords: number;
  estimatedSpaceSaved: number; // bytes
}

/**
 * キャッシュ統計
 */
export interface CacheStatistics {
  totalSize: number; // bytes
  itemCount: number;
  hitRate: number; // 0.0 - 1.0
  oldestItem: Date;
  cacheNames: string[];
}
