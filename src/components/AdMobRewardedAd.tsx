import { AdMob } from '@capacitor-community/admob';
import type { RewardAdOptions } from '@capacitor-community/admob';
import { isNativePlatform } from '../lib/platform';

interface AdMobRewardedAdProps {
  /**
   * リワード広告ユニットID
   * テスト用ID: 'ca-app-pub-3940256099942544/5224354917'
   */
  adUnitId?: string;
  /**
   * 広告視聴完了時のコールバック
   */
  onRewarded: () => void;
  /**
   * 広告表示エラー時のコールバック
   */
  onError?: (error: string) => void;
  /**
   * 広告を閉じた時のコールバック（報酬なし）
   */
  onDismissed?: () => void;
}

/**
 * AdMobリワード広告を表示する関数
 */
export async function showRewardedAd({
  adUnitId = 'ca-app-pub-2625123042629219/1734604367', // 本番リワード広告ID
  onRewarded,
  onError,
  onDismissed: _onDismissed,
}: AdMobRewardedAdProps): Promise<void> {
  // Webプラットフォームでは何もしない
  if (!isNativePlatform()) {
    console.warn('リワード広告はネイティブプラットフォームでのみ利用可能です');
    // 開発用：Web環境では即座に報酬を付与
    if (process.env.NODE_ENV === 'development') {
      console.log('開発モード: リワード広告をスキップして報酬を付与');
      onRewarded();
    }
    return;
  }

  try {
    console.log('AdMob: リワード広告を準備中...');

    const options: RewardAdOptions = {
      adId: adUnitId,
      isTesting: false, // 本番環境
    };

    // リワード広告を準備
    await AdMob.prepareRewardVideoAd(options);
    console.log('AdMob: リワード広告の準備完了');

    // リワード広告を表示
    const result = await AdMob.showRewardVideoAd();
    console.log('AdMob: リワード広告の結果:', result);

    // リワード広告は視聴完了した場合のみresultが返される
    // エラーなく完了した場合、ユーザーは広告を最後まで視聴した
    console.log('AdMob: ユーザーが広告を視聴完了、報酬を付与');
    onRewarded();
  } catch (error) {
    const errorMessage = `リワード広告エラー: ${error}`;
    console.error(errorMessage);
    if (onError) {
      onError(errorMessage);
    }
  }
}

/**
 * リワード広告が利用可能かチェック
 */
export function isRewardedAdAvailable(): boolean {
  return isNativePlatform();
}
