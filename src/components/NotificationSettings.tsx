/**
 * 通知設定コンポーネント
 *
 * ユーザーが通知の設定をカスタマイズできる画面
 */

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Bell, BellOff, Clock, Moon, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  subscribeToPushNotifications,
  checkAndSendNotifications,
  type NotificationSettings,
} from '../services/notificationService';

interface NotificationSettingsProps {
  onBack: () => void;
}

export function NotificationSettingsComponent({ onBack }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // 通知許可状態を監視
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const result = await requestNotificationPermission();

      if (result === 'granted') {
        // Push APIにサブスクライブ
        await subscribeToPushNotifications();

        setPermission('granted');
        setSettings((prev) => ({ ...prev, enabled: true }));
        setMessage({ type: 'success', text: '通知が有効化されました' });
      } else if (result === 'denied') {
        setMessage({ type: 'error', text: '通知が拒否されました。ブラウザの設定から許可してください。' });
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

  const handleToggle = (key: keyof NotificationSettings) => {
    if (typeof settings[key] === 'boolean') {
      const newSettings = {
        ...settings,
        [key]: !settings[key],
      };
      setSettings(newSettings);
      saveNotificationSettings(newSettings);
    }
  };

  const handleTimeChange = (key: 'dailyReminderTime' | 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    const newSettings = {
      ...settings,
      [key]: value,
    };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const handleSave = () => {
    saveNotificationSettings(settings);
    setMessage({ type: 'success', text: '設定を保存しました' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleTestNotification = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // 通知チェックを実行
      await checkAndSendNotifications();

      setMessage({ type: 'success', text: 'テスト通知を送信しました' });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      setMessage({ type: 'error', text: 'テスト通知の送信に失敗しました。' });
    } finally {
      setLoading(false);
    }
  };

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
                    checked={settings.reviewReminders}
                    onChange={() => handleToggle('reviewReminders')}
                    className="sr-only peer"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>

              {/* Goal Notifications */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">目標通知</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    目標達成や進捗マイルストーン時に通知
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.goalNotifications}
                    onChange={() => handleToggle('goalNotifications')}
                    className="sr-only peer"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>

              {/* Streak Reminders */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">ストリークリマインダー</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    連続学習日数を継続するための通知
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.streakReminders}
                    onChange={() => handleToggle('streakReminders')}
                    className="sr-only peer"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>

              {/* Weakness Alerts */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">弱点検出通知</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    苦手分野が検出された場合に通知
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.weaknessAlerts}
                    onChange={() => handleToggle('weaknessAlerts')}
                    className="sr-only peer"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* Daily Reminder */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Clock size={20} />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">日次リマインダー</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    毎日決まった時間に学習を促す通知を送信
                  </p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.dailyReminder}
                  onChange={() => handleToggle('dailyReminder')}
                  className="sr-only peer"
                  disabled={!settings.enabled || permission !== 'granted'}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </div>

            {settings.dailyReminder && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  通知時刻
                </label>
                <input
                  type="time"
                  value={settings.dailyReminderTime}
                  onChange={(e) => handleTimeChange('dailyReminderTime', e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={!settings.enabled || permission !== 'granted'}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Quiet Hours */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Moon size={20} />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">静音時間</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    指定した時間帯は通知を送信しません
                  </p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.quietHoursEnabled}
                  onChange={() => handleToggle('quietHoursEnabled')}
                  className="sr-only peer"
                  disabled={!settings.enabled || permission !== 'granted'}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </div>

            {settings.quietHoursEnabled && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    開始時刻
                  </label>
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    終了時刻
                  </label>
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    disabled={!settings.enabled || permission !== 'granted'}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            variant="primary"
            className="flex-1"
            disabled={permission !== 'granted'}
          >
            設定を保存
          </Button>
          <Button
            onClick={handleTestNotification}
            variant="secondary"
            disabled={!settings.enabled || loading || permission !== 'granted'}
          >
            {loading ? '送信中...' : 'テスト通知'}
          </Button>
        </div>
      </div>
    </div>
  );
}
