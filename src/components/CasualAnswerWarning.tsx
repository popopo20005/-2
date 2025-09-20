import { useState, useEffect, useRef } from 'react';

interface CasualAnswerPattern {
  responseTime: number;
  timeToFirstClick: number;
  answerChangeCount: number;
  windowFocused: boolean;
  sequentialSameAnswers: number;
  rhythmicAnswering: boolean;
}

interface WarningState {
  isVisible: boolean;
  type: 'speed' | 'pattern' | 'focus' | 'rhythm' | 'multiple';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestions: string[];
  canDismiss: boolean;
}

interface CasualAnswerWarningProps {
  currentResponseTime?: number;
  timeToFirstClick?: number;
  answerChangeCount?: number;
  isWindowFocused?: boolean;
  recentAnswers?: Array<{ answer: any; time: number }>;
  onWarningAcknowledged?: () => void;
  onTakeBreak?: () => void;
  className?: string;
}

export function CasualAnswerWarning({
  currentResponseTime = 0,
  timeToFirstClick = 0,
  answerChangeCount = 0,
  isWindowFocused = true,
  recentAnswers = [],
  onWarningAcknowledged,
  onTakeBreak,
  className = ''
}: CasualAnswerWarningProps) {
  const [warning, setWarning] = useState<WarningState | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [consecutiveWarnings, setConsecutiveWarnings] = useState(0);
  const [lastWarningTime, setLastWarningTime] = useState(0);

  const responseTimeHistory = useRef<number[]>([]);
  const answerPatternHistory = useRef<any[]>([]);
  const warningCooldown = 30000; // 30秒のクールダウン

  // 適当回答パターンの検出
  useEffect(() => {
    if (!isEnabled || currentResponseTime === 0) return;

    const pattern = analyzeAnswerPattern({
      responseTime: currentResponseTime,
      timeToFirstClick,
      answerChangeCount,
      windowFocused: isWindowFocused,
      sequentialSameAnswers: countSequentialSameAnswers(recentAnswers),
      rhythmicAnswering: detectRhythmicAnswering(recentAnswers)
    });

    const warningResult = evaluatePattern(pattern);

    if (warningResult && shouldShowWarning()) {
      setWarning(warningResult);
      setConsecutiveWarnings(prev => prev + 1);
      setLastWarningTime(Date.now());
    }

    // 履歴の更新
    responseTimeHistory.current.push(currentResponseTime);
    if (responseTimeHistory.current.length > 20) {
      responseTimeHistory.current.shift();
    }

    if (recentAnswers.length > 0) {
      const latestAnswer = recentAnswers[recentAnswers.length - 1];
      answerPatternHistory.current.push(latestAnswer);
      if (answerPatternHistory.current.length > 20) {
        answerPatternHistory.current.shift();
      }
    }
  }, [currentResponseTime, timeToFirstClick, answerChangeCount, isWindowFocused, recentAnswers]);

  // 警告表示の判定
  const shouldShowWarning = (): boolean => {
    const now = Date.now();

    // クールダウン中は表示しない
    if (now - lastWarningTime < warningCooldown) {
      return false;
    }

    // 連続警告が多い場合は表示頻度を下げる
    if (consecutiveWarnings >= 3) {
      return Math.random() < 0.3; // 30%の確率
    } else if (consecutiveWarnings >= 2) {
      return Math.random() < 0.6; // 60%の確率
    }

    return true;
  };

  // 同じ答えが連続している数をカウント
  const countSequentialSameAnswers = (answers: Array<{ answer: any; time: number }>): number => {
    if (answers.length < 2) return 0;

    let count = 0;
    const latest = answers[answers.length - 1];

    for (let i = answers.length - 2; i >= 0; i--) {
      if (answers[i].answer === latest.answer) {
        count++;
      } else {
        break;
      }
    }

    return count;
  };

  // リズミカルな回答パターンの検出
  const detectRhythmicAnswering = (answers: Array<{ answer: any; time: number }>): boolean => {
    if (answers.length < 4) return false;

    const intervals: number[] = [];
    for (let i = 1; i < answers.length; i++) {
      intervals.push(answers[i].time - answers[i - 1].time);
    }

    // 間隔の標準偏差を計算
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // 標準偏差が小さい場合はリズミカル
    return stdDev < mean * 0.1 && mean < 5000; // 5秒以内で一定間隔
  };

  // 回答パターンの分析
  const analyzeAnswerPattern = (pattern: CasualAnswerPattern): CasualAnswerPattern => {
    return pattern;
  };

  // パターンの評価と警告生成
  const evaluatePattern = (pattern: CasualAnswerPattern): WarningState | null => {
    const warnings: Array<{ type: WarningState['type']; severity: WarningState['severity']; score: number }> = [];

    // 1. 極端に短い回答時間
    if (pattern.responseTime < 2000) { // 2秒未満
      warnings.push({
        type: 'speed',
        severity: pattern.responseTime < 1000 ? 'high' : 'medium',
        score: (2000 - pattern.responseTime) / 2000
      });
    }

    // 2. 初回クリックまでの時間が短すぎる
    if (pattern.timeToFirstClick < 500) { // 0.5秒未満
      warnings.push({
        type: 'speed',
        severity: 'medium',
        score: 0.7
      });
    }

    // 3. ウィンドウフォーカス外での回答
    if (!pattern.windowFocused) {
      warnings.push({
        type: 'focus',
        severity: 'high',
        score: 0.9
      });
    }

    // 4. 同じ答えの連続
    if (pattern.sequentialSameAnswers >= 3) {
      warnings.push({
        type: 'pattern',
        severity: pattern.sequentialSameAnswers >= 5 ? 'high' : 'medium',
        score: Math.min(1, pattern.sequentialSameAnswers / 5)
      });
    }

    // 5. リズミカルな回答
    if (pattern.rhythmicAnswering) {
      warnings.push({
        type: 'rhythm',
        severity: 'medium',
        score: 0.6
      });
    }

    // 最も深刻な警告を選択
    if (warnings.length === 0) return null;

    const mostSerious = warnings.reduce((max, current) =>
      current.score > max.score ? current : max
    );

    return generateWarningMessage(mostSerious.type, mostSerious.severity, warnings.length > 1);
  };

  // 警告メッセージの生成
  const generateWarningMessage = (
    type: WarningState['type'],
    severity: WarningState['severity'],
    hasMultiple: boolean
  ): WarningState => {
    const messages = {
      speed: {
        low: {
          message: '回答が少し早いようです',
          suggestions: ['問題文をもう一度確認してみてください', '落ち着いて解答してみましょう']
        },
        medium: {
          message: '回答時間が短すぎます',
          suggestions: ['問題文をしっかり読んでから回答してください', '選択肢を慎重に検討してみてください', '理解してから回答することで学習効果が高まります']
        },
        high: {
          message: '非常に短い時間での回答が続いています',
          suggestions: ['問題を読まずに回答していませんか？', '学習効果を高めるため、じっくり考えてから回答してください', '適当に答えても学習になりません']
        }
      },
      pattern: {
        low: {
          message: '同じ選択肢を選ぶ傾向があります',
          suggestions: ['各問題を独立して考えてみてください']
        },
        medium: {
          message: '同じ答えが連続しています',
          suggestions: ['パターンで答えず、各問題をしっかり読んでください', '選択肢をよく比較検討してみてください']
        },
        high: {
          message: '明らかなパターン回答が検出されました',
          suggestions: ['適当に答えていませんか？', '真剣に取り組むことで学習効果が得られます', '少し休憩を取ることをお勧めします']
        }
      },
      focus: {
        low: {
          message: 'ウィンドウがアクティブではありません',
          suggestions: ['学習に集中するため画面に注目してください']
        },
        medium: {
          message: '他のアプリケーションを見ながら回答しています',
          suggestions: ['集中して学習するため、他の作業は一時停止してください']
        },
        high: {
          message: '注意が他に向いているようです',
          suggestions: ['学習に集中できない場合は休憩を取ってください', '環境を整えてから再開しましょう']
        }
      },
      rhythm: {
        low: {
          message: '一定のリズムで回答しています',
          suggestions: ['各問題の内容に応じて回答時間を調整してください']
        },
        medium: {
          message: '機械的な回答パターンが検出されました',
          suggestions: ['問題の内容をしっかり理解してから回答してください', '考える時間を十分に取ってください']
        },
        high: {
          message: '自動的な回答パターンが続いています',
          suggestions: ['適当に答えていませんか？', '学習効果を得るため真剣に取り組んでください']
        }
      },
      multiple: {
        low: {
          message: '複数の注意点があります',
          suggestions: ['学習姿勢を見直してみてください']
        },
        medium: {
          message: '学習パターンに問題があります',
          suggestions: ['より集中して取り組んでください', '適当な回答は学習効果を下げます']
        },
        high: {
          message: '適当回答の可能性が高いです',
          suggestions: ['真剣に学習に取り組んでください', '休憩を取って集中力を回復させてください', '学習目標を再確認してみてください']
        }
      }
    };

    const messageType = hasMultiple ? 'multiple' : type;
    const messageData = messages[messageType][severity];

    return {
      isVisible: true,
      type: messageType as WarningState['type'],
      severity,
      message: messageData.message,
      suggestions: messageData.suggestions,
      canDismiss: severity !== 'high'
    };
  };

  // 警告の確認
  const handleWarningAcknowledged = () => {
    setWarning(null);
    if (onWarningAcknowledged) {
      onWarningAcknowledged();
    }
  };

  // 休憩の提案
  const handleTakeBreak = () => {
    setWarning(null);
    setConsecutiveWarnings(0);
    if (onTakeBreak) {
      onTakeBreak();
    }
  };

  // 警告の無効化
  const handleDisableWarnings = () => {
    setIsEnabled(false);
    setWarning(null);
    localStorage.setItem('casualAnswerWarningsDisabled', 'true');
  };

  // 初期化時に設定を確認
  useEffect(() => {
    const disabled = localStorage.getItem('casualAnswerWarningsDisabled');
    if (disabled === 'true') {
      setIsEnabled(false);
    }
  }, []);

  if (!warning || !warning.isVisible || !isEnabled) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'low': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '💡';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border-l-4 ${getSeverityColor(warning.severity)} animate-slide-in`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <span className="text-2xl mr-2">{getSeverityIcon(warning.severity)}</span>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {warning.severity === 'high' ? '重要' : warning.severity === 'medium' ? '注意' : 'ヒント'}
            </h4>
          </div>
          {warning.canDismiss && (
            <button
              onClick={handleWarningAcknowledged}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
            >
              ✕
            </button>
          )}
        </div>

        <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
          {warning.message}
        </p>

        <div className="space-y-2 mb-4">
          {warning.suggestions.map((suggestion, index) => (
            <div key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
              <span className="text-blue-500 mr-1">•</span>
              {suggestion}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={handleWarningAcknowledged}
              className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
            >
              理解しました
            </button>
            {warning.severity === 'high' && (
              <button
                onClick={handleTakeBreak}
                className="flex-1 py-2 px-3 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
              >
                休憩する
              </button>
            )}
          </div>

          {consecutiveWarnings >= 2 && (
            <button
              onClick={handleDisableWarnings}
              className="w-full py-1 px-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              この警告を無効にする
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// CSS アニメーション用のスタイル（index.cssに追加）
export const warningStyles = `
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
`;