import { useState } from 'react';
import { usePWA } from '../hooks/usePWA';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isUpdateAvailable, isOnline, installApp, updateApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(true);

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      await installApp();
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('インストールに失敗しました:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUpdate = () => {
    updateApp();
    setShowUpdatePrompt(false);
  };

  // インストールプロンプト
  if (isInstallable && !isInstalled && showInstallPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-xl">📱</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Minguella をインストール
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              アプリをホーム画面に追加して、より快適にご利用いただけます
            </p>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="quiz-action-button px-3 py-1.5 text-xs rounded transition-colors disabled:bg-gray-400"
              >
                {isInstalling ? 'インストール中...' : 'インストール'}
              </button>
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="quiz-action-button px-3 py-1.5 text-xs rounded transition-colors"
              >
                後で
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowInstallPrompt(false)}
            className="quiz-action-button flex-shrink-0 text-sm px-2 py-1 rounded"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    );
  }

  // アップデートプロンプト
  if (isUpdateAvailable && showUpdatePrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <span className="text-xl">🔄</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              アップデートが利用可能
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              新しいバージョンのアプリが利用可能です
            </p>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleUpdate}
                className="quiz-action-button px-3 py-1.5 text-xs rounded transition-colors"
              >
                アップデート
              </button>
              <button
                onClick={() => setShowUpdatePrompt(false)}
                className="quiz-action-button px-3 py-1.5 text-xs rounded transition-colors"
              >
                後で
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowUpdatePrompt(false)}
            className="quiz-action-button flex-shrink-0 text-sm px-2 py-1 rounded"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    );
  }

  // オフライン通知
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <span className="text-sm">📶</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              オフラインモード
            </h3>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              インターネット接続がありません。一部機能が制限されます。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}