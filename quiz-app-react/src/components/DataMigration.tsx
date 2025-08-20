import { useState } from 'react';

interface DataMigrationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function DataMigration({ onComplete, onSkip }: DataMigrationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleMigration = async () => {
    setIsLoading(true);
    setProgress(0);

    try {
      // データ移行のシミュレーション
      const steps = ['問題データ移行中...', 'カテゴリデータ移行中...', '履歴データ移行中...', '完了'];
      
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProgress((i + 1) / steps.length * 100);
      }

      onComplete();
    } catch (error) {
      console.error('データ移行エラー:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            データ移行
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            既存のクイズデータが見つかりました。新しいシステムに移行しますか？
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center text-gray-600 dark:text-gray-300">
              移行中... {Math.round(progress)}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleMigration}
              className="quiz-action-button w-full py-3 px-4 rounded-lg transition-colors font-medium"
            >
              データを移行する
            </button>
            <button
              onClick={onSkip}
              className="quiz-action-button w-full py-3 px-4 rounded-lg transition-colors font-medium"
            >
              スキップして新規開始
            </button>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>移行しない場合でも、既存のデータは保持されます</p>
        </div>
      </div>
    </div>
  );
}