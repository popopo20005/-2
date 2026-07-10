import { useEffect, useRef } from 'react';
import { useAd } from '../contexts/AdContext';

interface AdSenseBannerProps {
  /**
   * AdSense広告クライアントID
   * 例: 'ca-pub-1234567890123456'
   */
  adClient?: string;
  /**
   * 広告スロットID
   */
  adSlot?: string;
  /**
   * 広告のフォーマット
   */
  adFormat?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  /**
   * レスポンシブ広告かどうか
   */
  responsive?: boolean;
}

/**
 * Google AdSense バナー広告コンポーネント（Web/PWA用）
 *
 * 使用方法：
 * 1. Google AdSenseアカウントを作成: https://www.google.com/adsense/
 * 2. サイトを登録して承認を待つ
 * 3. 広告ユニットを作成してクライアントIDとスロットIDを取得
 * 4. このコンポーネントのpropsに設定
 */
export function AdSenseBanner({
  adClient = 'ca-pub-2625123042629219', // 実際のAdSenseクライアントID
  adSlot = '1713654807', // 実際のスロットID (Minguella-Bottom-Banner)
  adFormat = 'auto',
  responsive = true,
}: AdSenseBannerProps) {
  const { shouldShowAd } = useAd();
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // 広告表示が許可されていない画面では何もしない
    if (!shouldShowAd) {
      return;
    }

    try {
      // AdSenseスクリプトが読み込まれているか確認
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        // 広告をプッシュ（AdSenseが自動的に広告を表示）
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        console.log('AdSense: 広告を表示しました');
      } else {
        console.warn('AdSense: スクリプトが読み込まれていません。index.htmlにスクリプトタグを追加してください。');
      }
    } catch (error) {
      console.error('AdSense: 広告表示エラー:', error);
    }
  }, [shouldShowAd]);

  // 広告表示が許可されていない画面では何も表示しない
  if (!shouldShowAd) {
    return null;
  }

  return (
    <div className="adsense-container" style={{
      textAlign: 'center',
      padding: '10px 0',
      backgroundColor: 'transparent',
      minHeight: '50px'
    }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          minHeight: '50px',
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

/**
 * レスポンシブディスプレイ広告（推奨）
 * サイズを自動調整する広告
 */
export function AdSenseResponsiveBanner() {
  return (
    <AdSenseBanner
      adFormat="auto"
      responsive={true}
    />
  );
}

/**
 * 横長バナー広告
 * モバイルに最適
 */
export function AdSenseHorizontalBanner() {
  return (
    <AdSenseBanner
      adFormat="horizontal"
      responsive={true}
    />
  );
}
