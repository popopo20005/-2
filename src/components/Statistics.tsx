import { useState, useEffect, useCallback, memo } from 'react';
import { statisticsService } from '../lib/database';
import type { Problem } from '../types';
import { ThreeDDoughnutChart } from './charts/ThreeDDoughnutChart';
import { ThreeDBarChart } from './charts/ThreeDBarChart';
import { GlowingLineChart } from './charts/GlowingLineChart';
import { XPProgressWidget } from './gamification/XPProgressWidget';
import { SkeletonStatGrid, SkeletonChart, Skeleton } from './ui/Skeleton';
import { GlassCard } from './ui/GlassCard';
import { NeumorphicButton } from './ui/NeumorphicButton';
import { ArrowLeft, Copy, X, Trophy, TrendingUp, PieChart, BarChart2, BookOpen, Layers, Target, Zap, BarChart3, Calendar, LineChart, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { debugLog } from '../utils/debug';
import { PerformanceMonitor } from '../services/performanceOptimizer';
import { StatsComparisonModal } from './StatsComparisonModal';
import { ReportGeneratorModal } from './ReportGeneratorModal';
import { tagsService, type TagStatistics } from '../services/tagsService';

// Performance monitoring instance
const performanceMonitor = new PerformanceMonitor();
import {
  generateStatisticsSummary,
} from '../services/statisticsAggregator';
import type {
  StatisticsSummary,
} from '../types/statistics';

interface StatisticsProps {
  onBack: () => void;
  onStartQuizSetWorstProblems?: (quizSetId: number, useLatestOnly: boolean, problemCount?: number | 'all') => void;
  onOpenQuizSetStats?: (quizSetId: number) => void;
  isDarkMode?: boolean;
  language?: 'ja' | 'en';
}

interface OverallStats {
  totalProblems: number;
  totalCategories: number;
  totalQuizSets: number;
  totalAnswered: number;
  totalCorrect: number;
  overallAccuracy: number;
}

interface QuizSetWorstProblems {
  quizSetId: number;
  quizSetName: string;
  problems: WorstProblem[];
}

interface CategoryWorstProblems {
  category: string;
  problems: WorstProblem[];
}

interface CategoryStats {
  category: string;
  accuracy: number;
  totalCorrect: number;
  totalAnswered: number;
  problemCount: number;
}

interface WorstProblem {
  problem: Problem;
  incorrectCount: number;
  totalAnswered: number;
  accuracy: number;
}

interface RecentActivity {
  date: string;
  totalAnswered: number;
  totalCorrect: number;
}

const t = {
  ja: {
    title: '📊 学習統計',
    backButton: '戻る',
    copyButton: '統計をコピー',
    loading: '統計データを読み込み中...',
    copyTitle: '統計データのコピー',
    copyAll: '全体統計をコピー',
    copyByQuizSet: '問題集別統計をコピー',
    copyByCategory: 'カテゴリー別統計をコピー',
    selectQuizSet: '特定の問題集を選択してコピー',
    selectPlaceholder: '問題集を選択してください',
    accuracyFilter: '正答率フィルター（以下の問題のみ表示）',
    accuracyAll: 'すべての問題',
    accuracyBelow80: '80%以下',
    accuracyBelow70: '70%以下',
    accuracyBelow60: '60%以下',
    accuracyBelow50: '50%以下',
    accuracyBelow40: '40%以下',
    accuracyBelow30: '30%以下',
    accuracyBelow20: '20%以下',
    accuracyBelow10: '10%以下',
    preview: 'プレビュー',
    problemsFound: '問が該当',
    detailsCopy: '詳細統計をコピー',
    close: '閉じる',
    overallStats: '🎯 全体統計',
    totalProblems: '総問題数',
    totalCategories: 'カテゴリ数',
    totalQuizSets: '問題集数',
    totalAnswers: '回答数',
    totalCorrect: '正解数',
    overallAccuracy: '総正答率',
    accuracyDistribution: '正解率の分布',
    categoryPerformance: '📚 カテゴリ別成績',
    problemCount: '問題数',
    answerCount: '回答数',
    correctCount: '正解',
    worstProblems: '🔥 苦手問題トップ10',
    worstProblemsDesc: '正答率の低い問題（2回以上回答）',
    timesWrong: '回中',
    timesWrongSuffix: '回間違い',
    insufficientData: 'データが不十分です（2回以上回答された問題が必要）',
    quizSetStats: '📖 問題集別成績',
    quizSetStatsDesc: '各問題集で苦手問題のみを厳選してプレイできます',
    accuracy: '正答率',
    answersCount: '回答数',
    correctAnswers: '正解数',
    lastPlayed: '最終プレイ',
    weakProblemsLatest: '🔥 苦手問題で復習（最新版）',
    weakProblemsAll: '📚 苦手問題で復習（全履歴）',
    detailedStats: '📊 詳細統計を見る',
    problemCountOptions: {
      1: '1問',
      3: '3問',
      5: '5問',
      10: '10問',
      15: '15問',
      20: '20問',
      25: '25問',
      30: '30問',
      50: '50問',
      all: '全問'
    },
    estimatedTime: '推定時間',
    accuracyRanking: '問題集別正答率ランキング',
    worstByQuizSet: '📚 問題集別 間違いが多い問題',
    category: 'カテゴリー',
    wrongCount: '間違い',
    times: '回',
    others: '他',
    problemsViewAll: '問（コピーで全て確認できます）',
    worstByCategory: '🏷️ カテゴリー別 間違いが多い問題',
    detailedStatsTitle: '🎯 詳細統計',
    overallPerformance: '全体成績',
    answersTotal: '解答回数',
    correctTotal: '正解数',
    accuracyTotal: '正解率',
    lastPlayedDate: '最終プレイ',
    unplayed: '未プレイ',
    mostWrongProblems: '間違いが多い問題',
    topProblems: 'TOP',
    noStatsData: '統計データがありません。問題を解いてからご確認ください。',
    recentActivity: '📈 最近7日間の活動',
    learningTrend: '学習トレンド',
    noAnswersYet: 'まだクイズに回答していません',
    copySuccess: 'をクリップボードにコピーしました',
    copyFailed: 'コピーに失敗しました。手動でコピーしてください。',
    noQuizSetData: '問題集別統計データがありません',
    noCategoryData: 'カテゴリー別統計データがありません',
    copy: 'コピー',
    badges: '🏆 獲得バッジ',
    badgesDesc: '学習の進捗に応じて獲得したバッジ',
    locked: '未獲得',
    // 新しいタブ
    weeklyTab: '週次',
    monthlyTab: '月次',
    trendsTab: 'トレンド',
    predictionTab: '予測',
    // 週次統計
    thisWeek: '今週の統計',
    weekOf: '週',
    studyDays: '学習日数',
    totalStudyTime: '総学習時間',
    minutes: '分',
    topCategories: 'よく学習したカテゴリー',
    // 月次統計
    thisMonth: '今月の統計',
    bestWeek: '最高の週',
    categoryBreakdown: 'カテゴリー別内訳',
    // トレンド
    accuracyTrend: '正解率のトレンド',
    activityTrend: '学習量のトレンド',
    last30Days: '過去30日',
    improving: '上昇中',
    stable: '安定',
    declining: '低下中',
    changeRate: '変化率',
    movingAverage: '移動平均',
    // 予測
    performancePrediction: 'パフォーマンス予測',
    daysAhead: '日後',
    predictedAccuracy: '予測正解率',
    predictedActivity: '予測学習量',
    problemsPerDay: '問/日',
    confidence: '信頼度',
    recommendation: '推奨アクション',
    // 統計内訳
    dailyBreakdown: '日別内訳',
    weeklyBreakdown: '週別内訳'
  },
  en: {
    title: '📊 Learning Statistics',
    backButton: 'Back',
    copyButton: 'Copy Data',
    loading: 'Loading statistics data...',
    copyTitle: 'Copy Statistics Data',
    copyAll: 'Copy Overall Statistics',
    copyByQuizSet: 'Copy Quiz Set Statistics',
    copyByCategory: 'Copy Category Statistics',
    selectQuizSet: 'Select Specific Quiz Set to Copy',
    selectPlaceholder: 'Please select a quiz set',
    accuracyFilter: 'Accuracy Filter (show problems below threshold)',
    accuracyAll: 'All problems',
    accuracyBelow80: '80% or below',
    accuracyBelow70: '70% or below',
    accuracyBelow60: '60% or below',
    accuracyBelow50: '50% or below',
    accuracyBelow40: '40% or below',
    accuracyBelow30: '30% or below',
    accuracyBelow20: '20% or below',
    accuracyBelow10: '10% or below',
    preview: 'Preview',
    problemsFound: ' problems found',
    detailsCopy: 'Copy Detailed Statistics',
    close: 'Close',
    overallStats: '🎯 Overall Statistics',
    totalProblems: 'Total Problems',
    totalCategories: 'Categories',
    totalQuizSets: 'Quiz Sets',
    totalAnswers: 'Answers',
    totalCorrect: 'Correct',
    overallAccuracy: 'Overall Accuracy',
    accuracyDistribution: 'Accuracy Distribution',
    categoryPerformance: '📚 Category Performance',
    problemCount: 'Problems',
    answerCount: 'Answers',
    correctCount: 'Correct',
    worstProblems: '🔥 Top 10 Worst Problems',
    worstProblemsDesc: 'Low accuracy problems (answered 2+ times)',
    timesWrong: ' out of ',
    timesWrongSuffix: ' wrong',
    insufficientData: 'Insufficient data (problems answered 2+ times required)',
    quizSetStats: '📖 Quiz Set Performance',
    quizSetStatsDesc: 'You can play specifically with weak problems from each quiz set',
    accuracy: 'Accuracy',
    answersCount: 'Answers',
    correctAnswers: 'Correct',
    lastPlayed: 'Last Played',
    weakProblemsLatest: '🔥 Review Weak Problems (Latest)',
    weakProblemsAll: '📚 Review Weak Problems (All History)',
    detailedStats: '📊 View Detailed Stats',
    problemCountOptions: {
      1: '1 problem',
      3: '3 problems',
      5: '5 problems',
      10: '10 problems',
      15: '15 problems',
      20: '20 problems',
      25: '25 problems',
      30: '30 problems',
      50: '50 problems',
      all: 'All'
    },
    estimatedTime: 'Estimated Time',
    accuracyRanking: 'Quiz Set Accuracy Ranking',
    worstByQuizSet: '📚 Most Wrong Problems by Quiz Set',
    category: 'Category',
    wrongCount: 'Wrong',
    times: ' times',
    others: 'Other',
    problemsViewAll: ' problems (copy to view all)',
    worstByCategory: '🏷️ Most Wrong Problems by Category',
    detailedStatsTitle: '🎯 Detailed Statistics',
    overallPerformance: 'Overall Performance',
    answersTotal: 'Total Answers',
    correctTotal: 'Correct Answers',
    accuracyTotal: 'Accuracy',
    lastPlayedDate: 'Last Played',
    unplayed: 'Not Played',
    mostWrongProblems: 'Most Wrong Problems',
    topProblems: 'TOP',
    noStatsData: 'No statistics data available. Please solve problems first.',
    recentActivity: '📈 Recent 7-Day Activity',
    learningTrend: 'Learning Trend',
    noAnswersYet: 'No quiz answers yet',
    copySuccess: ' copied to clipboard',
    copyFailed: 'Copy failed. Please copy manually.',
    noQuizSetData: 'No quiz set statistics data available',
    noCategoryData: 'No category statistics data available',
    copy: 'Copy',
    badges: '🏆 Earned Badges',
    badgesDesc: 'Badges earned based on your learning progress',
    locked: 'Locked',
    // New tabs
    weeklyTab: 'Weekly',
    monthlyTab: 'Monthly',
    trendsTab: 'Trends',
    predictionTab: 'Prediction',
    // Weekly stats
    thisWeek: 'This Week',
    weekOf: 'Week of',
    studyDays: 'Study Days',
    totalStudyTime: 'Total Study Time',
    minutes: 'min',
    topCategories: 'Top Categories',
    // Monthly stats
    thisMonth: 'This Month',
    bestWeek: 'Best Week',
    categoryBreakdown: 'Category Breakdown',
    // Trends
    accuracyTrend: 'Accuracy Trend',
    activityTrend: 'Activity Trend',
    last30Days: 'Last 30 Days',
    improving: 'Improving',
    stable: 'Stable',
    declining: 'Declining',
    changeRate: 'Change Rate',
    movingAverage: 'Moving Average',
    // Prediction
    performancePrediction: 'Performance Prediction',
    daysAhead: 'days ahead',
    predictedAccuracy: 'Predicted Accuracy',
    predictedActivity: 'Predicted Activity',
    problemsPerDay: 'problems/day',
    confidence: 'Confidence',
    recommendation: 'Recommendation',
    // Statistics Breakdown
    dailyBreakdown: 'Daily Breakdown',
    weeklyBreakdown: 'Weekly Breakdown',
  },
};

const Statistics = ({ onBack, onStartQuizSetWorstProblems, onOpenQuizSetStats: _onOpenQuizSetStats, isDarkMode: _isDarkMode = false, language = 'ja' }: StatisticsProps) => {
  const currentLang = language;
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalProblems: 0,
    totalCategories: 0,
    totalQuizSets: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    overallAccuracy: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [quizSetWorstProblems, setQuizSetWorstProblems] = useState<QuizSetWorstProblems[]>([]);
  const [categoryWorstProblems, setCategoryWorstProblems] = useState<CategoryWorstProblems[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [worstProblems, setWorstProblems] = useState<WorstProblem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  // badges state removed - now using gamification service
  const [showCopyOptions, setShowCopyOptions] = useState(false);
  const [selectedQuizSetForCopy, setSelectedQuizSetForCopy] = useState<number | null>(null);
  const [selectedCategoryForCopy, setSelectedCategoryForCopy] = useState<string | null>(null);
  const [selectedProblemCounts, setSelectedProblemCounts] = useState<Record<number, number | 'all'>>({});
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // 新しい統計データの状態管理
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'monthly' | 'trends' | 'prediction'>('overview');
  const [statisticsSummary, setStatisticsSummary] = useState<StatisticsSummary | null>(null);
  const [tagStats, setTagStats] = useState<TagStatistics[]>([]);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  const formatAccuracy = (accuracy: number): string => {
    return `${accuracy.toFixed(1)}%`;
  };

  const toggleTagExpansion = (tag: string) => {
    setExpandedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  // 推定時間を計算する関数（useCallbackで最適化）
  const calculateEstimatedTime = useCallback((problems: Problem[], problemCount: number | 'all'): string => {
    // localStorageから時間設定を取得
    const tfTimePerQuestion = parseInt(localStorage.getItem('tfTimePerQuestion') || '10');
    const mcTimePerQuestion = parseInt(localStorage.getItem('mcTimePerQuestion') || '120');

    // 実際の問題数を決定
    const actualCount = problemCount === 'all' ? problems.length : Math.min(problemCount, problems.length);

    // 問題タイプ別にカウント
    let tfCount = 0;
    let mcCount = 0;

    problems.slice(0, actualCount).forEach(problem => {
      if (problem.type === 'multiple-choice') {
        mcCount++;
      } else {
        // デフォルトはtrue-false
        tfCount++;
      }
    });

    // 推定時間を秒単位で計算
    const totalSeconds = tfCount * tfTimePerQuestion + mcCount * mcTimePerQuestion;

    // 分と秒に変換
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // フォーマット
    if (minutes === 0) {
      return `${seconds}秒`;
    } else if (seconds === 0) {
      return `${minutes}分`;
    } else {
      return `${minutes}分${seconds}秒`;
    }
  }, []); // 依存配列は空（localStorageから毎回取得するため）

  // 統計データをテキストフォーマットに変換
  const formatStatisticsForCopy = (): string => {
    const sections: string[] = [];

      // 全体統計
      if (overallStats) {
        sections.push(`# 全体統計
総問題数: ${overallStats.totalProblems}問
総カテゴリー数: ${overallStats.totalCategories}個
総問題集数: ${overallStats.totalQuizSets}個
総解答数: ${overallStats.totalAnswered}回
総正解数: ${overallStats.totalCorrect}回
全体正解率: ${formatAccuracy(overallStats.overallAccuracy)}`);
      }

      // 問題集別間違いが多い問題
      if (quizSetWorstProblems.length > 0) {
        sections.push('\n# 問題集別 間違いが多い問題');
        quizSetWorstProblems.forEach(quizSetData => {
          sections.push(`\n## ${quizSetData.quizSetName}`);
          quizSetData.problems.forEach((problemStat, index) => {
            sections.push(`${index + 1}. ${problemStat.problem.question}
   カテゴリー: ${problemStat.problem.category}
   間違い回数: ${problemStat.incorrectCount}回
   解答回数: ${problemStat.totalAnswered}回
   正解率: ${formatAccuracy(problemStat.accuracy)}
   解説: ${problemStat.problem.explanation}\n`);
          });
        });
      }

      // カテゴリー別間違いが多い問題
      if (categoryWorstProblems.length > 0) {
        sections.push('\n# カテゴリー別 間違いが多い問題');
        categoryWorstProblems.forEach(categoryData => {
          sections.push(`\n## ${categoryData.category}`);
          categoryData.problems.forEach((problemStat, index) => {
            sections.push(`${index + 1}. ${problemStat.problem.question}
   間違い回数: ${problemStat.incorrectCount}回
   解答回数: ${problemStat.totalAnswered}回
   正解率: ${formatAccuracy(problemStat.accuracy)}
   解説: ${problemStat.problem.explanation}\n`);
          });
        });
      }

      // カテゴリー別統計
      if (categoryStats.length > 0) {
        sections.push('\n# カテゴリー別統計');
        categoryStats.forEach(category => {
          sections.push(`- ${category.category}: 正解率${formatAccuracy(category.accuracy)} (${category.totalCorrect}/${category.totalAnswered}回答, ${category.problemCount}問)`);
        });
      }

      // 全体の間違いが多い問題
      if (worstProblems.length > 0) {
        sections.push('\n# 全体 間違いが多い問題 TOP10');
        worstProblems.forEach((problemStat, index) => {
          sections.push(`${index + 1}. ${problemStat.problem.question}
   カテゴリー: ${problemStat.problem.category}
   間違い回数: ${problemStat.incorrectCount}回
   解答回数: ${problemStat.totalAnswered}回
   正解率: ${formatAccuracy(problemStat.accuracy)}
   解説: ${problemStat.problem.explanation}\n`);
        });
      }

      return sections.join('\n\n');
    };

    // 問題集別統計のフォーマット
    const formatQuizSetStatistics = (quizSetData: QuizSetWorstProblems): string => {
      const sections: string[] = [];

      sections.push(`# ${quizSetData.quizSetName} - 間違いが多い問題\n`);

      quizSetData.problems.forEach((problemStat, index) => {
        sections.push(`## 問題${index + 1}
問題: ${problemStat.problem.question}
カテゴリー: ${problemStat.problem.category}
間違い回数: ${problemStat.incorrectCount}回
解答回数: ${problemStat.totalAnswered}回
正解率: ${formatAccuracy(problemStat.accuracy)}
解説: ${problemStat.problem.explanation}`);
      });

      return sections.join('\n\n');
    };

    // カテゴリー別統計のフォーマット
    const formatCategoryStatistics = (categoryData: CategoryWorstProblems): string => {
      const sections: string[] = [];

      sections.push(`# ${categoryData.category} - 間違いが多い問題\n`);

      categoryData.problems.forEach((problemStat, index) => {
        sections.push(`## 問題${index + 1}
問題: ${problemStat.problem.question}
間違い回数: ${problemStat.incorrectCount}回
解答回数: ${problemStat.totalAnswered}回
正解率: ${formatAccuracy(problemStat.accuracy)}
解説: ${problemStat.problem.explanation}`);
      });

      return sections.join('\n\n');
    };

    // クリップボードにコピー
    const copyToClipboard = async (text: string, description: string) => {
      try {
        await navigator.clipboard.writeText(text);
        alert(`${description}${t[currentLang].copySuccess}`);
      } catch (error) {
        debugLog('コピーに失敗:', error);
        alert(t[currentLang].copyFailed);
      }
    };

    const loadQuizSetWorstProblems = async () => {
      try {
        const allQuizSets = await statisticsService.getQuizSetStats();
        const quizSetWorstData: QuizSetWorstProblems[] = [];

        for (const quizSetStat of allQuizSets) {
          const worstProblems = await statisticsService.getWorstProblemsByQuizSet(quizSetStat.quizSet.id!, 5);
          if (worstProblems.length > 0) {
            quizSetWorstData.push({
              quizSetId: quizSetStat.quizSet.id!,
              quizSetName: quizSetStat.quizSet.name,
              problems: worstProblems
            });
          }
        }

        setQuizSetWorstProblems(quizSetWorstData);
      } catch (error) {
        debugLog('問題集別統計データの読み込みエラー:', error);
      }
    };

    const loadCategoryWorstProblems = async () => {
      try {
        const allCategories = await statisticsService.getCategoryStats();
        const categoryWorstData: CategoryWorstProblems[] = [];

        for (const categoryStat of allCategories) {
          const worstProblems = await statisticsService.getWorstProblemsByCategory(categoryStat.category, 5);
          if (worstProblems.length > 0) {
            categoryWorstData.push({
              category: categoryStat.category,
              problems: worstProblems
            });
          }
        }

        setCategoryWorstProblems(categoryWorstData);
      } catch (error) {
        debugLog('カテゴリー別統計データの読み込みエラー:', error);
      }
    };

    useEffect(() => {
  const loadStatistics = async () => {
    try {
      const [overall, categories, worst, recent] = await performanceMonitor.measure('Statistics: Load Core Stats', () =>
        Promise.all([
          statisticsService.getOverallStats(),
          statisticsService.getCategoryStats(),
          statisticsService.getWorstProblems(),
          statisticsService.getRecentActivity()
        ])
      );

      setOverallStats(overall);
      setCategoryStats(categories);
      setWorstProblems(worst);
      setRecentActivity(recent);

      // Debug: Log statistics data
      debugLog('📊 Statistics loaded:', {
        totalAnswered: overall.totalAnswered,
        totalCorrect: overall.totalCorrect,
        overallAccuracy: overall.overallAccuracy,
        recentActivityLength: recent.length
      });

      await performanceMonitor.measure('Statistics: Load Quiz Set Worst Problems', () => loadQuizSetWorstProblems());
      await performanceMonitor.measure('Statistics: Load Category Worst Problems', () => loadCategoryWorstProblems());

      // タグ別統計の読み込み
      const tagStatistics = await performanceMonitor.measure('Statistics: Load Tag Stats', () => tagsService.getTagStatistics());
      setTagStats(tagStatistics);
      debugLog('🏷️ Tag statistics loaded:', tagStatistics);

      // 統計サマリーの読み込み
      loadAdvancedStatistics();

      // Log performance summary
      const summaryStats = performanceMonitor.getAllStats();
      debugLog('📊 Statistics Performance Summary:', summaryStats);

    } catch (error) {
      debugLog('統計データの読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 統計サマリーの読み込み（週次・月次・トレンド・予測）
  const loadAdvancedStatistics = async () => {
    try {
      debugLog('📊 統計サマリーを読み込み中...');

      const summary = await performanceMonitor.measure('Statistics: Generate Summary', () =>
        generateStatisticsSummary()
      );
      setStatisticsSummary(summary);

      debugLog('✅ 統計サマリー読み込み完了:', {
        allTime: summary.allTime,
        thisWeek: summary.thisWeek,
        thisMonth: summary.thisMonth,
      });
    } catch (error) {
      debugLog('❌ 統計サマリーの読み込みエラー:', error);
    }
  };

  loadStatistics();
}, []);

if (isLoading) {
  return (
    <div className="min-h-screen p-4 md:p-8 pb-24">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <Skeleton width="w-48" height="h-10" />
            <Skeleton width="w-48" height="h-10" />
          </div>
          <Skeleton width="w-64" height="h-9" />
        </header>
        <div className="mb-8">
          <SkeletonStatGrid count={4} columns={4} />
        </div>
        <div className="space-y-8">
          <SkeletonChart height="h-64" />
          <SkeletonChart height="h-80" />
          <SkeletonChart height="h-64" />
        </div>
      </div>
    </div>
  );
}

return (
  <div className="min-h-screen p-4 md:p-8 pb-24">
    <div id="statistics-container" className="max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <NeumorphicButton
            onClick={onBack}
            variant="secondary"
            className="px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t[currentLang].backButton}
            </div>
          </NeumorphicButton>
          <div className="flex items-center gap-3">
            {/* レポート生成ボタン */}
            <NeumorphicButton
              onClick={() => setShowReportModal(true)}
              variant="success"
              className="px-4 py-2"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {currentLang === 'ja' ? 'レポート生成' : 'Generate Report'}
              </div>
            </NeumorphicButton>
            <NeumorphicButton
              onClick={() => setShowComparisonModal(true)}
              variant="primary"
              className="px-4 py-2"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {currentLang === 'ja' ? '比較' : 'Compare'}
              </div>
            </NeumorphicButton>
            <NeumorphicButton
              onClick={() => setShowCopyOptions(!showCopyOptions)}
              variant="primary"
              className="px-4 py-2"
            >
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                {t[currentLang].copyButton}
              </div>
            </NeumorphicButton>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white">{t[currentLang].title}</h1>

        {/* タブナビゲーション */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              {currentLang === 'ja' ? '概要' : 'Overview'}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'weekly'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t[currentLang].weeklyTab}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'monthly'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              {t[currentLang].monthlyTab}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'trends'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              {t[currentLang].trendsTab}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('prediction')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'prediction'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t[currentLang].predictionTab}
            </div>
          </button>
        </div>

        {/* コピーオプション */}
        {showCopyOptions && (
          <GlassCard className="mt-4 p-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">{t[currentLang].copyTitle}</h3>
              <button onClick={() => setShowCopyOptions(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 全体統計コピー */}
            <div className="space-y-4">
              <NeumorphicButton
                onClick={() => copyToClipboard(formatStatisticsForCopy(), t[currentLang].copyAll)}
                variant="secondary"
                className="w-full"
              >
                {t[currentLang].copyAll}
              </NeumorphicButton>

              {/* 問題集別統計コピー */}
              <div className="space-y-2">
                <label className="text-sm text-white/90 font-medium">{t[currentLang].selectQuizSet}</label>
                <select
                  value={selectedQuizSetForCopy ?? ''}
                  onChange={(e) => setSelectedQuizSetForCopy(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t[currentLang].selectPlaceholder}</option>
                  {quizSetWorstProblems.map((qs) => (
                    <option key={qs.quizSetId} value={qs.quizSetId}>
                      {qs.quizSetName}
                    </option>
                  ))}
                </select>
                <NeumorphicButton
                  onClick={() => {
                    if (selectedQuizSetForCopy !== null) {
                      const selectedQuizSet = quizSetWorstProblems.find(qs => qs.quizSetId === selectedQuizSetForCopy);
                      if (selectedQuizSet) {
                        copyToClipboard(formatQuizSetStatistics(selectedQuizSet), t[currentLang].copyByQuizSet);
                      }
                    } else if (quizSetWorstProblems.length > 0) {
                      const combinedText = quizSetWorstProblems.map(formatQuizSetStatistics).join('\n\n---\n\n');
                      copyToClipboard(combinedText, t[currentLang].copyByQuizSet);
                    } else {
                      alert(t[currentLang].noQuizSetData);
                    }
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  {t[currentLang].copyByQuizSet}
                </NeumorphicButton>
              </div>

              {/* カテゴリー別統計コピー */}
              <div className="space-y-2">
                <label className="text-sm text-white/90 font-medium">{language === 'ja' ? 'カテゴリーを選択' : 'Select Category'}</label>
                <select
                  value={selectedCategoryForCopy ?? ''}
                  onChange={(e) => setSelectedCategoryForCopy(e.target.value || null)}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{language === 'ja' ? 'カテゴリーを選択してください' : 'Please select a category'}</option>
                  {categoryWorstProblems.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
                <NeumorphicButton
                  onClick={() => {
                    if (selectedCategoryForCopy !== null) {
                      const selectedCategory = categoryWorstProblems.find(c => c.category === selectedCategoryForCopy);
                      if (selectedCategory) {
                        copyToClipboard(formatCategoryStatistics(selectedCategory), t[currentLang].copyByCategory);
                      }
                    } else if (categoryWorstProblems.length > 0) {
                      const combinedText = categoryWorstProblems.map(formatCategoryStatistics).join('\n\n---\n\n');
                      copyToClipboard(combinedText, t[currentLang].copyByCategory);
                    } else {
                      alert(t[currentLang].noCategoryData);
                    }
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  {t[currentLang].copyByCategory}
                </NeumorphicButton>
              </div>
            </div>
          </GlassCard>
        )}
      </header>

      {/* 概要タブのコンテンツ */}
      {activeTab === 'overview' && (
        <>
      {/* ゲーミフィケーション: XP/レベル/ストリーク */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          {t[currentLang].badges}
        </h2>
        <XPProgressWidget
          language={currentLang}
        />
      </section>

      {/* 全体統計 */}
      {overallStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* 左側: サマリーカード */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {[
              { label: t[currentLang].totalProblems, value: overallStats.totalProblems, color: 'text-blue-600 dark:text-blue-400', icon: <BookOpen className="w-5 h-5" /> },
              { label: t[currentLang].totalCategories, value: overallStats.totalCategories, color: 'text-green-600 dark:text-green-400', icon: <Layers className="w-5 h-5" /> },
              { label: t[currentLang].totalQuizSets, value: overallStats.totalQuizSets, color: 'text-purple-600 dark:text-purple-400', icon: <Target className="w-5 h-5" /> },
              { label: t[currentLang].totalAnswers, value: overallStats.totalAnswered, color: 'text-orange-600 dark:text-orange-400', icon: <TrendingUp className="w-5 h-5" /> },
            ].map((stat, index) => (
              <GlassCard key={index} className="p-4 flex flex-col items-center justify-center text-center">
                <div className={`mb-2 p-2 rounded-full bg-white/10 ${stat.color}`}>
                  {stat.icon}
                </div>
                <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-xs text-white font-medium">{stat.label}</div>
              </GlassCard>
            ))}
          </div>

          {/* 右側: 3Dドーナツチャート */}
          <GlassCard className="flex flex-col items-center justify-center p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              {t[currentLang].accuracyDistribution}
            </h3>
            <ThreeDDoughnutChart
              data={[
                { label: 'Correct', value: overallStats.totalCorrect, color: '#10b981' }, // emerald-500
                { label: 'Incorrect', value: overallStats.totalAnswered - overallStats.totalCorrect, color: '#ef4444' } // red-500
              ]}
              size={220}
              thickness={25}
              centerLabel={`${overallStats.overallAccuracy.toFixed(1)}%`}
              centerSubLabel={t[currentLang].overallAccuracy}
            />
          </GlassCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* カテゴリ別統計 (3D Bar Chart) */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-500" />
            {t[currentLang].categoryPerformance}
          </h2>
          <div className="h-64 flex items-end justify-center">
            <ThreeDBarChart
              data={categoryStats.map(c => ({ label: c.category, value: c.accuracy }))}
              height={200}
              color="blue"
            />
          </div>
        </GlassCard>

        {/* 学習トレンド (Glowing Line Chart) */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-500" />
            {t[currentLang].learningTrend}
          </h2>
          <div className="h-64">
            {recentActivity.length > 0 ? (
              <GlowingLineChart
                data={recentActivity.map(a => a.totalAnswered)}
                labels={recentActivity.map(a => {
                  const date = new Date(a.date);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                })}
                color="#8b5cf6" // purple-500
                height={200}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-white/60">
                {t[currentLang].noAnswersYet}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* 苦手問題リスト */}
      {worstProblems.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">🔥</span> {t[currentLang].worstProblems}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {worstProblems.map((problemStat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-4 h-full border-l-4 border-l-red-500">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                      {t[currentLang].accuracy}: {formatAccuracy(problemStat.accuracy)}
                    </span>
                    <span className="text-xs text-white/80">
                      {problemStat.incorrectCount}/{problemStat.totalAnswered} {t[currentLang].wrongCount}
                    </span>
                  </div>
                  <p className="font-medium text-white mb-2 line-clamp-2">
                    {problemStat.problem.question}
                  </p>
                  <div className="text-xs text-white/70">
                    {problemStat.problem.category}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <NeumorphicButton
              onClick={() => onStartQuizSetWorstProblems?.(0, false)}
              variant="primary"
              className="px-8 py-3 font-bold"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                {t[currentLang].weakProblemsAll}
              </div>
            </NeumorphicButton>
          </div>
        </section>
      )}

      {/* 問題集別 苦手問題 (Play Mode) */}
      {quizSetWorstProblems.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">📖</span> {t[currentLang].quizSetStats}
          </h2>
          <p className="text-white/70 mb-4">{t[currentLang].quizSetStatsDesc}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizSetWorstProblems.map((quizSetData) => (
              <GlassCard key={quizSetData.quizSetId} className="p-6 flex flex-col">
                <h3 className="font-bold text-lg text-white mb-2">{quizSetData.quizSetName}</h3>
                <div className="flex items-center gap-2 mb-4 text-sm text-white/70">
                  <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded text-xs font-bold">
                    {quizSetData.problems.length} {t[currentLang].problemsFound}
                  </span>
                </div>

                {/* 問題数選択 */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-white/70 mb-2">
                    {t[currentLang].problemCount}
                  </label>
                  <select
                    value={selectedProblemCounts[quizSetData.quizSetId] || 20}
                    onChange={(e) => {
                      const value = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                      setSelectedProblemCounts(prev => ({
                        ...prev,
                        [quizSetData.quizSetId]: value
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value={1}>{t[currentLang].problemCountOptions[1]}</option>
                    <option value={3}>{t[currentLang].problemCountOptions[3]}</option>
                    <option value={5}>{t[currentLang].problemCountOptions[5]}</option>
                    <option value={10}>{t[currentLang].problemCountOptions[10]}</option>
                    <option value={15}>{t[currentLang].problemCountOptions[15]}</option>
                    <option value={20}>{t[currentLang].problemCountOptions[20]}</option>
                    <option value={25}>{t[currentLang].problemCountOptions[25]}</option>
                    <option value={30}>{t[currentLang].problemCountOptions[30]}</option>
                    <option value={50}>{t[currentLang].problemCountOptions[50]}</option>
                    <option value="all">{t[currentLang].problemCountOptions.all}</option>
                  </select>
                </div>

                {/* 推定時間表示 */}
                <div className="mb-3 px-3 py-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                      ⏱️ {t[currentLang].estimatedTime}
                    </span>
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                      {calculateEstimatedTime(
                        quizSetData.problems.map(p => p.problem),
                        selectedProblemCounts[quizSetData.quizSetId] || 20
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-auto space-y-2">
                  <NeumorphicButton
                    onClick={() => {
                      const count = selectedProblemCounts[quizSetData.quizSetId] || 20;
                      onStartQuizSetWorstProblems?.(quizSetData.quizSetId, true, count);
                    }}
                    variant="primary"
                    className="w-full py-2 text-sm"
                  >
                    {t[currentLang].weakProblemsLatest}
                  </NeumorphicButton>
                  <NeumorphicButton
                    onClick={() => {
                      const count = selectedProblemCounts[quizSetData.quizSetId] || 20;
                      onStartQuizSetWorstProblems?.(quizSetData.quizSetId, false, count);
                    }}
                    variant="secondary"
                    className="w-full py-2 text-sm"
                  >
                    {t[currentLang].weakProblemsAll}
                  </NeumorphicButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* タグ別統計 */}
      {tagStats.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">🏷️</span> {currentLang === 'ja' ? 'タグ別統計' : 'Statistics by Tag'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tagStats.map((tagStat, index) => {
              const isExpanded = expandedTags.has(tagStat.tag);
              return (
                <motion.div
                  key={tagStat.tag}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className={`p-4 border-l-4 ${
                    tagStat.accuracy >= 80
                      ? 'border-l-green-500'
                      : tagStat.accuracy >= 60
                      ? 'border-l-yellow-500'
                      : 'border-l-red-500'
                  }`}>
                    {/* ヘッダー部分 */}
                    <div
                      className="cursor-pointer"
                      onClick={() => toggleTagExpansion(tagStat.tag)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-white">{tagStat.tag}</h3>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-white/60" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-white/60" />
                          )}
                        </div>
                        <span className={`text-xl font-bold ${
                          tagStat.accuracy >= 80
                            ? 'text-green-400'
                            : tagStat.accuracy >= 60
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}>
                          {tagStat.accuracy}%
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-white/80">
                          <span>{currentLang === 'ja' ? '問題数' : 'Problems'}:</span>
                          <span className="font-medium">{tagStat.problemCount}</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                          <span>{currentLang === 'ja' ? '解答数' : 'Attempts'}:</span>
                          <span className="font-medium">{tagStat.totalAttempts}</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                          <span>{currentLang === 'ja' ? '正解数' : 'Correct'}:</span>
                          <span className="font-medium text-green-400">{tagStat.correctAttempts}</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              tagStat.accuracy >= 80
                                ? 'bg-green-500'
                                : tagStat.accuracy >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${tagStat.accuracy}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 問題リスト（展開時） */}
                    {isExpanded && tagStat.problems.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 pt-4 border-t border-white/20"
                      >
                        <h4 className="text-sm font-semibold text-white/90 mb-3">
                          {currentLang === 'ja' ? '問題別統計' : 'Problem Statistics'}
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {tagStat.problems.map((problemStat, pIndex) => (
                            <div
                              key={problemStat.problem.id || pIndex}
                              className="bg-white/5 rounded-lg p-3 text-sm"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-white/90 font-medium line-clamp-2 flex-1">
                                  {problemStat.problem.question}
                                </p>
                                <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded ${
                                  problemStat.accuracy >= 80
                                    ? 'bg-green-500/20 text-green-400'
                                    : problemStat.accuracy >= 60
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {problemStat.accuracy}%
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-white/70">
                                <span>{currentLang === 'ja' ? 'カテゴリー' : 'Category'}: {problemStat.problem.category}</span>
                                <span>•</span>
                                <span>
                                  {currentLang === 'ja' ? '試行' : 'Attempts'}: {problemStat.attempts}
                                </span>
                                <span>•</span>
                                <span className="text-green-400">
                                  {currentLang === 'ja' ? '正解' : 'Correct'}: {problemStat.correct}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* 問題がない場合のメッセージ */}
                    {isExpanded && tagStat.problems.length === 0 && (
                      <div className="mt-4 pt-4 border-t border-white/20 text-sm text-white/60 text-center">
                        {currentLang === 'ja' ? 'このタグの問題はまだ解答されていません' : 'No problems answered for this tag yet'}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
        </>
      )}

      {/* 週次タブのコンテンツ */}
      {activeTab === 'weekly' && statisticsSummary?.thisWeek && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-500" />
              {t[currentLang].thisWeek}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-1">{t[currentLang].totalProblems}</div>
                <div className="text-2xl font-bold text-blue-400">{statisticsSummary.thisWeek.totalProblems}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-1">{t[currentLang].overallAccuracy}</div>
                <div className="text-2xl font-bold text-green-400">
                  {(statisticsSummary.thisWeek.averageAccuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-1">{t[currentLang].studyDays}</div>
                <div className="text-2xl font-bold text-purple-400">{statisticsSummary.thisWeek.studyDays}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-1">{t[currentLang].totalStudyTime}</div>
                <div className="text-2xl font-bold text-orange-400">
                  {Math.round(statisticsSummary.thisWeek.totalStudyTime / 60)} {t[currentLang].minutes}
                </div>
              </div>
            </div>

            {/* 日別統計 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t[currentLang].dailyBreakdown}</h3>
              <div className="space-y-2">
                {statisticsSummary.thisWeek.dailyStats.map((day, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-white/70 text-sm font-medium">
                        {new Date(day.date).toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </div>
                      <div className="text-white text-sm">
                        {day.problemsSolved} {currentLang === 'ja' ? '問' : 'problems'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-green-400 font-medium">{(day.accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-sm text-white/70">
                        {Math.round(day.studyTime / 60)} {currentLang === 'ja' ? '分' : 'min'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* よく学習したカテゴリー */}
            {statisticsSummary.thisWeek.topCategories.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">{t[currentLang].topCategories}</h3>
                <div className="space-y-2">
                  {statisticsSummary.thisWeek.topCategories.map((cat, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="text-white font-medium">{cat.category}</div>
                      <div className="text-blue-400 font-bold">{cat.count} {currentLang === 'ja' ? '問' : 'problems'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* 月次タブのコンテンツ */}
      {activeTab === 'monthly' && statisticsSummary?.thisMonth && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-purple-500" />
              {t[currentLang].thisMonth}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-1">{t[currentLang].totalProblems}</div>
                <div className="text-2xl font-bold text-blue-400">{statisticsSummary.thisMonth.totalProblems}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-1">{t[currentLang].overallAccuracy}</div>
                <div className="text-2xl font-bold text-green-400">
                  {(statisticsSummary.thisMonth.averageAccuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-1">{t[currentLang].studyDays}</div>
                <div className="text-2xl font-bold text-purple-400">{statisticsSummary.thisMonth.studyDays}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-1">{t[currentLang].totalStudyTime}</div>
                <div className="text-2xl font-bold text-orange-400">
                  {Math.round(statisticsSummary.thisMonth.totalStudyTime / 60)} {t[currentLang].minutes}
                </div>
              </div>
            </div>

            {/* 週別統計 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t[currentLang].weeklyBreakdown}</h3>
              <div className="space-y-2">
                {statisticsSummary.thisMonth.weeklyStats.map((week, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white/70 text-sm font-medium">
                        {t[currentLang].weekOf} {new Date(week.weekStart).toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-white text-sm font-bold">
                        {week.totalProblems} {currentLang === 'ja' ? '問' : 'problems'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-400">{(week.averageAccuracy * 100).toFixed(1)}%</span>
                      <span className="text-white/70">
                        {week.studyDays} {currentLang === 'ja' ? '日学習' : 'study days'}
                      </span>
                      <span className="text-white/70">
                        {Math.round(week.totalStudyTime / 60)} {currentLang === 'ja' ? '分' : 'min'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 最高の週 */}
            {statisticsSummary.thisMonth.bestWeek && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">{t[currentLang].bestWeek}</h3>
                <GlassCard className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-white font-medium">
                      {new Date(statisticsSummary.thisMonth.bestWeek.weekStart).toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', {
                        month: 'short',
                        day: 'numeric'
                      })} - {new Date(statisticsSummary.thisMonth.bestWeek.weekEnd).toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-yellow-400 text-xl font-bold">
                      {statisticsSummary.thisMonth.bestWeek.totalProblems} {currentLang === 'ja' ? '問' : 'problems'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-400 font-medium">
                      {(statisticsSummary.thisMonth.bestWeek.averageAccuracy * 100).toFixed(1)}%
                    </span>
                    <span className="text-white/70">
                      {statisticsSummary.thisMonth.bestWeek.studyDays} {currentLang === 'ja' ? '日学習' : 'study days'}
                    </span>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* カテゴリー別内訳 */}
            {statisticsSummary.thisMonth.categoryBreakdown.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">{t[currentLang].categoryBreakdown}</h3>
                <div className="space-y-2">
                  {statisticsSummary.thisMonth.categoryBreakdown.map((cat, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="text-white font-medium">{cat.category}</div>
                      <div className="flex items-center gap-4">
                        <span className="text-blue-400 font-bold">{cat.count} {currentLang === 'ja' ? '問' : 'problems'}</span>
                        <span className="text-green-400 font-medium">{(cat.accuracy * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* トレンドタブのコンテンツ */}
      {activeTab === 'trends' && statisticsSummary?.trends && (
        <div className="space-y-6">
          {/* 正解率のトレンド */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <LineChart className="w-6 h-6 text-green-500" />
              {t[currentLang].accuracyTrend}
            </h2>
            <div className="mb-4 flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                statisticsSummary.trends.accuracy.trend === 'improving'
                  ? 'bg-green-500/20 text-green-400'
                  : statisticsSummary.trends.accuracy.trend === 'declining'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {statisticsSummary.trends.accuracy.trend === 'improving'
                  ? `📈 ${t[currentLang].improving}`
                  : statisticsSummary.trends.accuracy.trend === 'declining'
                  ? `📉 ${t[currentLang].declining}`
                  : `➡️ ${t[currentLang].stable}`
                }
              </div>
              <div className="text-white/70 text-sm">
                {t[currentLang].changeRate}: <span className={`font-bold ${
                  statisticsSummary.trends.accuracy.changeRate > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {statisticsSummary.trends.accuracy.changeRate > 0 ? '+' : ''}
                  {statisticsSummary.trends.accuracy.changeRate.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-64">
              <GlowingLineChart
                data={statisticsSummary.trends.accuracy.dataPoints.map(dp => dp.value * 100)}
                labels={statisticsSummary.trends.accuracy.dataPoints.map(dp =>
                  new Date(dp.date).toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', {
                    month: 'short',
                    day: 'numeric'
                  })
                )}
                height={200}
                color="#10b981"
              />
            </div>
          </GlassCard>

          {/* 学習量のトレンド */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <LineChart className="w-6 h-6 text-blue-500" />
              {t[currentLang].activityTrend}
            </h2>
            <div className="mb-4 flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                statisticsSummary.trends.activity.trend === 'improving'
                  ? 'bg-green-500/20 text-green-400'
                  : statisticsSummary.trends.activity.trend === 'declining'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {statisticsSummary.trends.activity.trend === 'improving'
                  ? `📈 ${t[currentLang].improving}`
                  : statisticsSummary.trends.activity.trend === 'declining'
                  ? `📉 ${t[currentLang].declining}`
                  : `➡️ ${t[currentLang].stable}`
                }
              </div>
              <div className="text-white/70 text-sm">
                {t[currentLang].changeRate}: <span className={`font-bold ${
                  statisticsSummary.trends.activity.changeRate > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {statisticsSummary.trends.activity.changeRate > 0 ? '+' : ''}
                  {statisticsSummary.trends.activity.changeRate.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-64">
              <GlowingLineChart
                data={statisticsSummary.trends.activity.dataPoints.map(dp => dp.value)}
                labels={statisticsSummary.trends.activity.dataPoints.map(dp =>
                  new Date(dp.date).toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', {
                    month: 'short',
                    day: 'numeric'
                  })
                )}
                height={200}
                color="#3b82f6"
              />
            </div>
          </GlassCard>
        </div>
      )}

      {/* 予測タブのコンテンツ */}
      {activeTab === 'prediction' && statisticsSummary?.prediction && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-500" />
              {t[currentLang].performancePrediction}
            </h2>

            <div className="mb-6 p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
              <div className="text-white/70 text-sm mb-2">
                {new Date(statisticsSummary.prediction.targetDate).toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} ({currentLang === 'ja' ? '7日後' : '7 days ahead'})
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/70 mb-1">{t[currentLang].predictedAccuracy}</div>
                  <div className="text-3xl font-bold text-green-400">
                    {(statisticsSummary.prediction.predictedAccuracy * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/70 mb-1">{t[currentLang].predictedActivity}</div>
                  <div className="text-3xl font-bold text-blue-400">
                    {statisticsSummary.prediction.predictedProblemsPerDay.toFixed(1)} {t[currentLang].problemsPerDay}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-sm">{t[currentLang].confidence}</span>
                <span className="text-white font-bold">
                  {(statisticsSummary.prediction.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${statisticsSummary.prediction.confidence * 100}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <div className="text-sm font-medium text-blue-400 mb-2">{t[currentLang].recommendation}</div>
              <div className="text-white">{statisticsSummary.prediction.recommendation}</div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 統計比較モーダル */}
      {showComparisonModal && (
        <StatsComparisonModal
          onClose={() => setShowComparisonModal(false)}
          categories={categoryStats.map(c => c.category)}
        />
      )}

      {/* レポート生成モーダル */}
      {showReportModal && (
        <ReportGeneratorModal
          onClose={() => setShowReportModal(false)}
          language={currentLang}
        />
      )}
    </div>
  </div>
);
};

// React.memoでラップしてパフォーマンス最適化
export default memo(Statistics);