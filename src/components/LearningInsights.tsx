import { useState, useEffect } from 'react';
import { analyticsStatisticsService } from '../lib/analyticsStatistics';
import type { WeightedStatsResult, LearningPatternAnalysis, CategoryAnalysis } from '../lib/analyticsStatistics';

interface LearningInsightsProps {
  onBack: () => void;
  isDarkMode: boolean;
  language?: 'ja' | 'en';
}

export function LearningInsights({ onBack, language = 'ja' }: LearningInsightsProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      title: '🎯 学習インサイト',
      backButton: '← 戻る',
      loading: '学習分析データを読み込み中...',
      loadingError: '学習分析データの読み込みに失敗:',
      // タブ
      overviewTab: '📊 概要',
      patternsTab: '📈 学習パターン',
      categoriesTab: '📚 分野別分析',
      qualityTab: '⭐ 学習品質',
      // デバッグ情報
      debugInfo: 'デバッグ: 解答数={totalAnswered}, 信頼できる解答数={reliableAnswers}',
      // 概要タブ
      weightedAccuracy: '信頼性重み付き正答率',
      reliableAnswers: '信頼できる解答数',
      avgResponseTime: '平均解答時間',
      casualAnswerRate: '適当回答率',
      confidenceDistribution: '確信度分布',
      highConfidence: '確信あり',
      mediumConfidence: '普通',
      lowConfidence: '自信なし',
      noDataTitle: '学習データがまだありません',
      noDataDesc: 'クイズを解答すると、学習分析データが表示されます。',
      reloadData: 'データを再読み込み',
      // 学習パターンタブ
      optimalSessionLength: '最適学習時間',
      optimalSessionDesc: 'この時間での学習が最も効率的です',
      fatigueThreshold: '疲労闾值',
      fatigueThresholdDesc: 'この時間を超えると集中力が低下します',
      peakPerformanceHours: 'パフォーマンスが高い時間帯',
      learningEfficiencyTrend: '学習効率トレンド',
      minutes: '分',
      hours: '時',
      // 分野別分析タブ
      needsImprovement: '要強化',
      accuracy: '正答率',
      avgResponseTimeLabel: '平均解答時間',
      improvementTrend: '改善傾向',
      difficultyRating: '体感難易度',
      // 学習品質タブ
      qualityScore: '📊 学習品質スコア',
      qualityExcellent: '優秀な学習品質です！',
      qualityGood: '良い学習品質です',
      qualityNeedsImprovement: '改善の余地があります',
      qualityPoor: '学習方法を見直しましょう',
      timeAnalysis: '⏱️ 学習時間分析',
      seriousStudyTime: '真剣な学習時間',
      casualStudyTime: '適当な学習時間',
      efficientTimeRatio: '効率的な学習時間の割合',
      reliableAnswersRatio: '信頼できる解答の割合',
      timeEfficiencyImprovement: '💡 時間効率の改善提案',
      improvementSuggestion1: '• 適当回答を減らすことで学習効率を上げられます',
      improvementSuggestion2: '• 問題文をしっかり読んでから答える習慣をつけましょう',
      excellentFocus: '• 素晴らしい集中力です！この調子で続けましょう',
      focusedPerformanceTrend: '📈 集中状態での成績推移',
      focusedTime: '集中時',
      overall: '全体',
      qualityIndex: '品質指数',
      qualityImprovementTips: '🎯 学習品質向上のコツ',
      qualityTip1: '• 集中状態での正答率が全体よりも高い場合は、集中できる環境作りが重要です',
      qualityTip2: '• 品質指数80以上を目指して、適当回答を減らしましょう',
      qualityTip3: '• 学習前の準備（調子診断）を活用して最適な状態で学習を始めましょう',
      reliabilityAnalysis: '🔍 解答信頼性分析',
      reliableAnswersCount: '信頼できる解答',
      casualAnswersCount: '適当な解答',
      reliabilityRatio: '信頼性比率',
      highQualityLearning: '🏆 高品質な学習',
      goodLearningHabits: '👍 良い学習習慣',
      needsImprovement2: '🎯 改善が必要'
    },
    en: {
      title: '🎯 Learning Insights',
      backButton: '← Back',
      loading: 'Loading learning analytics data...',
      loadingError: 'Failed to load learning analytics data:',
      // Tabs
      overviewTab: '📊 Overview',
      patternsTab: '📈 Learning Patterns',
      categoriesTab: '📚 Category Analysis',
      qualityTab: '⭐ Learning Quality',
      // Debug info
      debugInfo: 'Debug: Answers={totalAnswered}, Reliable answers={reliableAnswers}',
      // Overview tab
      weightedAccuracy: 'Reliability-Weighted Accuracy',
      reliableAnswers: 'Reliable Answers',
      avgResponseTime: 'Average Response Time',
      casualAnswerRate: 'Casual Answer Rate',
      confidenceDistribution: 'Confidence Distribution',
      highConfidence: 'High Confidence',
      mediumConfidence: 'Medium',
      lowConfidence: 'Low Confidence',
      noDataTitle: 'No learning data available yet',
      noDataDesc: 'Answer quizzes to see learning analytics data.',
      reloadData: 'Reload Data',
      // Learning patterns tab
      optimalSessionLength: 'Optimal Session Length',
      optimalSessionDesc: 'Learning at this duration is most efficient',
      fatigueThreshold: 'Fatigue Threshold',
      fatigueThresholdDesc: 'Concentration decreases after this duration',
      peakPerformanceHours: 'Peak Performance Hours',
      learningEfficiencyTrend: 'Learning Efficiency Trend',
      minutes: ' min',
      hours: ':00',
      // Category analysis tab
      needsImprovement: 'Needs Improvement',
      accuracy: 'Accuracy',
      avgResponseTimeLabel: 'Avg Response Time',
      improvementTrend: 'Improvement Trend',
      difficultyRating: 'Difficulty Rating',
      // Learning quality tab
      qualityScore: '📊 Learning Quality Score',
      qualityExcellent: 'Excellent learning quality!',
      qualityGood: 'Good learning quality',
      qualityNeedsImprovement: 'Room for improvement',
      qualityPoor: 'Consider reviewing your learning methods',
      timeAnalysis: '⏱️ Study Time Analysis',
      seriousStudyTime: 'Focused Study Time',
      casualStudyTime: 'Casual Study Time',
      efficientTimeRatio: 'Efficient Study Time Ratio',
      reliableAnswersRatio: 'Reliable Answers Ratio',
      timeEfficiencyImprovement: '💡 Time Efficiency Improvement Suggestions',
      improvementSuggestion1: '• Reduce casual answers to improve learning efficiency',
      improvementSuggestion2: '• Develop the habit of reading questions carefully before answering',
      excellentFocus: '• Excellent focus! Keep up this great work',
      focusedPerformanceTrend: '📈 Focused Performance Trend',
      focusedTime: 'Focused',
      overall: 'Overall',
      qualityIndex: 'Quality Index',
      qualityImprovementTips: '🎯 Tips for Improving Learning Quality',
      qualityTip1: '• When focused accuracy is higher than overall, creating a focused environment is crucial',
      qualityTip2: '• Aim for a quality index of 80+ by reducing casual answers',
      qualityTip3: '• Use pre-study preparation (condition check) to start learning in optimal condition',
      reliabilityAnalysis: '🔍 Answer Reliability Analysis',
      reliableAnswersCount: 'Reliable Answers',
      casualAnswersCount: 'Casual Answers',
      reliabilityRatio: 'Reliability Ratio',
      highQualityLearning: '🏆 High-Quality Learning',
      goodLearningHabits: '👍 Good Learning Habits',
      needsImprovement2: '🎯 Needs Improvement'
    }
  };

  const currentLang = language as keyof typeof t;
  const [stats, setStats] = useState<WeightedStatsResult | null>(null);
  const [patterns, setPatterns] = useState<LearningPatternAnalysis | null>(null);
  const [categories, setCategories] = useState<CategoryAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'categories' | 'quality'>('overview');
  const [qualityData, setQualityData] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      console.log('Loading learning analytics...');

      const [statsResult, patternsResult, categoriesResult] = await Promise.all([
        analyticsStatisticsService.getWeightedStats(),
        analyticsStatisticsService.analyzeLearningPatterns(),
        analyticsStatisticsService.analyzeCategoryPerformance()
      ]);

      console.log('Analytics loaded:', { statsResult, patternsResult, categoriesResult });

      setStats(statsResult);
      setPatterns(patternsResult);
      setCategories(categoriesResult);

      // 学習品質データの生成
      const qualityResult = await generateQualityData(statsResult, patternsResult);
      setQualityData(qualityResult);
    } catch (error) {
      console.error(t[currentLang].loadingError, error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // 学習品質データの生成
  const generateQualityData = async (stats: WeightedStatsResult, patterns: LearningPatternAnalysis) => {
    // 真剣な学習時間 vs 総学習時間の計算
    const totalAnswers = stats.totalAnswered;
    const reliableAnswers = stats.reliableAnswers;
    const casualAnswers = totalAnswers - reliableAnswers;

    // 推定学習時間（平均解答時間 × 問題数）
    const totalStudyTime = stats.avgResponseTime * totalAnswers;
    const seriousStudyTime = stats.reliableResponseTime * reliableAnswers;
    const casualStudyTime = totalStudyTime - seriousStudyTime;

    // 学習品質スコア（0-100）
    const qualityScore = Math.round(
      (reliableAnswers / Math.max(totalAnswers, 1)) * 100 * 0.4 + // 信頼度の割合 40%
      (stats.weightedAccuracy / 100) * 100 * 0.3 + // 加重正答率 30%
      (patterns.avgFocusRetention * 100) * 0.2 + // 集中持続率 20%
      Math.min(100, patterns.optimalSessionLength / 30 * 100) * 0.1 // 最適セッション長 10%
    );

    // 集中状態での成績推移データ
    const focusedPerformanceTrend = patterns.learningEfficiencyTrend.map((trend) => ({
      date: trend.date,
      focusedAccuracy: trend.reliability * 100,
      overallAccuracy: trend.efficiency * 100,
      qualityIndex: (trend.reliability + trend.efficiency) / 2 * 100
    }));

    // 時間効率データ
    const timeEfficiency = {
      seriousTimeRatio: seriousStudyTime / Math.max(totalStudyTime, 1),
      avgResponseTimeByReliability: {
        reliable: stats.reliableResponseTime,
        casual: casualAnswers > 0 ? casualStudyTime / casualAnswers : 0,
        overall: stats.avgResponseTime
      },
      timeWasted: casualStudyTime,
      effectiveTime: seriousStudyTime
    };

    return {
      timeAnalysis: {
        totalStudyTime,
        seriousStudyTime,
        casualStudyTime,
        timeEfficiency
      },
      qualityScore,
      focusedPerformanceTrend,
      reliability: {
        reliableAnswers,
        casualAnswers,
        reliabilityRatio: reliableAnswers / Math.max(totalAnswers, 1)
      }
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{t[currentLang].loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t[currentLang].title}</h1>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all shadow-md"
            >
              {t[currentLang].backButton}
            </button>
          </div>

          {/* タブナビゲーション */}
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t[currentLang].overviewTab}
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'patterns'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t[currentLang].patternsTab}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'categories'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t[currentLang].categoriesTab}
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'quality'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t[currentLang].qualityTab}
            </button>
          </div>
        </header>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div>
            {/* デバッグ情報 */}
            <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <p className="text-sm">
                {t[currentLang].debugInfo.replace('{totalAnswered}', (stats?.totalAnswered || 0).toString()).replace('{reliableAnswers}', (stats?.reliableAnswers || 0).toString())}
              </p>
            </div>

            {stats && stats.totalAnswered > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t[currentLang].weightedAccuracy}</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatPercent(stats.weightedAccuracy)}
                        </p>
                      </div>
                      <div className="text-3xl">🎯</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t[currentLang].reliableAnswers}</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {stats.reliableAnswers} / {stats.totalAnswered}
                        </p>
                      </div>
                      <div className="text-3xl">✅</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t[currentLang].avgResponseTime}</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {formatTime(stats.reliableResponseTime)}
                        </p>
                      </div>
                      <div className="text-3xl">⏱️</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t[currentLang].casualAnswerRate}</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {formatPercent(stats.casualAnswerRate)}
                        </p>
                      </div>
                      <div className="text-3xl">🎲</div>
                    </div>
                  </div>
                </div>

                {/* 確信度分布 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].confidenceDistribution}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(stats.confidenceDistribution).map(([level, count]) => (
                      <div key={level} className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {level === 'high' ? t[currentLang].highConfidence : level === 'medium' ? t[currentLang].mediumConfidence : t[currentLang].lowConfidence}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t[currentLang].noDataTitle}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t[currentLang].noDataDesc}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {t[currentLang].reloadData}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 学習パターンタブ */}
        {activeTab === 'patterns' && patterns && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].optimalSessionLength}</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {patterns.optimalSessionLength}{t[currentLang].minutes}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {t[currentLang].optimalSessionDesc}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].fatigueThreshold}</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {patterns.fatigueThreshold}{t[currentLang].minutes}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {t[currentLang].fatigueThresholdDesc}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].peakPerformanceHours}</h3>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 24 }, (_, i) => {
                  const isOptimal = patterns.peakPerformanceHours.includes(i);
                  return (
                    <div
                      key={i}
                      className={`p-2 text-center rounded ${
                        isOptimal
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {i}{t[currentLang].hours}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].learningEfficiencyTrend}</h3>
              <div className="space-y-2">
                {patterns.learningEfficiencyTrend.slice(-7).map((trend) => (
                  <div key={trend.date} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{trend.date}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${trend.efficiency * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{formatPercent(trend.efficiency * 100)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 分野別分析タブ */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {categories.map((category) => (
              <div
                key={category.category}
                className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-l-4 ${
                  category.recommendedFocus
                    ? 'border-red-500'
                    : category.weightedAccuracy >= 80
                    ? 'border-green-500'
                    : 'border-yellow-500'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {category.category}
                  </h3>
                  {category.recommendedFocus && (
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">
                      {t[currentLang].needsImprovement}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatPercent(category.weightedAccuracy)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].accuracy}</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {category.reliableAnswers}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].reliableAnswersCount}</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatTime(category.avgResponseTime)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].avgResponseTimeLabel}</div>
                  </div>

                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      category.improvementTrend > 0
                        ? 'text-green-600 dark:text-green-400'
                        : category.improvementTrend < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {category.improvementTrend > 0 ? '+' : ''}{formatPercent(category.improvementTrend)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].improvementTrend}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t[currentLang].difficultyRating}</span>
                    <div className="flex space-x-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full ${
                            i < category.difficultyRating
                              ? 'bg-yellow-400'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 学習品質タブ */}
        {activeTab === 'quality' && qualityData && (
          <div className="space-y-6">
            {/* 総合品質スコア */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].qualityScore}</h3>
              <div className="relative">
                <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                  {qualityData.qualityScore}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">/ 100</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${qualityData.qualityScore}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {qualityData.qualityScore >= 80 ? t[currentLang].qualityExcellent :
                   qualityData.qualityScore >= 60 ? t[currentLang].qualityGood :
                   qualityData.qualityScore >= 40 ? t[currentLang].qualityNeedsImprovement :
                   t[currentLang].qualityPoor}
                </p>
              </div>
            </div>

            {/* 学習時間分析 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].timeAnalysis}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].seriousStudyTime}</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatTime(qualityData.timeAnalysis.seriousStudyTime)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${qualityData.timeAnalysis.timeEfficiency.seriousTimeRatio * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].casualStudyTime}</span>
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {formatTime(qualityData.timeAnalysis.casualStudyTime)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${(1 - qualityData.timeAnalysis.timeEfficiency.seriousTimeRatio) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {formatPercent(qualityData.timeAnalysis.timeEfficiency.seriousTimeRatio * 100)}
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">{t[currentLang].efficientTimeRatio}</div>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                      {formatPercent(qualityData.reliability.reliabilityRatio * 100)}
                    </div>
                    <div className="text-sm text-green-800 dark:text-green-200">{t[currentLang].reliableAnswersRatio}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t[currentLang].timeEfficiencyImprovement}</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {qualityData.timeAnalysis.timeEfficiency.seriousTimeRatio < 0.7 && (
                    <li>{t[currentLang].improvementSuggestion1}</li>
                  )}
                  {qualityData.reliability.casualAnswers > qualityData.reliability.reliableAnswers && (
                    <li>{t[currentLang].improvementSuggestion2}</li>
                  )}
                  {qualityData.timeAnalysis.timeEfficiency.seriousTimeRatio > 0.8 && (
                    <li>{t[currentLang].excellentFocus}</li>
                  )}
                </ul>
              </div>
            </div>

            {/* 集中状態での成績推移 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].focusedPerformanceTrend}</h3>
              <div className="space-y-4">
                {qualityData.focusedPerformanceTrend.slice(-7).map((trend: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-20">{trend.date}</span>
                    <div className="flex-1 ml-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{t[currentLang].focusedTime}</span>
                        <span className="text-xs font-medium">{formatPercent(trend.focusedAccuracy)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${trend.focusedAccuracy}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{t[currentLang].overall}</span>
                        <span className="text-xs font-medium">{formatPercent(trend.overallAccuracy)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gray-400 h-2 rounded-full"
                          style={{ width: `${trend.overallAccuracy}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className={`text-xs font-bold ${
                        trend.qualityIndex >= 80 ? 'text-green-600 dark:text-green-400' :
                        trend.qualityIndex >= 60 ? 'text-blue-600 dark:text-blue-400' :
                        'text-orange-600 dark:text-orange-400'
                      }`}>
                        {trend.qualityIndex.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-500">{t[currentLang].qualityIndex}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">{t[currentLang].qualityImprovementTips}</h4>
                <div className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                  <p>{t[currentLang].qualityTip1}</p>
                  <p>{t[currentLang].qualityTip2}</p>
                  <p>{t[currentLang].qualityTip3}</p>
                </div>
              </div>
            </div>

            {/* 信頼性分析 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].reliabilityAnalysis}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {qualityData.reliability.reliableAnswers}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200">{t[currentLang].reliableAnswersCount}</div>
                </div>

                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                    {qualityData.reliability.casualAnswers}
                  </div>
                  <div className="text-sm text-orange-800 dark:text-orange-200">{t[currentLang].casualAnswersCount}</div>
                </div>

                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {formatPercent(qualityData.reliability.reliabilityRatio * 100)}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">{t[currentLang].reliabilityRatio}</div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <div className={`inline-block px-4 py-2 rounded-full ${
                  qualityData.reliability.reliabilityRatio >= 0.8
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : qualityData.reliability.reliabilityRatio >= 0.6
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                }`}>
                  {qualityData.reliability.reliabilityRatio >= 0.8 ? t[currentLang].highQualityLearning :
                   qualityData.reliability.reliabilityRatio >= 0.6 ? t[currentLang].goodLearningHabits :
                   t[currentLang].needsImprovement2}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}