/**
 * SyncStatusIndicator - 同期状態をアイコンで表示
 *
 * MainMenuヘッダーに配置し、ログインユーザーに同期状態を伝える。
 * - 同期中: 回転アイコン
 * - 未同期（ペンディングあり）: 警告アイコン
 * - 同期済み: チェックアイコン
 * - オフライン: WiFi切断アイコン
 */

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getPendingSyncCount, getFailedSyncCount } from '../workers/syncQueue';

type SyncState = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';

export function SyncStatusIndicator() {
  const { user, migrating } = useAuth();
  const { isOnline, manualSync } = useOnlineStatus();
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    if (!isOnline) {
      setSyncState('offline');
      return;
    }

    if (migrating) {
      setSyncState('syncing');
      return;
    }

    // 定期的にキュー状態をチェック
    const checkQueue = async () => {
      const pending = await getPendingSyncCount();
      const failed = await getFailedSyncCount();
      setPendingCount(pending);

      if (failed > 0) {
        setSyncState('error');
      } else if (pending > 0) {
        setSyncState('pending');
      } else {
        setSyncState('synced');
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 10_000);
    return () => clearInterval(interval);
  }, [user, isOnline, migrating]);

  // 未ログインなら非表示
  if (!user) return null;

  const handleClick = async () => {
    if (syncState === 'pending' || syncState === 'error') {
      setSyncState('syncing');
      await manualSync();
    }
  };

  const config: Record<SyncState, { icon: React.ReactNode; label: string; color: string }> = {
    synced: {
      icon: <Check className="size-3.5" />,
      label: '同期済み',
      color: 'text-emerald-500',
    },
    pending: {
      icon: <Cloud className="size-3.5" />,
      label: `未同期 (${pendingCount})`,
      color: 'text-amber-500',
    },
    syncing: {
      icon: <RefreshCw className="size-3.5 animate-spin" />,
      label: '同期中...',
      color: 'text-blue-500',
    },
    error: {
      icon: <AlertTriangle className="size-3.5" />,
      label: '同期エラー',
      color: 'text-red-500',
    },
    offline: {
      icon: <CloudOff className="size-3.5" />,
      label: 'オフライン',
      color: 'text-gray-400',
    },
  };

  const { icon, label, color } = config[syncState];

  return (
    <button
      onClick={handleClick}
      disabled={syncState === 'syncing' || syncState === 'synced' || syncState === 'offline'}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${color} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:cursor-default disabled:hover:bg-transparent`}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
