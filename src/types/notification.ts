/**
 * 通知システムの型定義
 */

/**
 * 通知許可の状態
 */
export type NotificationPermission = 'granted' | 'denied' | 'default';

/**
 * 通知タイプ
 */
export type NotificationType =
  | 'review_reminder'      // 復習リマインダー
  | 'goal_achievement'     // 目標達成通知
  | 'streak_alert'         // ストリーク継続アラート
  | 'test';                // テスト通知

/**
 * 通知頻度
 */
export type NotificationFrequency = 'daily' | 'weekly' | 'disabled';

/**
 * 通知設定
 */
export interface NotificationSettings {
  id: number;
  enabled: boolean;
  permission: NotificationPermission;

  // 復習リマインダー
  reviewReminderEnabled: boolean;
  reviewReminderTime: string; // HH:mm format (e.g., "19:00")
  reviewReminderFrequency: NotificationFrequency;

  // 目標達成通知
  goalAchievementEnabled: boolean;

  // ストリーク継続アラート
  streakAlertEnabled: boolean;
  streakAlertTime: string; // HH:mm format (e.g., "18:00")

  // Push API サブスクリプション（JSON形式で保存）
  subscriptionJson: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * 通知データ
 */
export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  url?: string; // 通知クリック時に開くURL
}

/**
 * 復習リマインダーのデータ
 */
export interface ReviewReminderData {
  type: 'review_reminder';
  cardCount: number;
  categories: Array<{
    category: string;
    count: number;
  }>;
  urgentCards: number; // 優先度の高いカード数
}

/**
 * 目標達成通知のデータ
 */
export interface GoalAchievementData {
  type: 'goal_achievement';
  goalId: number;
  goalTitle: string;
  targetValue: number;
  currentValue: number;
}

/**
 * ストリーク継続アラートのデータ
 */
export interface StreakAlertData {
  type: 'streak_alert';
  streakDays: number;
  message: string;
}

/**
 * Push サブスクリプション（PushSubscription の型定義）
 */
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * 通知スケジュール
 */
export interface NotificationSchedule {
  id: number;
  type: NotificationType;
  scheduledTime: Date;
  executed: boolean;
  executedAt?: Date;
  data: Record<string, any>;
  createdAt: Date;
}

/**
 * 通知履歴
 */
export interface NotificationHistory {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  sentAt: Date;
  clicked: boolean;
  clickedAt?: Date;
}
