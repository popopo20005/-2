/**
 * 通知設定コンポーネント
 *
 * ユーザーが通知の設定をカスタマイズできる画面
 */

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Bell, BellOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import type { NotificationSettings as NotificationSettingsType } from '../types/notification';

interface NotificationSettingsProps {
  onBack: () => void;
  language?: 'ja' | 'en';
}

export function NotificationSettingsComponent({ onBack, language = 'ja' }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsType | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // TODO: 将来的に多言語対応を実装する際に使用する翻訳オブジェクト
  // @ts-expect-error - Prepared for future multi-language support
  const _t = {
    ja: {
      back: '← 戻る',
      title: '通知設定',
      description: '学習リマインダーや目標達成通知をカスタマイズしましょう',
      enableTitle: '通知を有効化する必要があります',
      enableDescription: '学習リマインダーや目標達成通知を受け取るには、ブラウザの通知許可が必要です。',
      enableButton: '通知を有効化',
      processing: '処理中...',
      notificationTypes: '通知の種類',
      allNotifications: 'すべての通知',
      allNotificationsDesc: '通知を完全に無効化します',
      reviewReminder: '復習リマインダー',
      reviewReminderDesc: '復習が必要な問題がある場合に通知',
      notificationTime: '通知時刻',
      notificationFrequency: '通知頻度',
      daily: '毎日',
      weekly: '週1回',
      disabled: '無効',
      goalAchievement: '目標達成通知',
      goalAchievementDesc: '目標達成時に通知',
      streakAlert: 'ストリーク継続アラート',
      streakAlertDesc: '連続学習日数を継続するための通知',
      testNotifications: '通知のテスト',
      testNotificationsDesc: '各種通知を手動で送信してテストできます',
      testBasic: '🔔 基本テスト通知を送信',
      testReview: '📚 復習リマインダーを送信',
      testStreak: '🔥 ストリーク継続アラートを送信',
      sending: '送信中...',
      msgSuccess: (msg: string) => msg,
      msgError: (msg: string) => msg,
      successEnabled: '通知が有効化されました',
      errorDenied: '通知が拒否されました。ブラウザの設定から許可してください。',
      errorPending: '通知が保留中です。',
      errorEnableFailed: '通知の有効化に失敗しました。',
      successUpdated: '設定を更新しました',
      errorUpdateFailed: '設定の更新に失敗しました',
      successTimeUpdated: '時刻を更新しました',
      errorTimeUpdateFailed: '時刻の更新に失敗しました',
      successFrequencyUpdated: '頻度を更新しました',
      errorFrequencyUpdateFailed: '頻度の更新に失敗しました',
      successTestSent: 'テスト通知を送信しました',
      errorTestFailed: 'テスト通知の送信に失敗しました。',
      successReviewSent: '復習リマインダーを送信しました',
      errorReviewFailed: '復習リマインダーの送信に失敗しました。',
      successStreakSent: 'ストリーク継続アラートを送信しました',
      errorStreakFailed: 'ストリーク継続アラートの送信に失敗しました。',
      loadingSettings: '設定を読み込み中...',
      errorLoadFailed: '設定の読み込みに失敗しました',
    },
    en: {
      back: '← Back',
      title: 'Notification Settings',
      description: 'Customize learning reminders and achievement notifications',
      enableTitle: 'Notifications need to be enabled',
      enableDescription: 'To receive learning reminders and achievement notifications, you need to grant browser notification permission.',
      enableButton: 'Enable Notifications',
      processing: 'Processing...',
      notificationTypes: 'Notification Types',
      allNotifications: 'All Notifications',
      allNotificationsDesc: 'Completely disable notifications',
      reviewReminder: 'Review Reminder',
      reviewReminderDesc: 'Notify when there are problems to review',
      notificationTime: 'Notification Time',
      notificationFrequency: 'Notification Frequency',
      daily: 'Daily',
      weekly: 'Weekly',
      disabled: 'Disabled',
      goalAchievement: 'Goal Achievement',
      goalAchievementDesc: 'Notify when goals are achieved',
      streakAlert: 'Streak Alert',
      streakAlertDesc: 'Notifications to maintain learning streaks',
      testNotifications: 'Test Notifications',
      testNotificationsDesc: 'Manually send test notifications',
      testBasic: '🔔 Send Basic Test Notification',
      testReview: '📚 Send Review Reminder',
      testStreak: '🔥 Send Streak Alert',
      sending: 'Sending...',
      msgSuccess: (msg: string) => msg,
      msgError: (msg: string) => msg,
      successEnabled: 'Notifications enabled',
      errorDenied: 'Notifications denied. Please allow in browser settings.',
      errorPending: 'Notifications pending.',
      errorEnableFailed: 'Failed to enable notifications.',
      successUpdated: 'Settings updated',
      errorUpdateFailed: 'Failed to update settings',
      successTimeUpdated: 'Time updated',
      errorTimeUpdateFailed: 'Failed to update time',
      successFrequencyUpdated: 'Frequency updated',
      errorFrequencyUpdateFailed: 'Failed to update frequency',
      successTestSent: 'Test notification sent',
      errorTestFailed: 'Failed to send test notification.',
      successReviewSent: 'Review reminder sent',
      errorReviewFailed: 'Failed to send review reminder.',
      successStreakSent: 'Streak alert sent',
      errorStreakFailed: 'Failed to send streak alert.',
      loadingSettings: 'Loading settings...',
      errorLoadFailed: 'Failed to load settings',
    },
  }[language];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await notificationService.getSettings();
      if (currentSettings) {
        setSettings(currentSettings);
        setPermission(currentSettings.permission);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: '設定の読み込みに失敗しました' });
    }
  };

  const handleEnableNotifications = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Initialize notification service
      await notificationService.initialize();

      const result = await notificationService.requestPermission();

      if (result === 'granted') {
        // Subscribe to push notifications
        await notificationService.subscribe();

        setPermission('granted');
        await loadSettings();
        setMessage({ type: 'success', text: '通知が有効化されました' });
      } else if (result === 'denied') {
        setMessage({
          type: 'error',
          text: '通知が拒否されました。ブラウザの設定から許可してください。',
        });
      } else {
        setMessage({ type: 'error', text: '通知が保留中です。' });
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      setMessage({ type: 'error', text: '通知の有効化に失敗しました。' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationSettingsType) => {
    if (!settings) return;

    try {
      const newValue = !settings[key as keyof typeof settings];
      const updates = { [key]: newValue };

      await notificationService.updateSettings(updates);
      await loadSettings();

      setMessage({ type: 'success', text: '設定を更新しました' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Failed to update setting:', error);
      setMessage({ type: 'error', text: '設定の更新に失敗しました' });
    }
  };

  const handleTimeChange = async (key: 'reviewReminderTime' | 'streakAlertTime', value: string) => {
    if (!settings) return;

    try {
      await notificationService.updateSettings({ [key]: value });
      await loadSettings();

      setMessage({ type: 'success', text: '時刻を更新しました' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Failed to update time:', error);
      setMessage({ type: 'error', text: '時刻の更新に失敗しました' });
    }
  };

  const handleFrequencyChange = async (value: 'daily' | 'weekly' | 'disabled') => {
    if (!settings) return;

    try {
      await notificationService.updateSettings({ reviewReminderFrequency: value });
      await loadSettings();

      setMessage({ type: 'success', text: '頻度を更新しました' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Failed to update frequency:', error);
      setMessage({ type: 'error', text: '頻度の更新に失敗しました' });
    }
  };

  const handleTestNotification = async () => {
    try {
      setLoading(true);
      setMessage(null);

      await notificationService.sendTestNotification();

      setMessage({ type: 'success', text: 'テスト通知を送信しました' });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      setMessage({ type: 'error', text: 'テスト通知の送信に失敗しました。' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestReviewReminder = async () => {
    try {
      setLoading(true);
      setMessage(null);

      await notificationService.sendReviewReminder();

      setMessage({ type: 'success', text: '復習リマインダーを送信しました' });
    } catch (error) {
      console.error('Failed to send review reminder:', error);
      setMessage({ type: 'error', text: '復習リマインダーの送信に失敗しました。' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestStreakAlert = async () => {
    try {
      setLoading(true);
      setMessage(null);

      await notificationService.sendStreakAlert();

      setMessage({ type: 'success', text: 'ストリーク継続アラートを送信しました' });
    } catch (error) {
      console.error('Failed to send streak alert:', error);
      setMessage({ type: 'error', text: 'ストリーク継続アラートの送信に失敗しました。' });
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-6 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">設定を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={onBack} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            <Bell className="inline-block mr-2" size={32} />
            通知設定
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            学習リマインダーや目標達成通知をカスタマイズしましょう
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Permission Status */}
        {permission !== 'granted' && (
          <Card className="mb-6 p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
              <AlertCircle className="inline-block mr-2" size={20} />
              通知を有効化する必要があります
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              学習リマインダーや目標達成通知を受け取るには、ブラウザの通知許可が必要です。
            </p>
            <Button onClick={handleEnableNotifications} disabled={loading} variant="primary">
              {loading ? '処理中...' : '通知を有効化'}
            </Button>
          </Card>
        )}

        {/* Main Settings */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">通知の種類</h2>

            {/* Master Toggle */}
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  {settings.enabled ? <Bell size={20} /> : <BellOff size={20} />}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">すべての通知</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">通知を完全に無効化します</p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={() => handleToggle('enabled')}
                    className="sr-only peer"
                    disabled={permission !== 'granted'}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>
            </div>

            {/* Individual Settings */}
            <div className="space-y-4">
              {/* Review Reminders */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">復習リマインダー</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    復習が必要な問題がある場合に通知
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.reviewReminderEnabled}
                    onChange={() => handleToggle('reviewReminderEnabled')}
                    className="sr-only peer"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>

              {/* Review Reminder Time */}
              {settings.reviewReminderEnabled && (
                <div className="ml-6 mt-2 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      通知時刻
                    </label>
                    <input
                      type="time"
                      value={settings.reviewReminderTime}
                      onChange={(e) => handleTimeChange('reviewReminderTime', e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      disabled={!settings.enabled || permission !== 'granted'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      通知頻度
                    </label>
                    <select
                      value={settings.reviewReminderFrequency}
                      onChange={(e) =>
                        handleFrequencyChange(e.target.value as 'daily' | 'weekly' | 'disabled')
                      }
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      disabled={!settings.enabled || permission !== 'granted'}
                    >
                      <option value="daily">毎日</option>
                      <option value="weekly">週1回</option>
                      <option value="disabled">無効</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Goal Notifications */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">目標達成通知</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    目標達成時に通知
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.goalAchievementEnabled}
                    onChange={() => handleToggle('goalAchievementEnabled')}
                    className="sr-only peer"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>

              {/* Streak Alerts */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">ストリーク継続アラート</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    連続学習日数を継続するための通知
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.streakAlertEnabled}
                    onChange={() => handleToggle('streakAlertEnabled')}
                    className="sr-only peer"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>

              {/* Streak Alert Time */}
              {settings.streakAlertEnabled && (
                <div className="ml-6 mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    通知時刻
                  </label>
                  <input
                    type="time"
                    value={settings.streakAlertTime}
                    onChange={(e) => handleTimeChange('streakAlertTime', e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Test Notifications Card */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              通知のテスト
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              各種通知を手動で送信してテストできます
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleTestNotification}
                variant="primary"
                className="w-full"
                disabled={!settings.enabled || loading || permission !== 'granted'}
              >
                {loading ? '送信中...' : '🔔 基本テスト通知を送信'}
              </Button>

              <Button
                onClick={handleTestReviewReminder}
                variant="secondary"
                className="w-full"
                disabled={!settings.enabled || !settings.reviewReminderEnabled || loading || permission !== 'granted'}
              >
                {loading ? '送信中...' : '📚 復習リマインダーを送信'}
              </Button>

              <Button
                onClick={handleTestStreakAlert}
                variant="secondary"
                className="w-full"
                disabled={!settings.enabled || !settings.streakAlertEnabled || loading || permission !== 'granted'}
              >
                {loading ? '送信中...' : '🔥 ストリーク継続アラートを送信'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
