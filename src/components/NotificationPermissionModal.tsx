/**
 * 通知許可モーダル
 *
 * ユーザーに通知の価値を説明し、許可を促すモーダル
 */

import { useState } from 'react';
import { Bell, X, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { notificationService } from '../services/notificationService';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export function NotificationPermissionModal({
  isOpen,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
}: NotificationPermissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize notification service
      await notificationService.initialize();

      // Request permission
      const permission = await notificationService.requestPermission();

      if (permission === 'granted') {
        // Subscribe to push notifications
        await notificationService.subscribe();

        // Schedule notifications
        await notificationService.scheduleNotifications();

        // Callback
        onPermissionGranted?.();

        // Close modal
        onClose();
      } else if (permission === 'denied') {
        setError('通知が拒否されました。ブラウザの設定から許可してください。');
        onPermissionDenied?.();
      } else {
        setError('通知が保留中です。後でもう一度お試しください。');
      }
    } catch (err) {
      console.error('Failed to request permission:', err);
      setError('通知の有効化に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <Card className="p-6">
          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <Bell size={48} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
            学習リマインダーを有効化しますか？
          </h2>

          {/* Description */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            通知を有効にすると、以下の機能が利用できます
          </p>

          {/* Features List */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-full mt-0.5">
                <Check size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">復習リマインダー</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  復習が必要な問題を適切なタイミングでお知らせ
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-full mt-0.5">
                <Check size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">目標達成通知</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  目標を達成したときにお祝いメッセージを送信
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-full mt-0.5">
                <Check size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">ストリーク継続アラート</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  連続学習記録を継続するためのリマインダー
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSkip}
              variant="secondary"
              className="flex-1"
              disabled={loading}
            >
              後で
            </Button>
            <Button
              onClick={handleRequestPermission}
              variant="primary"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  処理中...
                </span>
              ) : (
                '有効化する'
              )}
            </Button>
          </div>

          {/* Privacy Note */}
          <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
            ℹ️ 通知はいつでも設定から無効化できます
          </p>
        </Card>
      </div>
    </div>
  );
}
