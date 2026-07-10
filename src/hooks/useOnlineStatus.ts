/**
 * useOnlineStatus - ネットワーク接続状態を監視するフック
 *
 * navigator.onLine + online/offline イベントで接続状態を追跡。
 * オンライン復帰時にコールバックを実行できる。
 */

import { useState, useEffect, useCallback } from 'react';
import { processSyncQueue, saveLastSyncTime } from '../workers/syncQueue';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // オンライン復帰時に同期キューを処理
      processSyncQueue()
        .then(() => saveLastSyncTime())
        .catch((err) => console.warn('[Online] 同期キュー処理失敗:', err));
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const manualSync = useCallback(async () => {
    if (!navigator.onLine) return;
    await processSyncQueue();
    saveLastSyncTime();
  }, []);

  return { isOnline, manualSync };
}
