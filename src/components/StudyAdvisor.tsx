import { useState, useEffect } from 'react';
import { analyticsStatisticsService } from '../lib/analyticsStatistics';
import type { WeightedStatsResult, LearningPatternAnalysis } from '../lib/analyticsStatistics';

interface StudyContext {
  currentTime: Date;
  focusLevel: number; // 0-100
  recentPerformance: number; // 0-100
  mood: 'excellent' | 'good' | 'neutral' | 'poor' | 'bad';
  sessionDuration: number; // minutes
  environment: 'home' | 'library' | 'cafe' | 'other';
}

interface StudyAdvice {
  type: 'focus_improvement' | 'timing_optimization' | 'method_adjustment' | 'break_suggestion' | 'environment_change';
  title: string;
  description: string;
  actionSteps: string[];
  estimatedEffectiveness: number; // 1-10
  timeToImplement: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
}

interface BehaviorPattern {
  pattern: string;
  frequency: number;
  impact: 'positive' | 'neutral' | 'negative';
  recommendation: string;
  evidencePoints: string[];
}

interface StudyAdvisorProps {
  onBack?: () => void;
  onApplyAdvice?: (advice: StudyAdvice) => void;
  isDarkMode?: boolean;
}

export function StudyAdvisor({ onBack, onApplyAdvice }: StudyAdvisorProps) {
  const [studyContext, setStudyContext] = useState<StudyContext>({
    currentTime: new Date(),
    focusLevel: 75,
    recentPerformance: 80,
    mood: 'good',
    sessionDuration: 0,
    environment: 'home'
  });

  const [currentAdvice, setCurrentAdvice] = useState<StudyAdvice[]>([]);
  const [behaviorPatterns, setBehaviorPatterns] = useState<BehaviorPattern[]>([]);
  const [analyticsData, setAnalyticsData] = useState<{
    stats: WeightedStatsResult | null;
    patterns: LearningPatternAnalysis | null;
  }>({ stats: null, patterns: null });
  const [activeSection, setActiveSection] = useState<'advice' | 'patterns' | 'habits'>('advice');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAdvisorData();
    updateContext();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAdvisorData = async () => {
    try {
      setIsLoading(true);

      const [stats, patterns] = await Promise.all([
        analyticsStatisticsService.getWeightedStats(),
        analyticsStatisticsService.analyzeLearningPatterns()
      ]);

      setAnalyticsData({ stats, patterns });

      // 現在の状況に基づくアドバイス生成
      const advice = await generateContextualAdvice(stats, patterns, studyContext);
      setCurrentAdvice(advice);

      // 行動パターン分析
      const behaviorAnalysis = await analyzeBehaviorPatterns(stats, patterns);
      setBehaviorPatterns(behaviorAnalysis);

    } catch {
      console.error('アドバイザーデータの読み込みエラー');
    } finally {
      setIsLoading(false);
    }
  };

  const updateContext = () => {
    // 現在の集中度を取得（FocusMonitorから）
    const focusMonitor = (window as unknown as { focusMonitor?: { getCurrentFocusLevel(): number } }).focusMonitor;
    if (focusMonitor) {
      setStudyContext(prev => ({
        ...prev,
        focusLevel: focusMonitor.getCurrentFocusLevel() || prev.focusLevel
      }));
    }

    // 今日の調子を取得
    const today = new Date().toISOString().split('T')[0];
    const dailyCondition = localStorage.getItem(`daily-condition-${today}`);
    if (dailyCondition) {
      try {
        const condition = JSON.parse(dailyCondition);
        setStudyContext(prev => ({
          ...prev,
          mood: condition.mood
        }));
      } catch (error) {
        console.warn('今日の調子データの解析に失敗');
      }
    }
  };

  const generateContextualAdvice = async (
    stats: WeightedStatsResult,
    patterns: LearningPatternAnalysis,
    context: StudyContext
  ): Promise<StudyAdvice[]> => {
    const advice: StudyAdvice[] = [];
    const currentHour = context.currentTime.getHours();

    // 1. 集中力が低い場合のアドバイス
    if (context.focusLevel < 60) {
      advice.push({
        type: 'focus_improvement',
        title: '集中力向上のための即効対策',
        description: '現在の集中レベルが低下しています。以下の方法で集中力を回復させましょう。',
        actionSteps: [
          '深呼吸を3回行い、心を落ち着ける',
          '5分間の軽いストレッチをする',
          '水分補給をして脳の働きを活性化',
          '学習環境を整理整頓する',
          '15分の短いセッションから再開する'
        ],
        estimatedEffectiveness: 8,
        timeToImplement: 10,
        difficulty: 'easy',
        icon: '🧘'
      });
    }

    // 2. 最適でない時間帯での学習アドバイス
    if (!patterns.peakPerformanceHours.includes(currentHour)) {
      const nextOptimalHour = patterns.peakPerformanceHours
        .find(hour => hour > currentHour) || patterns.peakPerformanceHours[0];

      advice.push({
        type: 'timing_optimization',
        title: '学習タイミングの最適化',
        description: '現在の時間帯はあなたの最適な学習時間ではありません。',
        actionSteps: [
          `${nextOptimalHour}:00頃があなたの最適な学習時間です`,
          '今は軽い復習や暗記作業に留める',
          '重要な新しい内容は最適時間まで待つ',
          'アラームで最適時間を通知設定する'
        ],
        estimatedEffectiveness: 7,
        timeToImplement: 2,
        difficulty: 'easy',
        icon: '⏰'
      });
    }

    // 3. 調子が悪い時の学習法調整
    if (context.mood === 'poor' || context.mood === 'bad') {
      advice.push({
        type: 'method_adjustment',
        title: '調子が悪い時の学習戦略',
        description: '今日の調子が良くないようです。学習方法を調整しましょう。',
        actionSteps: [
          '難しい問題は避け、基礎的な復習に集中',
          '正答率の高いカテゴリーから始める',
          '10分間の短いセッションで細かく区切る',
          '音楽や環境音で気分を上げる',
          '完璧を求めず、継続を重視する'
        ],
        estimatedEffectiveness: 6,
        timeToImplement: 5,
        difficulty: 'easy',
        icon: '🎯'
      });
    }

    // 4. 長時間学習による疲労対策
    if (context.sessionDuration > patterns.fatigueThreshold) {
      advice.push({
        type: 'break_suggestion',
        title: '疲労回復のための休憩提案',
        description: '長時間の学習で疲労が蓄積しています。効果的な休憩を取りましょう。',
        actionSteps: [
          '15-20分の完全休憩を取る',
          '画面から目を離し、遠くを見る',
          '軽い運動や散歩をする',
          '好きな音楽を聴いてリラックス',
          '次のセッション時間を短めに設定'
        ],
        estimatedEffectiveness: 9,
        timeToImplement: 20,
        difficulty: 'easy',
        icon: '☕'
      });
    }

    // 5. 正答率が低い場合の対策
    if (stats.weightedAccuracy < 70) {
      advice.push({
        type: 'method_adjustment',
        title: '学習方法の見直し提案',
        description: '最近の正答率が低下しています。学習アプローチを変えてみましょう。',
        actionSteps: [
          '問題を解く前に関連知識を復習',
          '解答後に必ず解説を読む習慣をつける',
          '間違えた問題は翌日に再挑戦',
          '基礎問題から段階的に難易度を上げる',
          '理解できない部分は資料で調べる'
        ],
        estimatedEffectiveness: 8,
        timeToImplement: 15,
        difficulty: 'medium',
        icon: '📚'
      });
    }

    return advice.slice(0, 3); // 最大3つのアドバイス
  };

  const analyzeBehaviorPatterns = async (
    stats: WeightedStatsResult,
    patterns: LearningPatternAnalysis
  ): Promise<BehaviorPattern[]> => {
    const behaviorPatterns: BehaviorPattern[] = [];

    // 1. 適当回答パターン
    if (stats.casualAnswerRate > 20) {
      behaviorPatterns.push({
        pattern: '適当回答の頻度が高い',
        frequency: stats.casualAnswerRate,
        impact: 'negative',
        recommendation: '問題文をしっかり読む習慣をつけ、理解してから回答する',
        evidencePoints: [
          `適当回答率: ${stats.casualAnswerRate.toFixed(1)}%`,
          '学習効果の低下につながっています',
          '信頼できる解答の割合を増やしましょう'
        ]
      });
    }

    // 2. 学習時間パターン
    const optimalHours = patterns.peakPerformanceHours;
    behaviorPatterns.push({
      pattern: `最適学習時間: ${optimalHours.map(h => `${h}:00`).join(', ')}`,
      frequency: optimalHours.length / 24 * 100,
      impact: 'positive',
      recommendation: 'この時間帯を活用して重要な学習を行う',
      evidencePoints: [
        `${optimalHours.length}つの最適時間帯を特定`,
        'パフォーマンスが最も高い時間です',
        'スケジューリングの参考にしてください'
      ]
    });

    // 3. セッション長パターン
    if (patterns.optimalSessionLength < 20) {
      behaviorPatterns.push({
        pattern: '短時間集中型の学習スタイル',
        frequency: patterns.optimalSessionLength,
        impact: 'neutral',
        recommendation: '短いセッションを複数回に分けて効率を最大化',
        evidencePoints: [
          `最適セッション長: ${patterns.optimalSessionLength}分`,
          '集中力の持続時間が短めです',
          'ポモドーロテクニックが効果的'
        ]
      });
    } else if (patterns.optimalSessionLength > 40) {
      behaviorPatterns.push({
        pattern: '長時間集中型の学習スタイル',
        frequency: patterns.optimalSessionLength,
        impact: 'positive',
        recommendation: '長時間の集中力を活かして深い学習を行う',
        evidencePoints: [
          `最適セッション長: ${patterns.optimalSessionLength}分`,
          '優秀な集中持続力です',
          '複雑な問題に取り組むのに適しています'
        ]
      });
    }

    // 4. 学習効率トレンド
    const recentEfficiency = patterns.learningEfficiencyTrend.slice(-3);
    if (recentEfficiency.length > 0) {
      const avgEfficiency = recentEfficiency.reduce((sum, trend) => sum + trend.efficiency, 0) / recentEfficiency.length;
      if (avgEfficiency > 0.8) {
        behaviorPatterns.push({
          pattern: '高い学習効率を維持',
          frequency: avgEfficiency * 100,
          impact: 'positive',
          recommendation: '現在の学習方法を継続し、さらなる向上を目指す',
          evidencePoints: [
            `直近の学習効率: ${(avgEfficiency * 100).toFixed(1)}%`,
            '素晴らしい学習習慣が身についています',
            'この調子で継続してください'
          ]
        });
      } else if (avgEfficiency < 0.6) {
        behaviorPatterns.push({
          pattern: '学習効率の低下傾向',
          frequency: avgEfficiency * 100,
          impact: 'negative',
          recommendation: '学習方法や環境を見直し、効率改善を図る',
          evidencePoints: [
            `直近の学習効率: ${(avgEfficiency * 100).toFixed(1)}%`,
            '学習効率が低下しています',
            '休息や方法の見直しが必要かもしれません'
          ]
        });
      }
    }

    return behaviorPatterns;
  };

  const handleApplyAdvice = (advice: StudyAdvice) => {
    // アドバイスの適用ログを記録
    const appliedAdvice = {
      ...advice,
      appliedAt: new Date().toISOString(),
      context: studyContext
    };

    const adviceHistory = JSON.parse(localStorage.getItem('applied-advice-history') || '[]');
    adviceHistory.push(appliedAdvice);
    localStorage.setItem('applied-advice-history', JSON.stringify(adviceHistory.slice(-50))); // 最新50件保持

    if (onApplyAdvice) {
      onApplyAdvice(advice);
    }

    // 適用後のメッセージ表示
    alert(`「${advice.title}」を適用しました。効果を確認しながら学習を続けてください。`);
  };

  const getPatternColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'negative': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      default: return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getPatternIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return '✅';
      case 'negative': return '⚠️';
      default: return 'ℹ️';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">学習アドバイスを準備中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🎓 学習アドバイザー</h1>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all shadow-md"
              >
                ← 戻る
              </button>
            )}
          </div>

          {/* 現在の状況表示 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">現在の学習状況</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{studyContext.focusLevel}%</div>
                <div className="text-gray-600 dark:text-gray-400">集中度</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{studyContext.recentPerformance}%</div>
                <div className="text-gray-600 dark:text-gray-400">最近の成績</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {studyContext.mood === 'excellent' ? '最高' :
                   studyContext.mood === 'good' ? '良好' :
                   studyContext.mood === 'neutral' ? '普通' :
                   studyContext.mood === 'poor' ? '不調' : '悪い'}
                </div>
                <div className="text-gray-600 dark:text-gray-400">今日の調子</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {studyContext.currentTime.getHours()}:00
                </div>
                <div className="text-gray-600 dark:text-gray-400">現在時刻</div>
              </div>
            </div>
          </div>

          {/* タブナビゲーション */}
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveSection('advice')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeSection === 'advice'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              💡 今すぐ使えるアドバイス
            </button>
            <button
              onClick={() => setActiveSection('patterns')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeSection === 'patterns'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📊 行動パターン分析
            </button>
            <button
              onClick={() => setActiveSection('habits')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeSection === 'habits'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🔄 習慣改善プラン
            </button>
          </div>
        </header>

        {/* 今すぐ使えるアドバイス */}
        {activeSection === 'advice' && (
          <div className="space-y-6">
            {currentAdvice.map((advice, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">{advice.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {advice.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                        {advice.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {advice.estimatedEffectiveness}/10
                    </div>
                    <div className="text-xs text-gray-500">効果度</div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">実行手順:</h4>
                  <ol className="space-y-1">
                    {advice.actionSteps.map((step, stepIndex) => (
                      <li key={stepIndex} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                        <span className="text-blue-500 mr-2 font-medium">{stepIndex + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>⏱️ {advice.timeToImplement}分</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      advice.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      advice.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {advice.difficulty === 'easy' ? '簡単' :
                       advice.difficulty === 'medium' ? '普通' : '難しい'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleApplyAdvice(advice)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    適用する
                  </button>
                </div>
              </div>
            ))}

            {currentAdvice.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  素晴らしい学習状況です！
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  現在特別な改善提案はありません。この調子で学習を続けてください。
                </p>
              </div>
            )}
          </div>
        )}

        {/* 行動パターン分析 */}
        {activeSection === 'patterns' && (
          <div className="space-y-6">
            {behaviorPatterns.map((pattern, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-l-4 ${getPatternColor(pattern.impact)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getPatternIcon(pattern.impact)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {pattern.pattern}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                        {pattern.recommendation}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {pattern.frequency.toFixed(1)}
                      {pattern.pattern.includes('時間') ? '分' : '%'}
                    </div>
                    <div className="text-xs text-gray-500">頻度/値</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {pattern.evidencePoints.map((point, pointIndex) => (
                    <div key={pointIndex} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 習慣改善プラン */}
        {activeSection === 'habits' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🎯 週間改善目標</h3>

              <div className="space-y-4">
                {analyticsData.stats && analyticsData.stats.casualAnswerRate > 15 && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                      適当回答を減らす
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                      現在の適当回答率: {analyticsData.stats.casualAnswerRate.toFixed(1)}% → 目標: 10%以下
                    </p>
                    <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                      <li>• 問題文を最後まで読んでから解答</li>
                      <li>• 確信度が低い時は「自信なし」を選択</li>
                      <li>• 急がず、考える時間を確保</li>
                    </ul>
                  </div>
                )}

                {analyticsData.patterns && analyticsData.patterns.avgFocusRetention < 0.7 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      集中持続力を向上
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      現在の集中維持率: {(analyticsData.patterns.avgFocusRetention * 100).toFixed(1)}% → 目標: 80%以上
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• 学習前に5分間の準備時間を設ける</li>
                      <li>• スマートフォンを見えない場所に置く</li>
                      <li>• 25分学習・5分休憩のサイクルを試す</li>
                    </ul>
                  </div>
                )}

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    最適学習時間の活用
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                    あなたの最適時間: {analyticsData.patterns?.peakPerformanceHours.map(h => `${h}:00`).join(', ')}
                  </p>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• 重要な新規学習はこの時間に実施</li>
                    <li>• カレンダーにブロック時間として確保</li>
                    <li>• この時間の学習効果を測定・記録</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 進歩追跡</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {analyticsData.stats?.reliableAnswers || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">信頼できる解答数</div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    目標: 週50問以上
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {analyticsData.stats?.weightedAccuracy.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">重み付き正答率</div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    目標: 80%以上
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {analyticsData.patterns?.optimalSessionLength || 0}分
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">最適セッション長</div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    個人最適値を維持
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}