import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAdFree } from './AdFreeContext';

// 広告表示を許可する画面のリスト
const AD_ENABLED_VIEWS = [
  'menu',
  'stats',
  'history',
  'quizSets',
  'settings',
  'share',
  'quizSetStats',
  'diary',
  'insights',
  'recommendations',
  'sessionSettings',
  'reminderSettings',
  'difficultySettings'
];

interface AdContextType {
  shouldShowAd: boolean;
  setCurrentView: (view: string) => void;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export function AdProvider({ children }: { children: ReactNode }) {
  const [currentViewAllowsAds, setCurrentViewAllowsAds] = useState(true);
  const [shouldShowAd, setShouldShowAd] = useState(true);
  const { isAdFree } = useAdFree();

  const setCurrentView = (view: string) => {
    // 現在の画面が広告表示許可リストに含まれているかチェック
    const showAd = AD_ENABLED_VIEWS.includes(view);
    setCurrentViewAllowsAds(showAd);
  };

  // 広告表示の最終判定：画面チェック && 広告除去モードでない
  useEffect(() => {
    setShouldShowAd(currentViewAllowsAds && !isAdFree);
  }, [currentViewAllowsAds, isAdFree]);

  return (
    <AdContext.Provider value={{ shouldShowAd, setCurrentView }}>
      {children}
    </AdContext.Provider>
  );
}

export function useAd() {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAd must be used within an AdProvider');
  }
  return context;
}
