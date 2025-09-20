import { useState, useEffect } from 'react';
import { analyticsStatisticsService } from '../lib/analyticsStatistics';
import { recommendationEngine } from '../lib/recommendationEngine';
import type { WeightedStatsResult, CategoryAnalysis } from '../lib/analyticsStatistics';
import type { DifficultyAdjustment as DifficultyAdjustmentType } from '../lib/recommendationEngine';

interface DifficultyProfile {
  overall: number; // 1-5
  categories: Record<string, number>; // category -> difficulty level
  adaptiveMode: boolean;
  autoAdjustment: boolean;
  adjustmentSensitivity: 'low' | 'medium' | 'high';
  targetAccuracy: number; // percentage
  challengeMode: boolean;
  gradualProgression: boolean;
}

interface DifficultyHistory {
  date: string;
  category: string;
  oldDifficulty: number;
  newDifficulty: number;
  reason: string;
  performance: number;
  confidence: number;
}

interface PerformanceMetrics {
  accuracy: number;
  consistency: number;
  confidence: number;
  speed: number;
  overall: number;
}

interface DifficultyAdjustmentProps {
  onBack?: () => void;
  onApplySettings?: (profile: DifficultyProfile) => void;
  isDarkMode?: boolean;
  language?: 'ja' | 'en';
}

export function DifficultyAdjustment({ onBack, onApplySettings, language = 'ja' }: DifficultyAdjustmentProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      title: '⚖️ 難易度調整',
      backButton: '← 戻る',
      loading: '難易度設定を読み込み中...',
      // 推奨調整
      recommendedAdjustment: '難易度調整を推奨',
      level: 'レベル',
      confidence: '信頼度',
      apply: '適用',
      // タブ
      overviewTab: '📊 概要',
      categoriesTab: '📚 分野別設定',
      automaticTab: '🤖 自動調整',
      historyTab: '📈 履歴',
      // 現在の設定
      currentSettings: '🎯 現在の設定',
      overallDifficulty: '全体難易度',
      targetAccuracy: '目標正答率',
      adaptiveMode: '適応モード',
      autoAdjustment: '自動調整',
      challengeMode: 'チャレンジモード',
      // 難易度レベル
      beginner: '入門',
      elementary: '初級',
      intermediate: '中級',
      advanced: '上級',
      expert: '専門',
      unknown: '不明',
      // パフォーマンス指標
      performanceMetrics: '📈 パフォーマンス指標',
      accuracy: '正答率',
      consistency: '一貫性',
      confidence_metric: '信頼度',
      responseSpeed: '解答速度',
      overall: '総合',
      // 調整提案
      adjustmentSuggestions: '💡 調整提案',
      highAccuracySuggestion: '正答率が高いです。難易度を上げてより挑戦的な問題に取り組みましょう',
      lowAccuracySuggestion: '正答率が低下しています。難易度を下げて基礎固めを行いましょう',
      inconsistencySuggestion: '分野間の成績にばらつきがあります。苦手分野の難易度を調整しましょう',
      lowConfidenceSuggestion: '適当回答が多いです。適切な難易度で集中して学習しましょう',
      // 分野別設定
      accuracyLabel: '正答率',
      reliableAnswers: '信頼できる解答',
      problems: '問',
      needsImprovement: '要強化',
      currentDifficulty: '現在の難易度',
      recommendedActions: '推奨アクション',
      manualAdjustment: '手動調整',
      increaseDifficulty: '📈 難易度を上げる (正答率が高い)',
      decreaseDifficulty: '📉 難易度を下げる (正答率が低い)',
      performanceDecline: '⚠️ 成績低下中 - 難易度を下げる',
      highAccuracyAdjustment: '高正答率による自動上昇',
      lowAccuracyAdjustment: '低正答率による自動下降',
      performanceDeclineAdjustment: '成績低下による調整',
      // 自動調整設定
      autoAdjustmentSettings: '🤖 自動調整設定',
      adjustmentSensitivity: '調整感度',
      lowSensitivity: '低 (慎重な調整)',
      mediumSensitivity: '中 (バランス調整)',
      highSensitivity: '高 (積極的調整)',
      lowSensitivityDesc: '大きな変化があったときのみ調整します',
      mediumSensitivityDesc: '適度な変化で調整します',
      highSensitivityDesc: '小さな変化でも積極的に調整します',
      adjustmentRules: '調整ルール',
      enableAutoAdjustment: '自動調整を有効化',
      gradualProgression: '段階的進行',
      adjustmentConditions: '調整条件',
      accuracyIncrease: '正答率 > {target}% → 難易度上昇',
      accuracyDecrease: '正答率 < {target}% → 難易度下降',
      consecutiveCorrect: '連続5問正解 → 段階上昇チェック',
      consecutiveIncorrect: '連続3問不正解 → 段階下降チェック',
      resetToDefaults: 'デフォルトに戻す',
      saveSettings: '設定を保存',
      // 履歴
      adjustmentHistory: '📈 調整履歴',
      noHistoryTitle: '調整履歴がありません',
      noHistoryDesc: '難易度調整を行うと、ここに履歴が表示されます',
      performanceLabel: '正答率',
      confidenceLabel: '信頼度',
      // その他
      overall_category: '全体'
    },
    en: {
      title: '⚖️ Difficulty Adjustment',
      backButton: '← Back',
      loading: 'Loading difficulty settings...',
      // Recommended adjustment
      recommendedAdjustment: 'Difficulty adjustment recommended',
      level: 'Level',
      confidence: 'Confidence',
      apply: 'Apply',
      // Tabs
      overviewTab: '📊 Overview',
      categoriesTab: '📚 Category Settings',
      automaticTab: '🤖 Automatic',
      historyTab: '📈 History',
      // Current settings
      currentSettings: '🎯 Current Settings',
      overallDifficulty: 'Overall Difficulty',
      targetAccuracy: 'Target Accuracy',
      adaptiveMode: 'Adaptive Mode',
      autoAdjustment: 'Auto Adjustment',
      challengeMode: 'Challenge Mode',
      // Difficulty levels
      beginner: 'Beginner',
      elementary: 'Elementary',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
      unknown: 'Unknown',
      // Performance metrics
      performanceMetrics: '📈 Performance Metrics',
      accuracy: 'Accuracy',
      consistency: 'Consistency',
      confidence_metric: 'Confidence',
      responseSpeed: 'Response Speed',
      overall: 'Overall',
      // Adjustment suggestions
      adjustmentSuggestions: '💡 Adjustment Suggestions',
      highAccuracySuggestion: 'High accuracy rate. Increase difficulty for more challenging problems',
      lowAccuracySuggestion: 'Accuracy has declined. Lower difficulty to strengthen fundamentals',
      inconsistencySuggestion: 'Performance varies across categories. Adjust difficulty for weak areas',
      lowConfidenceSuggestion: 'Many random answers. Focus with appropriate difficulty',
      // Category settings
      accuracyLabel: 'Accuracy',
      reliableAnswers: 'Reliable answers',
      problems: ' problems',
      needsImprovement: 'Needs improvement',
      currentDifficulty: 'Current Difficulty',
      recommendedActions: 'Recommended Actions',
      manualAdjustment: 'Manual adjustment',
      increaseDifficulty: '📈 Increase difficulty (high accuracy)',
      decreaseDifficulty: '📉 Decrease difficulty (low accuracy)',
      performanceDecline: '⚠️ Performance declining - decrease difficulty',
      highAccuracyAdjustment: 'Auto increase due to high accuracy',
      lowAccuracyAdjustment: 'Auto decrease due to low accuracy',
      performanceDeclineAdjustment: 'Adjustment due to performance decline',
      // Auto adjustment settings
      autoAdjustmentSettings: '🤖 Auto Adjustment Settings',
      adjustmentSensitivity: 'Adjustment Sensitivity',
      lowSensitivity: 'Low (Conservative adjustment)',
      mediumSensitivity: 'Medium (Balanced adjustment)',
      highSensitivity: 'High (Aggressive adjustment)',
      lowSensitivityDesc: 'Adjust only when major changes occur',
      mediumSensitivityDesc: 'Adjust with moderate changes',
      highSensitivityDesc: 'Adjust aggressively with small changes',
      adjustmentRules: 'Adjustment Rules',
      enableAutoAdjustment: 'Enable auto adjustment',
      gradualProgression: 'Gradual progression',
      adjustmentConditions: 'Adjustment Conditions',
      accuracyIncrease: 'Accuracy > {target}% → Increase difficulty',
      accuracyDecrease: 'Accuracy < {target}% → Decrease difficulty',
      consecutiveCorrect: '5 consecutive correct → Check level increase',
      consecutiveIncorrect: '3 consecutive incorrect → Check level decrease',
      resetToDefaults: 'Reset to Defaults',
      saveSettings: 'Save Settings',
      // History
      adjustmentHistory: '📈 Adjustment History',
      noHistoryTitle: 'No adjustment history',
      noHistoryDesc: 'History will appear here when difficulty adjustments are made',
      performanceLabel: 'Accuracy',
      confidenceLabel: 'Confidence',
      // Other
      overall_category: 'Overall'
    }
  };

  const currentLang = language as keyof typeof t;
  const [difficultyProfile, setDifficultyProfile] = useState<DifficultyProfile>({
    overall: 3,
    categories: {},
    adaptiveMode: true,
    autoAdjustment: true,
    adjustmentSensitivity: 'medium',
    targetAccuracy: 75,
    challengeMode: false,
    gradualProgression: true
  });

  const [stats, setStats] = useState<WeightedStatsResult | null>(null);
  // const [patterns, setPatterns] = useState<LearningPatternAnalysis | null>(null);
  const [categories, setCategories] = useState<CategoryAnalysis[]>([]);
  const [recommendedAdjustment, setRecommendedAdjustment] = useState<DifficultyAdjustmentType | null>(null);
  const [difficultyHistory, setDifficultyHistory] = useState<DifficultyHistory[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'automatic' | 'history'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDifficultyData();
  }, []);

  const loadDifficultyData = async () => {
    try {
      setIsLoading(true);

      // Load analytics data
      const [statsResult, , categoriesResult] = await Promise.all([
        analyticsStatisticsService.getWeightedStats(),
        analyticsStatisticsService.analyzeLearningPatterns(),
        analyticsStatisticsService.analyzeCategoryPerformance()
      ]);

      setStats(statsResult);
      // setPatterns(patternsResult);
      setCategories(categoriesResult);

      // Load saved difficulty profile
      const savedProfile = loadSavedProfile();
      if (savedProfile) {
        setDifficultyProfile(savedProfile);
      } else {
        // Generate initial profile based on performance
        const initialProfile = generateInitialProfile(statsResult, categoriesResult);
        setDifficultyProfile(initialProfile);
      }

      // Get recommendation from engine
      const recommendation = await recommendationEngine.calculateAdaptiveDifficulty(language);
      setRecommendedAdjustment(recommendation);

      // Calculate performance metrics
      const metrics = calculatePerformanceMetrics(statsResult, categoriesResult);
      setPerformanceMetrics(metrics);

      // Load difficulty history
      const history = loadDifficultyHistory();
      setDifficultyHistory(history);

    } catch (error) {
      console.error('Error loading difficulty adjustment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedProfile = (): DifficultyProfile | null => {
    const saved = localStorage.getItem('difficulty-profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.warn('Failed to load saved difficulty profile:', error);
      }
    }
    return null;
  };

  const loadDifficultyHistory = (): DifficultyHistory[] => {
    const saved = localStorage.getItem('difficulty-history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.warn('Failed to load difficulty history:', error);
      }
    }
    return [];
  };

  const generateInitialProfile = (
    stats: WeightedStatsResult,
    categories: CategoryAnalysis[]
  ): DifficultyProfile => {
    // Base difficulty on overall performance
    let overallDifficulty = 3; // Default medium

    if (stats.weightedAccuracy >= 85) overallDifficulty = 4;
    else if (stats.weightedAccuracy >= 70) overallDifficulty = 3;
    else if (stats.weightedAccuracy >= 55) overallDifficulty = 2;
    else overallDifficulty = 1;

    // Category-specific difficulties
    const categoryDifficulties: Record<string, number> = {};
    categories.forEach(category => {
      if (category.weightedAccuracy >= 85) categoryDifficulties[category.category] = Math.min(5, overallDifficulty + 1);
      else if (category.weightedAccuracy >= 70) categoryDifficulties[category.category] = overallDifficulty;
      else if (category.weightedAccuracy >= 55) categoryDifficulties[category.category] = Math.max(1, overallDifficulty - 1);
      else categoryDifficulties[category.category] = Math.max(1, overallDifficulty - 2);
    });

    return {
      overall: overallDifficulty,
      categories: categoryDifficulties,
      adaptiveMode: true,
      autoAdjustment: true,
      adjustmentSensitivity: 'medium',
      targetAccuracy: 75,
      challengeMode: false,
      gradualProgression: true
    };
  };

  const calculatePerformanceMetrics = (
    stats: WeightedStatsResult,
    categories: CategoryAnalysis[]
  ): PerformanceMetrics => {
    // Accuracy metric
    const accuracy = Math.min(100, stats.weightedAccuracy);

    // Consistency metric (based on category performance variance)
    const accuracies = categories.map(c => c.weightedAccuracy);
    const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - avgAccuracy, 2), 0) / accuracies.length;
    const consistency = Math.max(0, 100 - Math.sqrt(variance));

    // Confidence metric (based on reliable answers ratio)
    const confidence = (stats.reliableAnswers / Math.max(stats.totalAnswered, 1)) * 100;

    // Speed metric (based on response time efficiency)
    const avgTime = stats.reliableResponseTime;
    const speedScore = Math.max(0, 100 - Math.max(0, (avgTime - 30000) / 1000)); // Optimal around 30 seconds

    // Overall performance
    const overall = (accuracy * 0.4 + consistency * 0.2 + confidence * 0.3 + speedScore * 0.1);

    return {
      accuracy,
      consistency,
      confidence,
      speed: speedScore,
      overall
    };
  };

  const saveProfile = (profile: DifficultyProfile) => {
    setDifficultyProfile(profile);
    localStorage.setItem('difficulty-profile', JSON.stringify(profile));
    if (onApplySettings) {
      onApplySettings(profile);
    }
  };

  const adjustCategoryDifficulty = (category: string, newLevel: number, reason: string) => {
    const oldLevel = difficultyProfile.categories[category] || difficultyProfile.overall;

    // Add to history
    const historyEntry: DifficultyHistory = {
      date: new Date().toISOString().split('T')[0],
      category,
      oldDifficulty: oldLevel,
      newDifficulty: newLevel,
      reason,
      performance: stats?.weightedAccuracy || 0,
      confidence: recommendedAdjustment?.confidence || 0
    };

    const newHistory = [historyEntry, ...difficultyHistory].slice(0, 50); // Keep last 50 entries
    setDifficultyHistory(newHistory);
    localStorage.setItem('difficulty-history', JSON.stringify(newHistory));

    // Update profile
    const updatedProfile = {
      ...difficultyProfile,
      categories: {
        ...difficultyProfile.categories,
        [category]: newLevel
      }
    };
    saveProfile(updatedProfile);
  };

  const applyRecommendedAdjustment = () => {
    if (!recommendedAdjustment) return;

    const updatedProfile = {
      ...difficultyProfile,
      overall: recommendedAdjustment.recommendedLevel
    };

    // Apply to all categories that don't have specific overrides
    categories.forEach(category => {
      if (category.recommendedFocus) {
        // Lower difficulty for struggling categories
        updatedProfile.categories[category.category] = Math.max(1, recommendedAdjustment.recommendedLevel - 1);
      } else if (category.weightedAccuracy >= 85) {
        // Increase difficulty for mastered categories
        updatedProfile.categories[category.category] = Math.min(5, recommendedAdjustment.recommendedLevel + 1);
      }
    });

    saveProfile(updatedProfile);

    // Add history entry
    const historyEntry: DifficultyHistory = {
      date: new Date().toISOString().split('T')[0],
      category: t[currentLang].overall_category,
      oldDifficulty: difficultyProfile.overall,
      newDifficulty: recommendedAdjustment.recommendedLevel,
      reason: recommendedAdjustment.reason,
      performance: stats?.weightedAccuracy || 0,
      confidence: recommendedAdjustment.confidence
    };

    const newHistory = [historyEntry, ...difficultyHistory].slice(0, 50);
    setDifficultyHistory(newHistory);
    localStorage.setItem('difficulty-history', JSON.stringify(newHistory));
  };

  const resetToDefaults = () => {
    if (stats && categories) {
      const defaultProfile = generateInitialProfile(stats, categories);
      saveProfile(defaultProfile);
    }
  };

  const getDifficultyLabel = (level: number): string => {
    switch (level) {
      case 1: return t[currentLang].beginner;
      case 2: return t[currentLang].elementary;
      case 3: return t[currentLang].intermediate;
      case 4: return t[currentLang].advanced;
      case 5: return t[currentLang].expert;
      default: return t[currentLang].unknown;
    }
  };

  const getDifficultyColor = (level: number): string => {
    switch (level) {
      case 1: return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 2: return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 3: return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 4: return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 5: return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getPerformanceColor = (value: number): string => {
    if (value >= 80) return 'text-green-600 dark:text-green-400';
    if (value >= 60) return 'text-blue-600 dark:text-blue-400';
    if (value >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
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
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all shadow-md"
              >
{t[currentLang].backButton}
              </button>
            )}
          </div>

          {/* 推奨調整の表示 */}
          {recommendedAdjustment && recommendedAdjustment.recommendedLevel !== recommendedAdjustment.currentLevel && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎯</span>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      {t[currentLang].recommendedAdjustment}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {t[currentLang].level} {recommendedAdjustment.currentLevel} → {recommendedAdjustment.recommendedLevel}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {recommendedAdjustment.reason}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {(recommendedAdjustment.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">{t[currentLang].confidence}</div>
                  </div>
                  <button
                    onClick={applyRecommendedAdjustment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
{t[currentLang].apply}
                  </button>
                </div>
              </div>
            </div>
          )}

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
              onClick={() => setActiveTab('automatic')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'automatic'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
{t[currentLang].automaticTab}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
{t[currentLang].historyTab}
            </button>
          </div>
        </header>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 現在の難易度設定 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].currentSettings}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].overallDifficulty}
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={difficultyProfile.overall}
                      onChange={(e) => saveProfile({ ...difficultyProfile, overall: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(difficultyProfile.overall)}`}>
                      {t[currentLang].level}{difficultyProfile.overall} - {getDifficultyLabel(difficultyProfile.overall)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].targetAccuracy}
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="50"
                      max="95"
                      value={difficultyProfile.targetAccuracy}
                      onChange={(e) => saveProfile({ ...difficultyProfile, targetAccuracy: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {difficultyProfile.targetAccuracy}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={difficultyProfile.adaptiveMode}
                    onChange={(e) => saveProfile({ ...difficultyProfile, adaptiveMode: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].adaptiveMode}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={difficultyProfile.autoAdjustment}
                    onChange={(e) => saveProfile({ ...difficultyProfile, autoAdjustment: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].autoAdjustment}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={difficultyProfile.challengeMode}
                    onChange={(e) => saveProfile({ ...difficultyProfile, challengeMode: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].challengeMode}</span>
                </label>
              </div>
            </div>

            {/* パフォーマンスメトリクス */}
            {performanceMetrics && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].performanceMetrics}</h3>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.accuracy)}`}>
                      {performanceMetrics.accuracy.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].accuracy}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.consistency)}`}>
                      {performanceMetrics.consistency.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].consistency}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.confidence)}`}>
                      {performanceMetrics.confidence.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].confidence_metric}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.speed)}`}>
                      {performanceMetrics.speed.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].responseSpeed}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.overall)}`}>
                      {performanceMetrics.overall.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].overall}</div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t[currentLang].adjustmentSuggestions}</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {performanceMetrics.accuracy > 85 && (
                      <li>• {t[currentLang].highAccuracySuggestion}</li>
                    )}
                    {performanceMetrics.accuracy < 60 && (
                      <li>• {t[currentLang].lowAccuracySuggestion}</li>
                    )}
                    {performanceMetrics.consistency < 50 && (
                      <li>• {t[currentLang].inconsistencySuggestion}</li>
                    )}
                    {performanceMetrics.confidence < 70 && (
                      <li>• {t[currentLang].lowConfidenceSuggestion}</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 分野別設定タブ */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {categories.map((category) => (
              <div
                key={category.category}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {category.category}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t[currentLang].accuracyLabel}: {category.weightedAccuracy.toFixed(1)}% | {t[currentLang].reliableAnswers}: {category.reliableAnswers}{t[currentLang].problems}
                    </p>
                  </div>
                  {category.recommendedFocus && (
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">
                      {t[currentLang].needsImprovement}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].currentDifficulty}
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={difficultyProfile.categories[category.category] || difficultyProfile.overall}
                        onChange={(e) => {
                          const newLevel = parseInt(e.target.value);
                          adjustCategoryDifficulty(category.category, newLevel, t[currentLang].manualAdjustment);
                        }}
                        className="flex-1"
                      />
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(difficultyProfile.categories[category.category] || difficultyProfile.overall)}`}>
                        {t[currentLang].level}{difficultyProfile.categories[category.category] || difficultyProfile.overall}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].recommendedActions}
                    </label>
                    <div className="space-y-2">
                      {category.weightedAccuracy >= 85 && (
                        <button
                          onClick={() => adjustCategoryDifficulty(
                            category.category,
                            Math.min(5, (difficultyProfile.categories[category.category] || difficultyProfile.overall) + 1),
                            t[currentLang].highAccuracyAdjustment
                          )}
                          className="w-full px-3 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm hover:bg-green-200 dark:hover:bg-green-800 transition"
                        >
                          {t[currentLang].increaseDifficulty}
                        </button>
                      )}
                      {category.weightedAccuracy < 60 && (
                        <button
                          onClick={() => adjustCategoryDifficulty(
                            category.category,
                            Math.max(1, (difficultyProfile.categories[category.category] || difficultyProfile.overall) - 1),
                            t[currentLang].lowAccuracyAdjustment
                          )}
                          className="w-full px-3 py-2 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-sm hover:bg-orange-200 dark:hover:bg-orange-800 transition"
                        >
                          {t[currentLang].decreaseDifficulty}
                        </button>
                      )}
                      {category.improvementTrend < -5 && (
                        <button
                          onClick={() => adjustCategoryDifficulty(
                            category.category,
                            Math.max(1, (difficultyProfile.categories[category.category] || difficultyProfile.overall) - 1),
                            t[currentLang].performanceDeclineAdjustment
                          )}
                          className="w-full px-3 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800 transition"
                        >
                          {t[currentLang].performanceDecline}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 自動調整タブ */}
        {activeTab === 'automatic' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].autoAdjustmentSettings}</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].adjustmentSensitivity}
                  </label>
                  <select
                    value={difficultyProfile.adjustmentSensitivity}
                    onChange={(e) => saveProfile({ ...difficultyProfile, adjustmentSensitivity: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="low">{t[currentLang].lowSensitivity}</option>
                    <option value="medium">{t[currentLang].mediumSensitivity}</option>
                    <option value="high">{t[currentLang].highSensitivity}</option>
                  </select>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {difficultyProfile.adjustmentSensitivity === 'low' && t[currentLang].lowSensitivityDesc}
                    {difficultyProfile.adjustmentSensitivity === 'medium' && t[currentLang].mediumSensitivityDesc}
                    {difficultyProfile.adjustmentSensitivity === 'high' && t[currentLang].highSensitivityDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].adjustmentRules}</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={difficultyProfile.autoAdjustment}
                          onChange={(e) => saveProfile({ ...difficultyProfile, autoAdjustment: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].enableAutoAdjustment}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={difficultyProfile.gradualProgression}
                          onChange={(e) => saveProfile({ ...difficultyProfile, gradualProgression: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].gradualProgression}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={difficultyProfile.challengeMode}
                          onChange={(e) => saveProfile({ ...difficultyProfile, challengeMode: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].challengeMode}</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].adjustmentConditions}</h4>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        {t[currentLang].accuracyIncrease.replace('{target}', String(difficultyProfile.targetAccuracy + 10))}
                      </div>
                      <div>
                        {t[currentLang].accuracyDecrease.replace('{target}', String(difficultyProfile.targetAccuracy - 10))}
                      </div>
                      <div>
                        {t[currentLang].consecutiveCorrect}
                      </div>
                      <div>
                        {t[currentLang].consecutiveIncorrect}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={resetToDefaults}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    {t[currentLang].resetToDefaults}
                  </button>
                  <button
                    onClick={() => saveProfile(difficultyProfile)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {t[currentLang].saveSettings}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 履歴タブ */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].adjustmentHistory}</h3>

              {difficultyHistory.length > 0 ? (
                <div className="space-y-3">
                  {difficultyHistory.slice(0, 20).map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {entry.date}
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {entry.category}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(entry.oldDifficulty)}`}>
                            Lv.{entry.oldDifficulty}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(entry.newDifficulty)}`}>
                            Lv.{entry.newDifficulty}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {entry.reason}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t[currentLang].performanceLabel}: {entry.performance.toFixed(1)}% | {t[currentLang].confidenceLabel}: {(entry.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {t[currentLang].noHistoryTitle}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t[currentLang].noHistoryDesc}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}