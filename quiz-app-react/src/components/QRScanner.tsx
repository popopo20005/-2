import { useState, useRef, useEffect } from 'react';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onError, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);

  useEffect(() => {
    const initScanner = async () => {
      if (!videoRef.current) return;

      try {
        // カメラの利用可能性をチェック
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          setHasCamera(false);
          onError('カメラが見つかりません。ファイルからQRコードを読み込んでください。');
          return;
        }

        // QRスキャナーを初期化
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            console.log('QRコード検出:', result.data);
            onScan(result.data);
            scanner.stop();
            setIsScanning(false);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5,
            preferredCamera: 'environment' // 背面カメラを優先
          }
        );

        scannerRef.current = scanner;
        await scanner.start();
        setIsScanning(true);
      } catch (error: any) {
        console.error('スキャナー初期化エラー:', error);
        onError('カメラの起動に失敗しました: ' + (error?.message || '不明なエラー'));
      }
    };

    initScanner();

    // クリーンアップ
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, [onScan, onError]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file);
      onScan(result);
    } catch (error: any) {
      console.error('ファイル読み取りエラー:', error);
      onError('QRコードの読み取りに失敗しました。有効なQRコード画像を選択してください。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            📱 QRコードをスキャン
          </h3>
          <button
            onClick={onClose}
            className="quiz-action-button text-sm px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>

        {hasCamera ? (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-48 bg-black rounded-lg object-cover"
                playsInline
                muted
              />
              {isScanning && (
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                QRコードをカメラの中央に合わせてください
              </p>
              {isScanning && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-600 dark:text-blue-400">スキャン中...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              カメラが利用できません
            </p>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              📁 ファイルからQRコードを読み込み
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
            />
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            PNG, JPG, GIF形式に対応
          </p>
        </div>

        <div className="flex space-x-2 mt-4">
          <button
            onClick={onClose}
            className="quiz-action-button flex-1 px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}