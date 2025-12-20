import { useEffect, useState } from 'react';
import { AdMob } from '@capacitor-community/admob';
import { isNativePlatform } from '../lib/platform';

/**
 * AdMob初期化コンポーネント
 * アプリの起動時にAdMobを初期化します（ネイティブプラットフォームのみ）
 */

export function AdMobInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAdMob = async () => {
      // Webプラットフォームでは何もしない
      if (!isNativePlatform()) {
        console.log('AdMob: Webプラットフォームのため初期化をスキップ');
        return;
      }

      try {
        console.log('AdMob: 初期化を開始...');
        console.log('AdMob: isNativePlatform =', isNativePlatform());

        // AdMobの初期化
        await AdMob.initialize({
          testingDevices: [], // テスト端末のIDをここに追加（本番環境では空配列にする）
          initializeForTesting: false, // デバッグ時はtrueに設定
        });

        console.log('AdMob: 初期化完了✅');
        setIsInitialized(true);

        // 成功をアラート表示（デバッグ用）
        if (isNativePlatform()) {
          alert('AdMob初期化成功！');
        }
      } catch (err) {
        const errorMessage = `AdMob初期化エラー: ${JSON.stringify(err)}`;
        console.error(errorMessage);
        console.error('エラー詳細:', err);
        setError(errorMessage);

        // エラーをアラート表示（デバッグ用）
        if (isNativePlatform()) {
          alert(`AdMob初期化エラー: ${errorMessage}`);
        }
      }
    };

    initializeAdMob();
  }, []);

  // このコンポーネントはUIを表示しない（初期化のみ）
  if (error) {
    console.warn('AdMob初期化に失敗しましたが、アプリは正常に動作します:', error);
  }

  if (isInitialized) {
    console.log('AdMob準備完了');
  }

  return null;
}
