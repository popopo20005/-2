import { useState, useEffect, useRef } from 'react';

interface FocusMonitorProps {
  isQuizActive: boolean;
  className?: string;
}

interface FocusState {
  level: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'distracted';
  trend: 'improving' | 'stable' | 'declining';
  warnings: string[];
}

export function FocusMonitor({ isQuizActive, className = '' }: FocusMonitorProps) {
  const [focusState, setFocusState] = useState<FocusState>({
    level: 85,
    status: 'good',
    trend: 'stable',
    warnings: []
  });
  const [isVisible, setIsVisible] = useState(document.visibilityState === 'visible');
  const [mouseActivity, setMouseActivity] = useState(0);
  const [keyboardActivity, setKeyboardActivity] = useState(0);
  const [recentResponseTimes, setRecentResponseTimes] = useState<number[]>([]);

  // const activityTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastActivityTime = useRef(Date.now());
  const focusLevelHistory = useRef<number[]>([85]); // 履歴を保持

  // ウィンドウフォーカス追跡
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    const handleFocus = () => setIsVisible(true);
    const handleBlur = () => setIsVisible(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // マウス・キーボード活動追跡
  useEffect(() => {
    let mouseCount = 0;
    let keyCount = 0;

    const handleMouseMove = () => {
      mouseCount++;
      lastActivityTime.current = Date.now();
    };

    const handleKeyPress = () => {
      keyCount++;
      lastActivityTime.current = Date.now();
    };

    const handleClick = () => {
      mouseCount += 2; // クリックは重要な活動として重み付け
      lastActivityTime.current = Date.now();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('click', handleClick);

    // 5秒ごとに活動量を更新
    const activityInterval = setInterval(() => {
      setMouseActivity(mouseCount);
      setKeyboardActivity(keyCount);
      mouseCount = 0;
      keyCount = 0;
    }, 5000);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('click', handleClick);
      clearInterval(activityInterval);
    };
  }, []);

  // 集中度計算と状態更新
  useEffect(() => {
    if (!isQuizActive) return;

    const calculateFocusLevel = (): number => {
      let focusScore = 100;
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime.current;

      // ウィンドウがアクティブでない場合は大幅減点
      if (!isVisible) {
        focusScore -= 40;
      }

      // 長時間非活動の場合は減点
      if (timeSinceLastActivity > 30000) { // 30秒以上非活動
        focusScore -= 30;
      } else if (timeSinceLastActivity > 15000) { // 15秒以上非活動
        focusScore -= 15;
      }

      // 活動量が少ない場合は減点
      const totalActivity = mouseActivity + keyboardActivity;
      if (totalActivity < 5) {
        focusScore -= 20;
      } else if (totalActivity < 10) {
        focusScore -= 10;
      }

      // 解答時間パターンから集中度を推測
      if (recentResponseTimes.length >= 3) {
        const avgTime = recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length;
        const lastTime = recentResponseTimes[recentResponseTimes.length - 1];

        // 急激に解答時間が短くなった場合（適当回答の可能性）
        if (lastTime < avgTime * 0.3) {
          focusScore -= 25;
        }
        // 解答時間が極端に長い場合（注意散漫の可能性）
        else if (lastTime > avgTime * 2.5) {
          focusScore -= 20;
        }
      }

      return Math.max(0, Math.min(100, focusScore));
    };

    const updateFocusState = () => {
      const newLevel = calculateFocusLevel();
      focusLevelHistory.current.push(newLevel);

      // 履歴は最新20件のみ保持
      if (focusLevelHistory.current.length > 20) {
        focusLevelHistory.current.shift();
      }

      // トレンド分析
      const recent = focusLevelHistory.current.slice(-5);
      const older = focusLevelHistory.current.slice(-10, -5);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';

      // ステータス判定
      let status: FocusState['status'] = 'good';
      if (newLevel >= 85) status = 'excellent';
      else if (newLevel >= 70) status = 'good';
      else if (newLevel >= 50) status = 'fair';
      else if (newLevel >= 30) status = 'poor';
      else status = 'distracted';

      // 警告生成
      const warnings: string[] = [];
      if (!isVisible) warnings.push('ウィンドウがアクティブではありません');
      if (Date.now() - lastActivityTime.current > 30000) warnings.push('長時間操作がありません');
      if (mouseActivity + keyboardActivity < 5) warnings.push('活動量が少なくなっています');
      if (trend === 'declining') warnings.push('集中度が低下傾向にあります');

      setFocusState({
        level: newLevel,
        status,
        trend,
        warnings
      });
    };

    // 2秒ごとに集中度を更新
    const focusInterval = setInterval(updateFocusState, 2000);

    return () => clearInterval(focusInterval);
  }, [isQuizActive, isVisible, mouseActivity, keyboardActivity, recentResponseTimes]);

  // 外部から解答時間を追加するメソッド
  const addResponseTime = (responseTime: number) => {
    setRecentResponseTimes(prev => {
      const newTimes = [...prev, responseTime];
      return newTimes.slice(-10); // 最新10件のみ保持
    });
  };

  // 外部から利用できるようにref経由で公開
  useEffect(() => {
    const monitor = {
      addResponseTime,
      getCurrentFocusLevel: () => focusState.level,
      getCurrentStatus: () => focusState.status
    };

    // グローバルに参照可能にする（デバッグ用）
    (window as any).focusMonitor = monitor;

    return () => {
      delete (window as any).focusMonitor;
    };
  }, [focusState]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'excellent': return 'text-green-600 dark:text-green-400';
      case 'good': return 'text-blue-600 dark:text-blue-400';
      case 'fair': return 'text-yellow-600 dark:text-yellow-400';
      case 'poor': return 'text-orange-600 dark:text-orange-400';
      case 'distracted': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'excellent': return '🎯';
      case 'good': return '😊';
      case 'fair': return '😐';
      case 'poor': return '😕';
      case 'distracted': return '😵';
      default: return '🤔';
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'improving': return '📈';
      case 'stable': return '➡️';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'excellent': return '集中度抜群';
      case 'good': return '良好な集中状態';
      case 'fair': return '普通の集中状態';
      case 'poor': return '集中度やや低下';
      case 'distracted': return '注意散漫';
      default: return '状態不明';
    }
  };

  if (!isQuizActive) return null;

  return (
    <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-600 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">リアルタイム集中度</h3>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon(focusState.status)}</span>
          <span className="text-lg">{getTrendIcon(focusState.trend)}</span>
        </div>
      </div>

      {/* 集中度メーター */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">集中レベル</span>
          <span className={`text-sm font-bold ${getStatusColor(focusState.status)}`}>
            {focusState.level}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              focusState.level >= 85
                ? 'bg-green-500'
                : focusState.level >= 70
                ? 'bg-blue-500'
                : focusState.level >= 50
                ? 'bg-yellow-500'
                : focusState.level >= 30
                ? 'bg-orange-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${focusState.level}%` }}
          ></div>
        </div>
      </div>

      {/* ステータステキスト */}
      <div className="text-center mb-2">
        <span className={`text-sm font-medium ${getStatusColor(focusState.status)}`}>
          {getStatusText(focusState.status)}
        </span>
      </div>

      {/* 警告表示 */}
      {focusState.warnings.length > 0 && (
        <div className="space-y-1">
          {focusState.warnings.map((warning, index) => (
            <div
              key={index}
              className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-1"
            >
              ⚠️ {warning}
            </div>
          ))}
        </div>
      )}

      {/* 詳細情報（開発者向け） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>ウィンドウ: {isVisible ? '✅' : '❌'}</div>
            <div>マウス活動: {mouseActivity}</div>
            <div>キーボード活動: {keyboardActivity}</div>
            <div>解答回数: {recentResponseTimes.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}