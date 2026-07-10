/**
 * 通知サービス
 * Web Push API、Notification APIを使用して通知を管理
 */

import { db } from '../lib/database';
import type {
  NotificationSettings,
  NotificationData,
  ReviewReminderData,
  GoalAchievementData,
  StreakAlertData,
} from '../types';
import { debugLog } from '../utils/debug';

/**
 * デフォルトの通知設定
 */
const DEFAULT_SETTINGS: Omit<NotificationSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  enabled: false,
  permission: 'default',
  reviewReminderEnabled: true,
  reviewReminderTime: '19:00',
  reviewReminderFrequency: 'daily',
  goalAchievementEnabled: true,
  streakAlertEnabled: true,
  streakAlertTime: '18:00',
  subscriptionJson: null,
};

/**
 * 通知サービスクラス
 */
class NotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private settings: NotificationSettings | null = null;

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    debugLog('🔔 通知サービスを初期化中...');

    try {
      // Service Worker登録を取得（タイムアウト付き）
      if ('serviceWorker' in navigator) {
        try {
          // タイムアウト2秒でService Worker readyを待つ
          const swResult = await Promise.race([
            navigator.serviceWorker.ready.then(reg => reg),
            new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 2000)
            )
          ]);
          if (swResult) {
            this.serviceWorkerRegistration = swResult;
            debugLog('✅ Service Worker準備完了');
          } else {
            debugLog('⚠️  Service Worker登録待機タイムアウト（アプリは継続）');
            this.serviceWorkerRegistration = null;
          }
        } catch (swError) {
          debugLog('⚠️  Service Worker登録エラー（アプリは継続）:', swError);
          this.serviceWorkerRegistration = null;
        }
      }

      // 設定を読み込み
      await this.loadSettings();

      debugLog('✅ 通知サービス初期化完了');
    } catch (error) {
      debugLog('❌ 通知サービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 設定を読み込み
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await db.notificationSettings.toArray();

      if (settings.length === 0) {
        // 初回起動時: デフォルト設定を保存
        const id = await db.notificationSettings.add({
          ...DEFAULT_SETTINGS,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as NotificationSettings);
        this.settings = {
          id: id as number,
          ...DEFAULT_SETTINGS,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        debugLog('📝 デフォルト通知設定を作成しました');
      } else {
        this.settings = settings[0];
        debugLog('📝 通知設定を読み込みました:', this.settings);
      }
    } catch (error) {
      debugLog('❌ 通知設定の読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * 通知許可をリクエスト
   */
  async requestPermission(): Promise<NotificationPermission> {
    debugLog('🔔 通知許可をリクエスト中...');

    if (!('Notification' in window)) {
      debugLog('❌ このブラウザは通知をサポートしていません');
      throw new Error('Notifications are not supported in this browser');
    }

    try {
      const permission = await Notification.requestPermission();
      debugLog(`✅ 通知許可結果: ${permission}`);

      // 設定を更新
      await this.updateSettings({ permission });

      return permission;
    } catch (error) {
      debugLog('❌ 通知許可リクエストエラー:', error);
      throw error;
    }
  }

  /**
   * Push APIにサブスクライブ
   */
  async subscribe(): Promise<PushSubscription | null> {
    debugLog('📡 Push APIにサブスクライブ中...');

    if (!this.serviceWorkerRegistration) {
      debugLog('❌ Service Worker未登録');
      throw new Error('Service Worker not registered');
    }

    if (!('PushManager' in window)) {
      debugLog('❌ このブラウザはPush APIをサポートしていません');
      return null;
    }

    try {
      // 既存のサブスクリプションを確認
      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();

      if (!subscription) {
        // 新しいサブスクリプションを作成
        // Note: VAPID公開鍵が必要（本番環境では環境変数から取得）
        const vapidPublicKey = this.getVapidPublicKey();

        subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
        });

        debugLog('✅ 新しいPushサブスクリプションを作成しました');
      } else {
        debugLog('✅ 既存のPushサブスクリプションを使用します');
      }

      // サブスクリプションをJSON形式で保存
      const subscriptionJson = JSON.stringify(subscription.toJSON());
      await this.updateSettings({ subscriptionJson });

      // サーバーにサブスクリプションを登録（認証済みの場合）
      await this.registerSubscriptionOnServer(subscription);

      return subscription;
    } catch (error) {
      debugLog('❌ Pushサブスクリプションエラー:', error);
      throw error;
    }
  }

  /**
   * Push APIからアンサブスクライブ
   */
  async unsubscribe(): Promise<void> {
    debugLog('📡 Push APIからアンサブスクライブ中...');

    if (!this.serviceWorkerRegistration) {
      return;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();

      if (subscription) {
        // サーバーからも解除
        await this.unregisterSubscriptionOnServer(subscription.endpoint);
        await subscription.unsubscribe();
        debugLog('✅ Pushサブスクリプションを解除しました');
      }

      await this.updateSettings({ subscriptionJson: null });
    } catch (error) {
      debugLog('❌ Pushアンサブスクリプションエラー:', error);
      throw error;
    }
  }

  /**
   * 現在のサブスクリプションを取得
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      return null;
    }

    try {
      return await this.serviceWorkerRegistration.pushManager.getSubscription();
    } catch (error) {
      debugLog('❌ サブスクリプション取得エラー:', error);
      return null;
    }
  }

  /**
   * 通知を送信（ローカル通知）
   */
  async sendNotification(data: NotificationData): Promise<void> {
    debugLog('🔔 通知を送信中:', data);

    // 通知許可を確認
    if (!this.settings || this.settings.permission !== 'granted') {
      debugLog('❌ 通知許可がありません');
      return;
    }

    try {
      if (this.serviceWorkerRegistration) {
        // Service Worker経由で通知を送信
        await this.serviceWorkerRegistration.showNotification(data.title, {
          body: data.body,
          icon: data.icon || '/icon-192x192.png',
          badge: data.badge || '/badge-72x72.png',
          tag: data.tag,
          data: { ...data.data, url: data.url },
          requireInteraction: false,
          silent: false,
        });
      } else {
        // フォールバック: 直接通知を作成
        new Notification(data.title, {
          body: data.body,
          icon: data.icon || '/icon-192x192.png',
          tag: data.tag,
          data: { url: data.url },
        });
      }

      // 通知履歴を保存
      await this.saveNotificationHistory(data);

      debugLog('✅ 通知送信完了');
    } catch (error) {
      debugLog('❌ 通知送信エラー:', error);
      throw error;
    }
  }

  /**
   * 復習リマインダーを送信
   */
  async sendReviewReminder(): Promise<void> {
    debugLog('📚 復習リマインダーを送信中...');

    if (!this.settings?.reviewReminderEnabled) {
      debugLog('⏭️ 復習リマインダーは無効です');
      return;
    }

    try {
      // 復習が必要なカードを取得（isDue=trueのカード）
      const dueCards = await db.spacedRepetitionCards
        .where('isDue')
        .equals(1)
        .toArray();

      if (dueCards.length === 0) {
        debugLog('✅ 復習が必要なカードはありません');
        return;
      }

      // カテゴリー別に集計
      const categoryMap = new Map<string, number>();
      for (const card of dueCards) {
        const category = card.category || '未分類';
        const count = categoryMap.get(category) || 0;
        categoryMap.set(category, count + 1);
      }

      const categories = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3); // トップ3カテゴリー

      // 優先度の高いカード（easinessFactor < 2.0）を計算
      const urgentCards = dueCards.filter((card) => card.easinessFactor < 2.0).length;

      const data: NotificationData = {
        type: 'review_reminder',
        title: '📚 復習の時間です！',
        body: `${dueCards.length}枚のカードが復習待ちです`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'review-reminder',
        url: '/spacedRepetitionReview',
        data: {
          type: 'review_reminder',
          cardCount: dueCards.length,
          categories,
          urgentCards,
        } as ReviewReminderData,
      };

      await this.sendNotification(data);

      debugLog(`✅ 復習リマインダー送信完了: ${dueCards.length}枚`);
    } catch (error) {
      debugLog('❌ 復習リマインダー送信エラー:', error);
    }
  }

  /**
   * 目標達成通知を送信
   */
  async sendGoalAchievementNotification(goalId: number): Promise<void> {
    debugLog(`🎉 目標達成通知を送信中: goalId=${goalId}`);

    if (!this.settings?.goalAchievementEnabled) {
      debugLog('⏭️ 目標達成通知は無効です');
      return;
    }

    try {
      // 目標を取得
      const goal = await db.goals.get(goalId);

      if (!goal) {
        debugLog('❌ 目標が見つかりません');
        return;
      }

      const data: NotificationData = {
        type: 'goal_achievement',
        title: '🎉 目標達成おめでとうございます！',
        body: `「${goal.title}」を達成しました！`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: `goal-${goalId}`,
        url: '/goalManager',
        data: {
          type: 'goal_achievement',
          goalId,
          goalTitle: goal.title,
          targetValue: goal.targetValue,
          currentValue: goal.currentValue,
        } as GoalAchievementData,
      };

      await this.sendNotification(data);

      debugLog('✅ 目標達成通知送信完了');
    } catch (error) {
      debugLog('❌ 目標達成通知送信エラー:', error);
    }
  }

  /**
   * ストリーク継続アラートを送信
   */
  async sendStreakAlert(): Promise<void> {
    debugLog('🔥 ストリーク継続アラートを送信中...');

    if (!this.settings?.streakAlertEnabled) {
      debugLog('⏭️ ストリーク継続アラートは無効です');
      return;
    }

    try {
      // 今日の学習履歴を確認
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayHistory = await db.history
        .where('timestamp')
        .above(today)
        .count();

      // 今日すでに学習している場合はアラート不要
      if (todayHistory > 0) {
        debugLog('✅ 今日はすでに学習しています');
        return;
      }

      // ストリーク日数を計算（簡易版）
      const allHistory = await db.history
        .orderBy('timestamp')
        .reverse()
        .toArray();

      let streakDays = 0;
      let currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - 1); // 昨日から
      currentDate.setHours(0, 0, 0, 0);

      for (const entry of allHistory) {
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);

        if (entryDate.getTime() === currentDate.getTime()) {
          streakDays++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (entryDate.getTime() < currentDate.getTime()) {
          break;
        }
      }

      // ストリークがない場合はアラート不要
      if (streakDays === 0) {
        debugLog('✅ 現在ストリークはありません');
        return;
      }

      const data: NotificationData = {
        type: 'streak_alert',
        title: '🔥 ストリーク継続中！',
        body: `${streakDays}日連続学習中です。今日も続けましょう！`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'streak-alert',
        url: '/quiz',
        data: {
          type: 'streak_alert',
          streakDays,
          message: `${streakDays}日連続で学習しています。素晴らしいです！`,
        } as StreakAlertData,
      };

      await this.sendNotification(data);

      debugLog(`✅ ストリーク継続アラート送信完了: ${streakDays}日`);
    } catch (error) {
      debugLog('❌ ストリーク継続アラート送信エラー:', error);
    }
  }

  /**
   * 通知スケジュールを設定
   */
  async scheduleNotifications(): Promise<void> {
    debugLog('⏰ 通知スケジュールを設定中...');

    if (!this.settings) {
      debugLog('❌ 通知設定が読み込まれていません');
      return;
    }

    try {
      // 復習リマインダーのスケジュール
      if (this.settings.reviewReminderEnabled) {
        this.scheduleReviewReminder();
      }

      // ストリーク継続アラートのスケジュール
      if (this.settings.streakAlertEnabled) {
        this.scheduleStreakAlert();
      }

      debugLog('✅ 通知スケジュール設定完了');
    } catch (error) {
      debugLog('❌ 通知スケジュール設定エラー:', error);
    }
  }

  /**
   * 復習リマインダーをスケジュール
   */
  private scheduleReviewReminder(): void {
    if (!this.settings) return;

    const [hours, minutes] = this.settings.reviewReminderTime.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // 今日の時刻を過ぎている場合は明日に設定
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      this.sendReviewReminder();
      // 次の日のスケジュールを設定（daily の場合）
      if (this.settings?.reviewReminderFrequency === 'daily') {
        this.scheduleReviewReminder();
      }
    }, delay);

    debugLog(`📅 復習リマインダーをスケジュール: ${scheduledTime.toLocaleString()}`);
  }

  /**
   * ストリーク継続アラートをスケジュール
   */
  private scheduleStreakAlert(): void {
    if (!this.settings) return;

    const [hours, minutes] = this.settings.streakAlertTime.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // 今日の時刻を過ぎている場合は明日に設定
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      this.sendStreakAlert();
      // 次の日のスケジュールを設定
      this.scheduleStreakAlert();
    }, delay);

    debugLog(`📅 ストリーク継続アラートをスケジュール: ${scheduledTime.toLocaleString()}`);
  }

  /**
   * 設定を取得
   */
  async getSettings(): Promise<NotificationSettings | null> {
    if (!this.settings) {
      await this.loadSettings();
    }
    return this.settings;
  }

  /**
   * 設定を更新
   */
  async updateSettings(updates: Partial<NotificationSettings>): Promise<void> {
    debugLog('📝 通知設定を更新中:', updates);

    try {
      if (!this.settings) {
        await this.loadSettings();
      }

      if (this.settings) {
        const updatedSettings = {
          ...this.settings,
          ...updates,
          updatedAt: new Date(),
        };

        await db.notificationSettings.put(updatedSettings);
        this.settings = updatedSettings;

        // スケジュールを再設定
        if (updates.reviewReminderEnabled !== undefined ||
            updates.reviewReminderTime !== undefined ||
            updates.streakAlertEnabled !== undefined ||
            updates.streakAlertTime !== undefined) {
          await this.scheduleNotifications();
        }

        debugLog('✅ 通知設定更新完了');
      }
    } catch (error) {
      debugLog('❌ 通知設定更新エラー:', error);
      throw error;
    }
  }

  /**
   * 通知履歴を保存
   */
  private async saveNotificationHistory(data: NotificationData): Promise<void> {
    try {
      await db.notificationHistory.add({
        type: data.type,
        title: data.title,
        body: data.body,
        sentAt: new Date(),
        clicked: false,
      } as any);
    } catch (error) {
      debugLog('❌ 通知履歴保存エラー:', error);
    }
  }

  /**
   * サーバーにPushサブスクリプションを登録
   */
  private async registerSubscriptionOnServer(subscription: PushSubscription): Promise<void> {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        debugLog('⚠️ 未ログインのためサーバー登録スキップ');
        return;
      }

      const idToken = await user.getIdToken();
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'minguella-5f151';
      const baseUrl = import.meta.env.VITE_FUNCTIONS_URL ||
        `https://us-central1-${projectId}.cloudfunctions.net`;

      const response = await fetch(`${baseUrl}/registerPushSubscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!response.ok) {
        throw new Error(`Server registration failed: ${response.status}`);
      }

      debugLog('✅ サーバーにPushサブスクリプション登録完了');
    } catch (error) {
      debugLog('⚠️ サーバー登録エラー（ローカル通知は継続）:', error);
    }
  }

  /**
   * サーバーからPushサブスクリプションを解除
   */
  private async unregisterSubscriptionOnServer(endpoint: string): Promise<void> {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'minguella-5f151';
      const baseUrl = import.meta.env.VITE_FUNCTIONS_URL ||
        `https://us-central1-${projectId}.cloudfunctions.net`;

      await fetch(`${baseUrl}/unregisterPushSubscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ endpoint }),
      });

      debugLog('✅ サーバーからPushサブスクリプション解除完了');
    } catch (error) {
      debugLog('⚠️ サーバー解除エラー:', error);
    }
  }

  /**
   * VAPID公開鍵を取得
   */
  private getVapidPublicKey(): string {
    return import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
  }

  /**
   * Base64エンコードされたVAPID鍵をUint8Arrayに変換
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * テスト通知を送信
   */
  async sendTestNotification(): Promise<void> {
    const data: NotificationData = {
      type: 'test',
      title: '🔔 テスト通知',
      body: '通知システムは正常に動作しています！',
      icon: '/icon-192x192.png',
      tag: 'test-notification',
    };

    await this.sendNotification(data);
  }
}

// シングルトンインスタンス
export const notificationService = new NotificationService();
