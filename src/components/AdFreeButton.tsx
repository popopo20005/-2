import { useState } from 'react';
import { useAdFree, formatTimeRemaining } from '../contexts/AdFreeContext';
import { showRewardedAd, isRewardedAdAvailable } from './AdMobRewardedAd';
import { useLanguage } from '../contexts/LanguageContext';

interface AdFreeButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary';
}

/**
 * 広告除去（集中モード）ボタンコンポーネント
 * リワード広告を視聴して30分間広告を非表示にできる
 */
export function AdFreeButton({ className = '', variant = 'primary' }: AdFreeButtonProps) {
  const { isAdFree, adFreeTimeRemaining, startAdFreeMode } = useAdFree();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const texts = {
    ja: {
      button: '🎯 集中モード（30分間広告なし）',
      active: '集中モード有効',
      remaining: '残り時間',
      loading: '広告を読み込み中...',
      unavailable: '広告が利用できません',
      error: '広告の表示に失敗しました',
    },
    en: {
      button: '🎯 Focus Mode (30 min ad-free)',
      active: 'Focus Mode Active',
      remaining: 'Time Remaining',
      loading: 'Loading ad...',
      unavailable: 'Ads not available',
      error: 'Failed to show ad',
    }
  };

  const t = texts[language as keyof typeof texts] || texts.ja;

  const handleAdFreeRequest = async () => {
    if (!isRewardedAdAvailable()) {
      setError(t.unavailable);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await showRewardedAd({
        onRewarded: () => {
          console.log('集中モード：広告視聴完了、30分間広告非表示を開始');
          startAdFreeMode();
          setIsLoading(false);
        },
        onError: (err) => {
          console.error('集中モード：広告エラー', err);
          setError(t.error);
          setIsLoading(false);
        },
        onDismissed: () => {
          console.log('集中モード：ユーザーが広告を途中で閉じました');
          setIsLoading(false);
        },
      });
    } catch (err) {
      console.error('集中モード：予期しないエラー', err);
      setError(t.error);
      setIsLoading(false);
    }
  };

  // 既に集中モードが有効な場合
  if (isAdFree) {
    return (
      <div
        className={`flex items-center justify-between p-4 rounded-lg bg-green-100 dark:bg-green-900 border-2 border-green-500 ${className}`}
      >
        <div className="flex items-center space-x-3">
          <div className="text-2xl">✅</div>
          <div>
            <div className="font-bold text-green-800 dark:text-green-200">
              {t.active}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              {t.remaining}: {formatTimeRemaining(adFreeTimeRemaining)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ボタンスタイル
  const baseClasses = 'w-full p-4 rounded-lg font-bold transition-all duration-200 flex items-center justify-center space-x-2';
  const variantClasses = variant === 'primary'
    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600';

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <div className={className}>
      <button
        onClick={handleAdFreeRequest}
        disabled={isLoading}
        className={`${baseClasses} ${variantClasses} ${isLoading ? disabledClasses : ''}`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>{t.loading}</span>
          </>
        ) : (
          <span>{t.button}</span>
        )}
      </button>

      {error && (
        <div className="mt-2 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
}
