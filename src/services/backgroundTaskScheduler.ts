/**
 * バックグラウンドタスクスケジューラー
 *
 * Service Workerのバックグラウンドタスクを管理・スケジュール
 */

import {
  runAggregationTasks,
  getLastAggregationResult,
  getLastAggregationTime,
  getNextAggregationTime,
  shouldRunAggregation,
  collectPerformanceMetrics,
  type AggregationResult,
} from '../workers/dataAggregator';

/**
 * タスクタイプ
 */
export type BackgroundTaskType =
  | 'data-aggregation'
  | 'cache-cleanup'
  | 'notification-check'
  | 'background-backup';

/**
 * タスクスケジュール設定
 */
export interface TaskSchedule {
  enabled: boolean;
  intervalHours: number;
  lastRun?: Date;
  nextRun?: Date;
}

/**
 * スケジュール設定
 */
export interface SchedulerConfig {
  dataAggregation: TaskSchedule;
  cacheCleanup: TaskSchedule;
  notificationCheck: TaskSchedule;
  backgroundBackup: TaskSchedule;
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  dataAggregation: {
    enabled: true,
    intervalHours: 24, // 24時間ごと
  },
  cacheCleanup: {
    enabled: true,
    intervalHours: 168, // 7日ごと
  },
  notificationCheck: {
    enabled: true,
    intervalHours: 1, // 1時間ごと
  },
  backgroundBackup: {
    enabled: false,
    intervalHours: 168, // 7日ごと（デフォルトは無効）
  },
};

/**
 * スケジューラー設定を取得
 */
export function getSchedulerConfig(): SchedulerConfig {
  try {
    const saved = localStorage.getItem('backgroundTaskSchedulerConfig');
    if (saved) {
      const config = JSON.parse(saved);
      // Dateオブジェクトに変換
      Object.keys(config).forEach((key) => {
        if (config[key].lastRun) {
          config[key].lastRun = new Date(config[key].lastRun);
        }
        if (config[key].nextRun) {
          config[key].nextRun = new Date(config[key].nextRun);
        }
      });
      return { ...DEFAULT_SCHEDULER_CONFIG, ...config };
    }
  } catch (error) {
    console.error('[BackgroundTaskScheduler] 設定の取得に失敗:', error);
  }
  return DEFAULT_SCHEDULER_CONFIG;
}

/**
 * スケジューラー設定を保存
 */
export function saveSchedulerConfig(config: SchedulerConfig): void {
  try {
    localStorage.setItem('backgroundTaskSchedulerConfig', JSON.stringify(config));
    console.log('[BackgroundTaskScheduler] 設定を保存しました');
  } catch (error) {
    console.error('[BackgroundTaskScheduler] 設定の保存に失敗:', error);
  }
}

/**
 * Service Workerにタスクを登録
 */
export async function scheduleBackgroundTask(taskType: BackgroundTaskType): Promise<boolean> {
  try {
    console.log(`[BackgroundTaskScheduler] タスクをスケジュール: ${taskType}`);

    if (!('serviceWorker' in navigator)) {
      console.warn('[BackgroundTaskScheduler] Service Workerがサポートされていません');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // Background Sync APIを使用
    if ('sync' in registration) {
      await (registration as any).sync.register(taskType);
      console.log(`[BackgroundTaskScheduler] タスクを登録しました: ${taskType}`);
      return true;
    } else {
      console.warn('[BackgroundTaskScheduler] Background Sync APIがサポートされていません');
      // フォールバック: 直接実行
      await triggerTaskDirectly(taskType);
      return true;
    }
  } catch (error) {
    console.error('[BackgroundTaskScheduler] タスクのスケジュールに失敗:', error);
    return false;
  }
}

/**
 * タスクを直接実行（Background Sync非対応時のフォールバック）
 */
async function triggerTaskDirectly(taskType: BackgroundTaskType): Promise<void> {
  console.log(`[BackgroundTaskScheduler] タスクを直接実行: ${taskType}`);

  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if (registration.active) {
    registration.active.postMessage({
      type: taskType === 'data-aggregation' ? 'CHECK_NOTIFICATIONS' : 'SCHEDULE_BACKUP',
    });
  }
}

/**
 * すべてのタスクを初期化・スケジュール
 */
export async function initializeBackgroundTasks(): Promise<void> {
  console.log('[BackgroundTaskScheduler] バックグラウンドタスクを初期化中...');

  try {
    const config = getSchedulerConfig();

    // データ集計タスク
    if (config.dataAggregation.enabled) {
      if (shouldRunAggregation()) {
        console.log('[BackgroundTaskScheduler] データ集計を実行します');
        await scheduleBackgroundTask('data-aggregation');
      } else {
        const nextRun = getNextAggregationTime();
        console.log(`[BackgroundTaskScheduler] 次回データ集計: ${nextRun.toISOString()}`);
      }
    }

    // 通知チェックタスク
    if (config.notificationCheck.enabled) {
      await scheduleBackgroundTask('notification-check');
    }

    // キャッシュクリーンアップタスク
    if (config.cacheCleanup.enabled && shouldRunTask(config.cacheCleanup)) {
      await scheduleBackgroundTask('cache-cleanup');
      config.cacheCleanup.lastRun = new Date();
      saveSchedulerConfig(config);
    }

    // バックアップタスク
    if (config.backgroundBackup.enabled && shouldRunTask(config.backgroundBackup)) {
      await scheduleBackgroundTask('background-backup');
      config.backgroundBackup.lastRun = new Date();
      saveSchedulerConfig(config);
    }

    console.log('[BackgroundTaskScheduler] 初期化完了');
  } catch (error) {
    console.error('[BackgroundTaskScheduler] 初期化に失敗:', error);
  }
}

/**
 * タスクを実行すべきかチェック
 */
function shouldRunTask(schedule: TaskSchedule): boolean {
  if (!schedule.enabled) {
    return false;
  }

  if (!schedule.lastRun) {
    return true; // 初回実行
  }

  const hoursSinceLastRun =
    (Date.now() - schedule.lastRun.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastRun >= schedule.intervalHours;
}

/**
 * 手動でデータ集計を実行
 */
export async function runDataAggregationNow(): Promise<AggregationResult> {
  console.log('[BackgroundTaskScheduler] データ集計を手動実行中...');

  try {
    const result = await runAggregationTasks();
    console.log('[BackgroundTaskScheduler] データ集計完了:', result);
    return result;
  } catch (error) {
    console.error('[BackgroundTaskScheduler] データ集計エラー:', error);
    return {
      success: false,
      tasksCompleted: [],
      errors: [`実行エラー: ${error}`],
      duration: 0,
      timestamp: new Date(),
    };
  }
}

/**
 * 集計ステータスを取得
 */
export interface AggregationStatus {
  lastRun: Date | null;
  lastResult: AggregationResult | null;
  nextRun: Date;
  isRunning: boolean;
}

export function getAggregationStatus(): AggregationStatus {
  const lastRun = getLastAggregationTime();
  const lastResult = getLastAggregationResult();
  const nextRun = getNextAggregationTime();

  return {
    lastRun,
    lastResult,
    nextRun,
    isRunning: false, // TODO: 実行中フラグの実装
  };
}

/**
 * パフォーマンス統計を取得
 */
export async function getPerformanceStats(): Promise<{
  database: any;
  storage: any;
  cache: any;
  aggregation: AggregationStatus;
}> {
  const metrics = await collectPerformanceMetrics();
  const aggregation = getAggregationStatus();

  return {
    database: metrics.database,
    storage: metrics.storage,
    cache: metrics.cache,
    aggregation,
  };
}

/**
 * すべてのバックグラウンドタスクを有効化
 */
export async function enableAllBackgroundTasks(): Promise<void> {
  const config = getSchedulerConfig();

  config.dataAggregation.enabled = true;
  config.cacheCleanup.enabled = true;
  config.notificationCheck.enabled = true;

  saveSchedulerConfig(config);
  await initializeBackgroundTasks();

  console.log('[BackgroundTaskScheduler] すべてのタスクを有効化しました');
}

/**
 * すべてのバックグラウンドタスクを無効化
 */
export function disableAllBackgroundTasks(): void {
  const config = getSchedulerConfig();

  config.dataAggregation.enabled = false;
  config.cacheCleanup.enabled = false;
  config.notificationCheck.enabled = false;
  config.backgroundBackup.enabled = false;

  saveSchedulerConfig(config);

  console.log('[BackgroundTaskScheduler] すべてのタスクを無効化しました');
}

/**
 * 特定のタスクを有効化/無効化
 */
export async function setTaskEnabled(
  taskType: Exclude<BackgroundTaskType, 'notification-check'>,
  enabled: boolean
): Promise<void> {
  const config = getSchedulerConfig();

  switch (taskType) {
    case 'data-aggregation':
      config.dataAggregation.enabled = enabled;
      break;
    case 'cache-cleanup':
      config.cacheCleanup.enabled = enabled;
      break;
    case 'background-backup':
      config.backgroundBackup.enabled = enabled;
      break;
  }

  saveSchedulerConfig(config);

  if (enabled) {
    await scheduleBackgroundTask(taskType);
  }

  console.log(`[BackgroundTaskScheduler] ${taskType}を${enabled ? '有効化' : '無効化'}しました`);
}

/**
 * タスクの実行間隔を設定
 */
export function setTaskInterval(
  taskType: Exclude<BackgroundTaskType, 'notification-check'>,
  intervalHours: number
): void {
  const config = getSchedulerConfig();

  switch (taskType) {
    case 'data-aggregation':
      config.dataAggregation.intervalHours = intervalHours;
      break;
    case 'cache-cleanup':
      config.cacheCleanup.intervalHours = intervalHours;
      break;
    case 'background-backup':
      config.backgroundBackup.intervalHours = intervalHours;
      break;
  }

  saveSchedulerConfig(config);

  console.log(`[BackgroundTaskScheduler] ${taskType}の実行間隔を${intervalHours}時間に設定しました`);
}

/**
 * Service Workerからのメッセージを処理
 */
export function setupBackgroundTaskListeners(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('[BackgroundTaskScheduler] Service Workerからメッセージ:', event.data);

    if (event.data.type === 'AGGREGATION_COMPLETED') {
      console.log('[BackgroundTaskScheduler] データ集計が完了しました:', event.data.result);

      // UIを更新するイベントを発火
      window.dispatchEvent(
        new CustomEvent('background-aggregation-completed', {
          detail: event.data.result,
        })
      );
    }

    if (event.data.type === 'CACHE_CLEANUP_COMPLETED') {
      console.log('[BackgroundTaskScheduler] キャッシュクリーンアップが完了しました');

      window.dispatchEvent(new CustomEvent('cache-cleanup-completed'));
    }
  });

  console.log('[BackgroundTaskScheduler] イベントリスナーをセットアップしました');
}
