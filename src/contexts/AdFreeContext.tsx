import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AdFreeContextType {
  isAdFree: boolean;
  adFreeTimeRemaining: number; // 秒単位
  startAdFreeMode: () => void;
  checkAdFreeStatus: () => boolean;
}

const AdFreeContext = createContext<AdFreeContextType | undefined>(undefined);

const AD_FREE_DURATION = 30 * 60; // 30分（秒単位）
const AD_FREE_KEY = 'adFreeUntil';

export function AdFreeProvider({ children }: { children: ReactNode }) {
  const [isAdFree, setIsAdFree] = useState(false);
  const [adFreeTimeRemaining, setAdFreeTimeRemaining] = useState(0);

  // 広告除去ステータスをチェック
  const checkAdFreeStatus = (): boolean => {
    const adFreeUntil = localStorage.getItem(AD_FREE_KEY);
    if (!adFreeUntil) {
      return false;
    }

    const expiryTime = parseInt(adFreeUntil, 10);
    const now = Date.now();

    if (now < expiryTime) {
      // まだ広告除去期間中
      const remaining = Math.floor((expiryTime - now) / 1000);
      setAdFreeTimeRemaining(remaining);
      setIsAdFree(true);
      return true;
    } else {
      // 期間終了
      localStorage.removeItem(AD_FREE_KEY);
      setIsAdFree(false);
      setAdFreeTimeRemaining(0);
      return false;
    }
  };

  // 広告除去モードを開始
  const startAdFreeMode = () => {
    const expiryTime = Date.now() + (AD_FREE_DURATION * 1000);
    localStorage.setItem(AD_FREE_KEY, expiryTime.toString());
    setIsAdFree(true);
    setAdFreeTimeRemaining(AD_FREE_DURATION);
    console.log('広告除去モード開始: 30分間');
  };

  // 初期化時にステータスをチェック
  useEffect(() => {
    checkAdFreeStatus();
  }, []);

  // 1秒ごとに残り時間を更新
  useEffect(() => {
    if (!isAdFree) return;

    const interval = setInterval(() => {
      const stillAdFree = checkAdFreeStatus();
      if (!stillAdFree) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAdFree]);

  return (
    <AdFreeContext.Provider
      value={{
        isAdFree,
        adFreeTimeRemaining,
        startAdFreeMode,
        checkAdFreeStatus,
      }}
    >
      {children}
    </AdFreeContext.Provider>
  );
}

export function useAdFree() {
  const context = useContext(AdFreeContext);
  if (context === undefined) {
    throw new Error('useAdFree must be used within an AdFreeProvider');
  }
  return context;
}

/**
 * 残り時間を人間が読める形式に変換
 * 例: 1800秒 → "30:00"
 */
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
