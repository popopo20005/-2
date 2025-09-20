import { useState, useEffect } from 'react';

interface DailyCondition {
  overall: number; // 1-5 scale
  focus: number; // 1-5 scale
  motivation: number; // 1-5 scale
  energy: number; // 1-5 scale
  confidence: number; // 1-5 scale
  mood: string; // 'excellent' | 'good' | 'neutral' | 'poor' | 'bad'
  notes?: string;
  timestamp: Date;
}

interface ConditionAnalysis {
  todayScore: number;
  weeklyAverage: number;
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
  optimalConditions: {
    bestTime: string;
    bestDay: string;
    idealSessionLength: number;
  };
}

interface DailyConditionAssessmentProps {
  onConditionSubmit?: (condition: DailyCondition) => void;
  onClose?: () => void;
  isDarkMode?: boolean;
}

export function DailyConditionAssessment({
  onConditionSubmit,
  onClose
}: DailyConditionAssessmentProps) {
  const [currentCondition, setCurrentCondition] = useState<DailyCondition>({
    overall: 3,
    focus: 3,
    motivation: 3,
    energy: 3,
    confidence: 3,
    mood: 'neutral',
    timestamp: new Date()
  });

  const [analysis, setAnalysis] = useState<ConditionAnalysis | null>(null);
  const [step, setStep] = useState<'assessment' | 'results' | 'analysis'>('assessment');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);

  useEffect(() => {
    checkTodaySubmission();
    loadPreviousAnalysis();
  }, []);

  // 今日既に提出済みかチェック
  const checkTodaySubmission = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // データベースから今日の記録を確認（実装に合わせて調整）
      // 簡略化のためlocalStorageを使用
      const todayRecord = localStorage.getItem(`daily-condition-${today}`);
      setHasSubmittedToday(!!todayRecord);
    } catch (error) {
      console.error('今日の記録確認エラー:', error);
    }
  };

  // 過去の分析データを読み込み
  const loadPreviousAnalysis = async () => {
    try {
      setIsLoading(true);
      const weeklyData = getWeeklyConditionData();
      const analysisResult = await analyzeConditionData(weeklyData);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('分析データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 週間データの取得（localStorageから）
  const getWeeklyConditionData = (): DailyCondition[] => {
    const weeklyData: DailyCondition[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];

      const record = localStorage.getItem(`daily-condition-${dateKey}`);
      if (record) {
        try {
          const condition = JSON.parse(record);
          weeklyData.push({
            ...condition,
            timestamp: new Date(condition.timestamp)
          });
        } catch (error) {
          console.warn('記録の解析に失敗:', dateKey);
        }
      }
    }

    return weeklyData.reverse(); // 古い順にソート
  };

  // 調子データの分析
  const analyzeConditionData = async (weeklyData: DailyCondition[]): Promise<ConditionAnalysis> => {
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const todayRecord = localStorage.getItem(`daily-condition-${todayKey}`);

    let todayScore = 0;
    if (todayRecord) {
      const todayCondition = JSON.parse(todayRecord);
      todayScore = (todayCondition.overall + todayCondition.focus +
                   todayCondition.motivation + todayCondition.energy +
                   todayCondition.confidence) / 5;
    }

    // 週間平均の計算
    const weeklyAverage = weeklyData.length > 0
      ? weeklyData.reduce((sum, condition) => {
          return sum + (condition.overall + condition.focus + condition.motivation +
                       condition.energy + condition.confidence) / 5;
        }, 0) / weeklyData.length
      : 3;

    // トレンド分析
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (weeklyData.length >= 3) {
      const recent = weeklyData.slice(-3);
      const older = weeklyData.slice(-6, -3);

      const recentAvg = recent.reduce((sum, c) => sum + c.overall, 0) / recent.length;
      const olderAvg = older.length > 0
        ? older.reduce((sum, c) => sum + c.overall, 0) / older.length
        : recentAvg;

      if (recentAvg > olderAvg + 0.3) trend = 'improving';
      else if (recentAvg < olderAvg - 0.3) trend = 'declining';
    }

    // 推奨事項の生成
    const recommendations: string[] = [];

    if (todayScore < 2.5) {
      recommendations.push('今日は軽めの学習から始めることをお勧めします');
      recommendations.push('短いセッション（10-15分）で様子を見ましょう');
    } else if (todayScore > 4) {
      recommendations.push('調子が良いです！今日は挑戦的な問題に取り組みましょう');
      recommendations.push('長めのセッションでも集中を維持できそうです');
    } else {
      recommendations.push('通常通りの学習ペースで進めましょう');
    }

    if (trend === 'declining') {
      recommendations.push('最近調子が下降気味です。休息も大切にしてください');
    } else if (trend === 'improving') {
      recommendations.push('調子が上向きです！この調子で続けましょう');
    }

    // 最適条件の分析（簡略化）
    const optimalConditions = {
      bestTime: '9:00-11:00', // 実際はデータから分析
      bestDay: '火曜日', // 実際はデータから分析
      idealSessionLength: todayScore > 3.5 ? 30 : 20 // 調子に応じて調整
    };

    return {
      todayScore,
      weeklyAverage,
      trend,
      recommendations,
      optimalConditions
    };
  };

  // 調子の評価提出
  const handleSubmitCondition = async () => {
    try {
      setIsLoading(true);

      // データを保存
      const today = new Date().toISOString().split('T')[0];
      const conditionData = {
        ...currentCondition,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(`daily-condition-${today}`, JSON.stringify(conditionData));

      // 分析を実行
      const weeklyData = getWeeklyConditionData();
      const analysisResult = await analyzeConditionData(weeklyData);
      setAnalysis(analysisResult);

      // コールバック実行
      if (onConditionSubmit) {
        onConditionSubmit(currentCondition);
      }

      setHasSubmittedToday(true);
      setStep('results');
    } catch (error) {
      console.error('調子評価の提出エラー:', error);
      alert('調子評価の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 評価値の更新
  const updateCondition = (field: keyof DailyCondition, value: any) => {
    setCurrentCondition(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 星評価コンポーネント
  const StarRating = ({
    value,
    onChange,
    label
  }: {
    value: number;
    onChange: (value: number) => void;
    label: string;
  }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={`w-6 h-6 rounded-full transition-colors ${
              star <= value
                ? 'bg-yellow-400 text-yellow-800'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
            }`}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  );

  // 気分選択コンポーネント
  const MoodSelector = () => {
    const moods = [
      { value: 'excellent', label: '最高', emoji: '🤩', color: 'bg-green-500' },
      { value: 'good', label: '良い', emoji: '😊', color: 'bg-blue-500' },
      { value: 'neutral', label: '普通', emoji: '😐', color: 'bg-gray-500' },
      { value: 'poor', label: '悪い', emoji: '😕', color: 'bg-orange-500' },
      { value: 'bad', label: '最悪', emoji: '😫', color: 'bg-red-500' },
    ];

    return (
      <div className="py-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">今日の気分</span>
        <div className="grid grid-cols-5 gap-2">
          {moods.map((mood) => (
            <button
              key={mood.value}
              onClick={() => updateCondition('mood', mood.value)}
              className={`p-2 rounded-lg text-center transition-all ${
                currentCondition.mood === mood.value
                  ? `${mood.color} text-white shadow-md transform scale-105`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <div className="text-lg">{mood.emoji}</div>
              <div className="text-xs">{mood.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (step === 'assessment') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            🌅 今日の調子診断
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          )}
        </div>

        {hasSubmittedToday ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              今日の調子診断は既に完了しています
            </p>
            <button
              onClick={() => setStep('analysis')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              分析結果を見る
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              今日の調子を教えてください。学習の効率を高めるために活用します。
            </div>

            <StarRating
              value={currentCondition.overall}
              onChange={(value) => updateCondition('overall', value)}
              label="総合的な調子"
            />

            <StarRating
              value={currentCondition.focus}
              onChange={(value) => updateCondition('focus', value)}
              label="集中力"
            />

            <StarRating
              value={currentCondition.motivation}
              onChange={(value) => updateCondition('motivation', value)}
              label="やる気"
            />

            <StarRating
              value={currentCondition.energy}
              onChange={(value) => updateCondition('energy', value)}
              label="エネルギー"
            />

            <StarRating
              value={currentCondition.confidence}
              onChange={(value) => updateCondition('confidence', value)}
              label="自信"
            />

            <MoodSelector />

            <div className="py-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                メモ（任意）
              </label>
              <textarea
                value={currentCondition.notes || ''}
                onChange={(e) => updateCondition('notes', e.target.value)}
                placeholder="今日の調子について何かあれば..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                rows={2}
              />
            </div>

            <button
              onClick={handleSubmitCondition}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isLoading ? '分析中...' : '診断完了'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'results' && analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            📊 診断結果
          </h3>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {analysis.todayScore.toFixed(1)}/5.0
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">今日の総合スコア</p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📈 今日の推奨事項</h4>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {analysis.weeklyAverage.toFixed(1)}
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-200">週間平均</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {analysis.trend === 'improving' ? '📈 上昇' :
                 analysis.trend === 'declining' ? '📉 下降' : '➡️ 安定'}
              </div>
              <div className="text-xs text-green-800 dark:text-green-200">トレンド</div>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setStep('analysis')}
              className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              詳細分析
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              学習開始
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'analysis' && analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            📈 詳細分析
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {analysis.todayScore.toFixed(1)}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">今日のスコア</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analysis.weeklyAverage.toFixed(1)}
              </div>
              <div className="text-sm text-green-800 dark:text-green-200">週間平均</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {analysis.optimalConditions.idealSessionLength}分
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-200">推奨セッション</div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">🎯 最適な学習条件</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">最適時間帯:</span>
                <span className="ml-2 font-medium">{analysis.optimalConditions.bestTime}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">最適曜日:</span>
                <span className="ml-2 font-medium">{analysis.optimalConditions.bestDay}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">💡 今日の学習戦略</h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return null;
}