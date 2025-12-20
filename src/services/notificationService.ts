/**
 * 通知サービス
 *
 * Web Push APIを利用した通知システム
 * - 復習リマインダー（SM-2アルゴリズムベース）
 * - 目標達成通知
 * - ストリーク継続アラート
 * - 弱点検出通知
 */

import { db } from '../lib/database';
import { spacedRepetitionService } from '../lib/database';
import { getAllGoals } from './goalService';

/**
 * 通知タイプ
 */
export type NotificationType =
  | 'review_reminder'      // 復習リマインダー
  | 'goal_achieved'        // 目標達成
  | 'goal_progress'        // 目標進捗
  | 'streak_reminder'      // ストリーク継続
  | 'streak_achievement'   // ストリーク達成
  | 'weakness_detected'    // 弱点検出
  | 'study_time_milestone' // 学習時間マイルストーン
  | 'daily_reminder';      // 日次リマインダー

/**
 * 通知設定
 */
export interface NotificationSettings {
  enabled: boolean;
  reviewReminders: boolean;
  goalNotifications: boolean;
  streakReminders: boolean;
  weaknessAlerts: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:MM format
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
}

/**
 * 通知ペイロード
 */
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

/**
 * 通知履歴
 */
export interface NotificationHistory {
  id?: number;
  type: NotificationType;
  title: string;
  body: string;
  sentAt: Date;
  clicked: boolean;
  clickedAt?: Date;
}

const NOTIFICATION_SETTINGS_KEY = 'notificationSettings';
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  reviewReminders: true,
  goalNotifications: true,
  streakReminders: true,
  weaknessAlerts: true,
  dailyReminder: false,
  dailyReminderTime: '09:00',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

/**
 * 通知設定を取得
 */
export function getNotificationSettings(): NotificationSettings {
  try {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (error) {
    console.error('[NotificationService] 設定の取得に失敗:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 通知設定を保存
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    console.log('[NotificationService] 設定を保存しました:', settings);
  } catch (error) {
    console.error('[NotificationService] 設定の保存に失敗:', error);
  }
}

/**
 * 通知許可を要求
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    console.log('[NotificationService] 通知許可を要求中...');

    if (!('Notification' in window)) {
      console.warn('[NotificationService] このブラウザは通知をサポートしていません');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      console.log('[NotificationService] 通知許可は既に取得済みです');
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    console.log('[NotificationService] 通知許可の結果:', permission);

    // 許可が得られたら設定を有効化
    if (permission === 'granted') {
      const settings = getNotificationSettings();
      settings.enabled = true;
      saveNotificationSettings(settings);
    }

    return permission;
  } catch (error) {
    console.error('[NotificationService] 通知許可の要求に失敗:', error);
    return 'denied';
  }
}

/**
 * Push API サブスクリプションを登録
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    console.log('[NotificationService] Push通知をサブスクライブ中...');

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[NotificationService] Push APIがサポートされていません');
      return null;
    }

    // Service Workerの登録を待つ
    const registration = await navigator.serviceWorker.ready;

    // 既存のサブスクリプションを確認
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('[NotificationService] 既存のサブスクリプションが見つかりました');
      return subscription;
    }

    // VAPID公開鍵（本番環境では環境変数から取得）
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY ||
      'BDummy-VAPID-Key-For-Development-Replace-In-Production';

    // 新しいサブスクリプションを作成
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('[NotificationService] Push通知をサブスクライブしました:', subscription);

    // サブスクリプションをサーバーに送信（本番環境では実装が必要）
    // await sendSubscriptionToServer(subscription);

    return subscription;
  } catch (error) {
    console.error('[NotificationService] Push通知のサブスクライブに失敗:', error);
    return null;
  }
}

/**
 * VAPID鍵をBase64からUint8Arrayに変換
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * 通知を表示（ローカル通知）
 */
export async function showNotification(payload: NotificationPayload): Promise<void> {
  try {
    console.log('[NotificationService] 通知を表示中:', payload);

    // 通知許可の確認
    if (Notification.permission !== 'granted') {
      console.warn('[NotificationService] 通知許可が得られていません');
      return;
    }

    // 通知設定の確認
    const settings = getNotificationSettings();
    if (!settings.enabled) {
      console.log('[NotificationService] 通知が無効化されています');
      return;
    }

    // タイプ別の設定確認
    if (!shouldShowNotification(payload.type, settings)) {
      console.log('[NotificationService] この通知タイプは無効化されています:', payload.type);
      return;
    }

    // 静音時間の確認
    if (isQuietHours(settings)) {
      console.log('[NotificationService] 静音時間中のため通知をスキップします');
      return;
    }

    // Service Workerで通知を表示
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/badge-72.png',
        tag: payload.tag || `notification-${Date.now()}`,
        data: payload.data,
        requireInteraction: payload.requireInteraction || false,
      });
    } else {
      // フォールバック: ブラウザ標準通知
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
      });
    }

    // 通知履歴を保存
    await saveNotificationHistory({
      type: payload.type,
      title: payload.title,
      body: payload.body,
      sentAt: new Date(),
      clicked: false,
    });

    console.log('[NotificationService] 通知を表示しました');
  } catch (error) {
    console.error('[NotificationService] 通知の表示に失敗:', error);
  }
}

/**
 * 通知タイプが設定で有効か確認
 */
function shouldShowNotification(type: NotificationType, settings: NotificationSettings): boolean {
  switch (type) {
    case 'review_reminder':
      return settings.reviewReminders;
    case 'goal_achieved':
    case 'goal_progress':
      return settings.goalNotifications;
    case 'streak_reminder':
    case 'streak_achievement':
      return settings.streakReminders;
    case 'weakness_detected':
      return settings.weaknessAlerts;
    case 'daily_reminder':
      return settings.dailyReminder;
    default:
      return true;
  }
}

/**
 * 現在が静音時間かチェック
 */
function isQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHoursEnabled) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  if (startTime <= endTime) {
    // 同日内（例: 22:00 - 07:00の場合は日を跨ぐ）
    return currentTime >= startTime && currentTime < endTime;
  } else {
    // 日を跨ぐ（例: 22:00 - 07:00）
    return currentTime >= startTime || currentTime < endTime;
  }
}

/**
 * 通知履歴を保存
 */
async function saveNotificationHistory(history: NotificationHistory): Promise<void> {
  try {
    await db.notificationHistory.add(history);
  } catch (error) {
    console.error('[NotificationService] 通知履歴の保存に失敗:', error);
  }
}

/**
 * 復習リマインダーを生成
 */
export async function generateReviewReminders(): Promise<NotificationPayload[]> {
  try {
    console.log('[NotificationService] 復習リマインダーを生成中...');

    const dueCards = await spacedRepetitionService.getDueCards();

    if (dueCards.length === 0) {
      console.log('[NotificationService] 復習が必要なカードがありません');
      return [];
    }

    const notifications: NotificationPayload[] = [];

    // カードが5件以上ある場合は通知
    if (dueCards.length >= 5) {
      notifications.push({
        type: 'review_reminder',
        title: '📚 復習のお時間です',
        body: `${dueCards.length}件の問題が復習を待っています`,
        tag: 'review-reminder',
        requireInteraction: false,
        actions: [
          { action: 'review', title: '今すぐ復習' },
          { action: 'later', title: '後で' },
        ],
        data: { dueCount: dueCards.length },
      });
    }

    return notifications;
  } catch (error) {
    console.error('[NotificationService] 復習リマインダーの生成に失敗:', error);
    return [];
  }
}

/**
 * 目標達成通知を生成
 */
export async function generateGoalNotifications(): Promise<NotificationPayload[]> {
  try {
    console.log('[NotificationService] 目標通知を生成中...');

    const goals = await getAllGoals();
    const notifications: NotificationPayload[] = [];

    for (const goal of goals) {
      if (goal.status !== 'active') continue;

      const progress = (goal.currentValue / goal.targetValue) * 100;

      // 目標達成
      if (progress >= 100 && goal.status === 'active') {
        notifications.push({
          type: 'goal_achieved',
          title: '🎉 目標達成！',
          body: `「${goal.title}」を達成しました！`,
          tag: `goal-${goal.id}`,
          requireInteraction: true,
          data: { goalId: goal.id },
        });
      }
      // 進捗マイルストーン（50%, 75%）
      else if (progress >= 50 && progress < 60) {
        notifications.push({
          type: 'goal_progress',
          title: '📈 目標進捗 50%',
          body: `「${goal.title}」が半分達成されました！`,
          tag: `goal-progress-${goal.id}`,
          data: { goalId: goal.id, progress },
        });
      } else if (progress >= 75 && progress < 85) {
        notifications.push({
          type: 'goal_progress',
          title: '📈 目標進捗 75%',
          body: `「${goal.title}」があと少しです！`,
          tag: `goal-progress-${goal.id}`,
          data: { goalId: goal.id, progress },
        });
      }
    }

    return notifications;
  } catch (error) {
    console.error('[NotificationService] 目標通知の生成に失敗:', error);
    return [];
  }
}

/**
 * ストリーク通知を生成
 */
export async function generateStreakNotifications(): Promise<NotificationPayload[]> {
  try {
    console.log('[NotificationService] ストリーク通知を生成中...');

    const histories = await db.history.toArray();
    const notifications: NotificationPayload[] = [];

    // 連続学習日数を計算
    const sortedDates = histories
      .map(h => {
        const date = new Date(h.timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort((a, b) => b - a);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentDate = today;

    for (const dateTime of sortedDates) {
      if (dateTime === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (dateTime === currentDate.getTime() - 86400000) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // 今日まだ学習していない場合の継続リマインダー
    if (sortedDates[0] !== today.getTime() && streak > 0) {
      notifications.push({
        type: 'streak_reminder',
        title: `🔥 ${streak}日連続学習中！`,
        body: '今日も学習してストリークを継続しましょう',
        tag: 'streak-reminder',
        requireInteraction: false,
        actions: [
          { action: 'start', title: '今すぐ始める' },
          { action: 'dismiss', title: '後で' },
        ],
        data: { streak },
      });
    }

    // マイルストーン達成（7日、30日、100日）
    if ([7, 30, 100].includes(streak)) {
      notifications.push({
        type: 'streak_achievement',
        title: `🎊 ${streak}日連続達成！`,
        body: `素晴らしい継続力です！この調子で続けましょう`,
        tag: `streak-${streak}`,
        requireInteraction: true,
        data: { streak },
      });
    }

    return notifications;
  } catch (error) {
    console.error('[NotificationService] ストリーク通知の生成に失敗:', error);
    return [];
  }
}

/**
 * 日次リマインダーを生成
 */
export function generateDailyReminder(): NotificationPayload {
  const hour = new Date().getHours();
  let greeting = 'おはようございます';
  if (hour >= 12 && hour < 18) greeting = 'こんにちは';
  if (hour >= 18) greeting = 'こんばんは';

  return {
    type: 'daily_reminder',
    title: `📖 ${greeting}`,
    body: '今日も学習を始めましょう！',
    tag: 'daily-reminder',
    actions: [
      { action: 'start', title: '学習を始める' },
      { action: 'dismiss', title: '閉じる' },
    ],
  };
}

/**
 * すべての通知をチェックして送信
 */
export async function checkAndSendNotifications(): Promise<void> {
  try {
    console.log('[NotificationService] 通知をチェック中...');

    const settings = getNotificationSettings();
    if (!settings.enabled) {
      console.log('[NotificationService] 通知が無効化されています');
      return;
    }

    const allNotifications: NotificationPayload[] = [];

    // 復習リマインダー
    if (settings.reviewReminders) {
      const reviewNotifications = await generateReviewReminders();
      allNotifications.push(...reviewNotifications);
    }

    // 目標通知
    if (settings.goalNotifications) {
      const goalNotifications = await generateGoalNotifications();
      allNotifications.push(...goalNotifications);
    }

    // ストリーク通知
    if (settings.streakReminders) {
      const streakNotifications = await generateStreakNotifications();
      allNotifications.push(...streakNotifications);
    }

    // 各通知を表示
    for (const notification of allNotifications) {
      await showNotification(notification);
    }

    console.log(`[NotificationService] ${allNotifications.length}件の通知を送信しました`);
  } catch (error) {
    console.error('[NotificationService] 通知のチェックと送信に失敗:', error);
  }
}

/**
 * 通知履歴を取得
 */
export async function getNotificationHistory(limit: number = 50): Promise<NotificationHistory[]> {
  try {
    const history = await db.notificationHistory
      .orderBy('sentAt')
      .reverse()
      .limit(limit)
      .toArray();
    return history;
  } catch (error) {
    console.error('[NotificationService] 通知履歴の取得に失敗:', error);
    return [];
  }
}

/**
 * 通知をクリック済みにマーク
 */
export async function markNotificationAsClicked(id: number): Promise<void> {
  try {
    await db.notificationHistory.update(id, {
      clicked: true,
      clickedAt: new Date(),
    });
  } catch (error) {
    console.error('[NotificationService] 通知のマークに失敗:', error);
  }
}

/**
 * 古い通知履歴を削除（30日より古いもの）
 */
export async function cleanupOldNotifications(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldNotifications = await db.notificationHistory
      .where('sentAt')
      .below(thirtyDaysAgo)
      .toArray();

    if (oldNotifications.length > 0) {
      await db.notificationHistory.bulkDelete(oldNotifications.map(n => n.id!));
      console.log(`[NotificationService] ${oldNotifications.length}件の古い通知を削除しました`);
    }
  } catch (error) {
    console.error('[NotificationService] 古い通知の削除に失敗:', error);
  }
}
