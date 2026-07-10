import { useEffect, useState } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import type { BannerAdOptions } from '@capacitor-community/admob';
import { isNativePlatform } from '../lib/platform';
import { useAd } from '../contexts/AdContext';
import { AdSenseResponsiveBanner } from './AdSenseBanner';

interface AdMobBannerProps {
  /**
   * 広告ユニットID（AndroidとiOSで異なる場合があります）
   * テスト用ID: 'ca-app-pub-3940256099942544/6300978111'
   */
  adUnitId?: string;
  /**
   * バナーサイズ
   */
  adSize?: BannerAdSize;
  /**
   * バナーの表示位置
   */
  position?: BannerAdPosition;
}

/**
 * ユニバーサルバナー広告コンポーネント
 * - ネイティブプラットフォーム（Android/iOS）: AdMob広告を表示
 * - Webプラットフォーム（ブラウザ/PWA）: Google AdSense広告を表示
 */
export function AdMobBanner({
  adUnitId = 'ca-app-pub-2625123042629219/2471496182', // 本番バナー広告ID
  adSize = BannerAdSize.BANNER,
  position = BannerAdPosition.BOTTOM_CENTER,
}: AdMobBannerProps) {
  const { shouldShowAd } = useAd();
  const [isShowing, setIsShowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Webプラットフォームでは何もしない（AdSenseが別途表示される）
    if (!isNativePlatform()) {
      return;
    }

    // 広告表示が許可されていない画面では何もしない
    if (!shouldShowAd) {
      // 既に表示されている場合は非表示にする
      if (isShowing) {
        AdMob.hideBanner().catch((err) => {
          console.error('AdMobバナー非表示エラー:', err);
        });
        setIsShowing(false);
      }
      return;
    }

    const showBanner = async () => {
      try {
        console.log('AdMob: バナー広告を表示中...');
        console.log('AdMob: shouldShowAd =', shouldShowAd);
        console.log('AdMob: isNativePlatform =', isNativePlatform());
        console.log('AdMob: adUnitId =', adUnitId);

        const options: BannerAdOptions = {
          adId: adUnitId,
          adSize: adSize,
          position: position,
          margin: 0,
          isTesting: false, // 本番環境
        };

        console.log('AdMob: showBanner呼び出し中...', options);
        await AdMob.showBanner(options);
        console.log('AdMob: バナー広告表示成功');
        setIsShowing(true);
      } catch (err) {
        const errorMessage = `AdMobバナー表示エラー: ${JSON.stringify(err)}`;
        console.error(errorMessage);
        console.error('エラー詳細:', err);
        setError(errorMessage);

        // エラーをアラートで表示（デバッグ用）
        if (isNativePlatform()) {
          alert(`広告エラー: ${errorMessage}`);
        }
      }
    };

    showBanner();

    // クリーンアップ: コンポーネントがアンマウントされたらバナーを非表示
    return () => {
      if (isNativePlatform() && isShowing) {
        AdMob.hideBanner().catch((err) => {
          console.error('AdMobバナー非表示エラー:', err);
        });
      }
    };
  }, [adUnitId, adSize, position, shouldShowAd, isShowing]);

  // プラットフォーム別に広告を表示
  if (!isNativePlatform()) {
    // Webプラットフォーム（ブラウザ/PWA）: Google AdSense広告を表示
    return <AdSenseResponsiveBanner />;
  }

  if (error) {
    console.warn('バナー広告の表示に失敗しました:', error);
  }

  // 広告表示が許可されていない画面ではスペースも確保しない
  if (!shouldShowAd) {
    return null;
  }

  // ネイティブプラットフォーム: AdMobバナーの高さ分のスペースを確保
  return (
    <div
      style={{
        height: adSize === BannerAdSize.LARGE_BANNER ? '100px' : '50px',
        width: '100%',
        backgroundColor: 'transparent'
      }}
      aria-label="Advertisement space"
    />
  );
}
