import { useState, useEffect } from 'react';
import { statisticsService } from '../lib/database';
import type { Problem, QuizSet } from '../types';
import { OverallStatsChart } from './charts/OverallStatsChart';
import { CategoryStatsChart } from './charts/CategoryStatsChart';
import { TrendChart } from './charts/TrendChart';
import { QuizSetStatsChart } from './charts/QuizSetStatsChart';

interface StatisticsProps {
  onBack: () => void;
  onStartQuizSetWorstProblems?: (quizSetId: number, useLatestOnly: boolean) => void;
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

interface CategoryStats {
  category: string;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  problemCount: number;
}

interface WorstProblem {
  problem: Problem;
  incorrectCount: number;
  totalAnswered: number;
  accuracy: number;
}

interface QuizSetStats {
  quizSet: QuizSet;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  lastPlayed?: Date;
}

interface RecentActivity {
  date: string;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
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

export function Statistics({ onBack, onStartQuizSetWorstProblems, onOpenQuizSetStats, isDarkMode = false, language = 'ja' }: StatisticsProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      title: '📊 学習統計',
      backButton: '← メインメニューに戻る',
      copyButton: '📋 統計データをコピー',
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
      close: '✕ 閉じる',
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
      noCategoryData: 'カテゴリー別統計データがありません'
    },
    en: {
      title: '📊 Learning Statistics',
      backButton: '← Back to Main Menu',
      copyButton: '📋 Copy Statistics Data',
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
      close: '✕ Close',
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
      noCategoryData: 'No category statistics data available'
    }
  };

  const currentLang = language as keyof typeof t;
  const [isLoading, setIsLoading] = useState(true);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [quizSetWorstProblems, setQuizSetWorstProblems] = useState<QuizSetWorstProblems[]>([]);
  const [categoryWorstProblems, setCategoryWorstProblems] = useState<CategoryWorstProblems[]>([]);
  const [showCopyOptions, setShowCopyOptions] = useState(false);
  const [selectedQuizSetId, setSelectedQuizSetId] = useState<number | null>(null);
  const [selectedQuizSetStats, setSelectedQuizSetStats] = useState<QuizSetWorstProblems | null>(null);
  const [accuracyFilter, setAccuracyFilter] = useState<number | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [worstProblems, setWorstProblems] = useState<WorstProblem[]>([]);
  const [quizSetStats, setQuizSetStats] = useState<QuizSetStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const [overall, categories, worst, quizSets, recent] = await Promise.all([
        statisticsService.getOverallStats(),
        statisticsService.getCategoryStats(),
        statisticsService.getWorstProblems(10),
        statisticsService.getQuizSetStats(),
        statisticsService.getRecentActivity(7)
      ]);

      setOverallStats(overall);
      setCategoryStats(categories);
      setWorstProblems(worst);
      setQuizSetStats(quizSets);
      setRecentActivity(recent);

      // 問題集ごとの間違いが多い問題を取得
      await loadQuizSetWorstProblems();
      
      // カテゴリーごとの間違いが多い問題を取得
      await loadCategoryWorstProblems();
    } catch (error) {
      console.error('統計データの読み込みエラー:', error);
    } finally {
      setIsLoading(false);
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
      console.error('問題集別統計データの読み込みエラー:', error);
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
      console.error('カテゴリー別統計データの読み込みエラー:', error);
    }
  };

  const loadSelectedQuizSetStats = async (quizSetId: number) => {
    try {
      const quizSetStat = quizSetStats.find(stat => stat.quizSet.id === quizSetId);
      if (!quizSetStat) return;

      const worstProblems = await statisticsService.getWorstProblemsByQuizSet(quizSetId, 10);
      
      setSelectedQuizSetStats({
        quizSetId: quizSetId,
        quizSetName: quizSetStat.quizSet.name,
        problems: worstProblems
      });
    } catch (error) {
      console.error('選択された問題集の統計データ読み込みエラー:', error);
    }
  };

  const handleQuizSetSelection = (quizSetId: number) => {
    setSelectedQuizSetId(quizSetId);
    loadSelectedQuizSetStats(quizSetId);
  };

  const formatAccuracy = (accuracy: number): string => {
    return `${accuracy.toFixed(1)}%`;
  };

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

  // 正答率でフィルタリングされた問題を取得
  const getFilteredProblems = (problems: WorstProblem[]): WorstProblem[] => {
    if (accuracyFilter === null) return problems;
    return problems.filter(problem => problem.accuracy <= accuracyFilter);
  };

  // 選択された問題集の詳細統計フォーマット
  const formatSelectedQuizSetStatistics = (): string => {
    if (!selectedQuizSetStats) return '';
    
    const sections: string[] = [];
    
    sections.push(`# ${selectedQuizSetStats.quizSetName} - 詳細統計\n`);
    
    // 全体統計
    const quizSetStat = quizSetStats.find(stat => stat.quizSet.id === selectedQuizSetId);
    if (quizSetStat) {
      sections.push(`## 全体成績
解答回数: ${quizSetStat.totalAnswered}回
正解数: ${quizSetStat.totalCorrect}回
正解率: ${formatAccuracy(quizSetStat.accuracy)}
最終プレイ日: ${quizSetStat.lastPlayed ? formatDate(quizSetStat.lastPlayed) : '未プレイ'}\n`);
    }

    // 正答率フィルターを適用
    const filteredProblems = getFilteredProblems(selectedQuizSetStats.problems);
    
    if (accuracyFilter !== null) {
      sections.push(`## フィルター条件
正答率: ${accuracyFilter}%以下
該当問題数: ${filteredProblems.length}問\n`);
    }
    
    // 間違いが多い問題詳細（フィルタリング済み）
    if (filteredProblems.length > 0) {
      sections.push('## 間違いが多い問題（改善が必要）\n');
      filteredProblems.forEach((problemStat, index) => {
        sections.push(`### 問題${index + 1}
**問題:** ${problemStat.problem.question}
**カテゴリー:** ${problemStat.problem.category}
**間違い回数:** ${problemStat.incorrectCount}回
**解答回数:** ${problemStat.totalAnswered}回
**正解率:** ${formatAccuracy(problemStat.accuracy)}
**解説:** ${problemStat.problem.explanation}\n`);
      });
    } else {
      sections.push('## 間違いが多い問題\n条件に該当する問題がありません。\n');
    }
    
    // カテゴリー別分析（フィルタリング済み問題に基づく）
    const categoryBreakdown = new Map<string, {count: number, totalIncorrect: number, totalAnswered: number}>();
    filteredProblems.forEach(problemStat => {
      const category = problemStat.problem.category;
      if (!categoryBreakdown.has(category)) {
        categoryBreakdown.set(category, {count: 0, totalIncorrect: 0, totalAnswered: 0});
      }
      const breakdown = categoryBreakdown.get(category)!;
      breakdown.count++;
      breakdown.totalIncorrect += problemStat.incorrectCount;
      breakdown.totalAnswered += problemStat.totalAnswered;
    });
    
    if (categoryBreakdown.size > 0) {
      sections.push('## カテゴリー別 間違い傾向\n');
      Array.from(categoryBreakdown.entries()).forEach(([category, breakdown]) => {
        const accuracy = breakdown.totalAnswered > 0 ? ((breakdown.totalAnswered - breakdown.totalIncorrect) / breakdown.totalAnswered * 100) : 0;
        sections.push(`- **${category}**: ${breakdown.count}問で間違い ${breakdown.totalIncorrect}回 (正解率: ${formatAccuracy(accuracy)})`);
      });
    }

    return sections.join('\n');
  };

  // クリップボードにコピー
  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${description}${t[currentLang].copySuccess}`);
    } catch (error) {
      console.error('コピーに失敗:', error);
      alert(t[currentLang].copyFailed);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ja-JP');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t[currentLang].loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <button
              onClick={onBack}
              className="quiz-action-button px-4 py-2 rounded-lg transition-colors"
            >
              {t[currentLang].backButton}
            </button>
            <button
              onClick={() => setShowCopyOptions(!showCopyOptions)}
              className="quiz-action-button px-4 py-2 rounded-lg transition-colors bg-green-600 hover:bg-green-700 text-white"
            >
              {t[currentLang].copyButton}
            </button>
          </div>
          <h1 className="text-3xl font-bold text-orange-900 dark:text-orange-100">{t[currentLang].title}</h1>
          
          {/* コピーオプション */}
          {showCopyOptions && (
            <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].copyTitle}</h3>
              
              {/* 全体統計コピー */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <button
                  onClick={() => copyToClipboard(formatStatisticsForCopy(), t[currentLang].copyAll)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t[currentLang].copyAll}
                </button>
                <button
                  onClick={() => {
                    if (quizSetWorstProblems.length > 0) {
                      const combinedText = quizSetWorstProblems.map(formatQuizSetStatistics).join('\n\n---\n\n');
                      copyToClipboard(combinedText, t[currentLang].copyByQuizSet);
                    } else {
                      alert(t[currentLang].noQuizSetData);
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {t[currentLang].copyByQuizSet}
                </button>
                <button
                  onClick={() => {
                    if (categoryWorstProblems.length > 0) {
                      const combinedText = categoryWorstProblems.map(formatCategoryStatistics).join('\n\n---\n\n');
                      copyToClipboard(combinedText, t[currentLang].copyByCategory);
                    } else {
                      alert(t[currentLang].noCategoryData);
                    }
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  {t[currentLang].copyByCategory}
                </button>
              </div>

              {/* 問題集選択コピー */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].selectQuizSet}</h4>
                <div className="space-y-3">
                  <select
                    value={selectedQuizSetId || ''}
                    onChange={(e) => e.target.value ? handleQuizSetSelection(parseInt(e.target.value)) : setSelectedQuizSetId(null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{t[currentLang].selectPlaceholder}</option>
                    {quizSetStats.map((stats) => (
                      <option key={stats.quizSet.id} value={stats.quizSet.id}>
                        {stats.quizSet.name} ({stats.totalAnswered}回解答, 正解率{formatAccuracy(stats.accuracy)})
                      </option>
                    ))}
                  </select>
                  
                  {selectedQuizSetStats && (
                    <div className="space-y-3">
                      {/* 正答率フィルター */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t[currentLang].accuracyFilter}
                        </label>
                        <select
                          value={accuracyFilter || ''}
                          onChange={(e) => setAccuracyFilter(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">{t[currentLang].accuracyAll}</option>
                          <option value="80">{t[currentLang].accuracyBelow80}</option>
                          <option value="70">{t[currentLang].accuracyBelow70}</option>
                          <option value="60">{t[currentLang].accuracyBelow60}</option>
                          <option value="50">{t[currentLang].accuracyBelow50}</option>
                          <option value="40">{t[currentLang].accuracyBelow40}</option>
                          <option value="30">{t[currentLang].accuracyBelow30}</option>
                          <option value="20">{t[currentLang].accuracyBelow20}</option>
                          <option value="10">{t[currentLang].accuracyBelow10}</option>
                        </select>
                      </div>
                      
                      {/* プレビュー情報 */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t[currentLang].preview}: {getFilteredProblems(selectedQuizSetStats.problems).length}{t[currentLang].problemsFound}
                          {accuracyFilter && ` (${t[currentLang].accuracy}${accuracyFilter}%${language === 'ja' ? '以下' : ' or below'})`}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(formatSelectedQuizSetStatistics(), `${selectedQuizSetStats.quizSetName}${language === 'ja' ? 'の詳細統計' : ' detailed statistics'}`)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          📋 {selectedQuizSetStats.quizSetName}{language === 'ja' ? 'の' : ' '}{t[currentLang].detailsCopy}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedQuizSetId(null);
                            setAccuracyFilter(null);
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          {t[currentLang].close}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* 全体統計 */}
        {overallStats && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-6">{t[currentLang].overallStats}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{overallStats.totalProblems}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].totalProblems}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{overallStats.totalCategories}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].totalCategories}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{overallStats.totalQuizSets}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].totalQuizSets}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{overallStats.totalAnswered}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].totalAnswers}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{overallStats.totalCorrect}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].totalCorrect}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatAccuracy(overallStats.overallAccuracy)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].overallAccuracy}</div>
              </div>
            </div>
            
            {/* 全体統計グラフ */}
            {overallStats.totalAnswered > 0 && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">{t[currentLang].accuracyDistribution}</h3>
                <OverallStatsChart
                  totalCorrect={overallStats.totalCorrect}
                  totalIncorrect={overallStats.totalAnswered - overallStats.totalCorrect}
                  isDarkMode={isDarkMode}
                  language={language}
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* カテゴリ別統計 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">{t[currentLang].categoryPerformance}</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {categoryStats.length > 0 ? categoryStats.map((category) => (
                <div key={category.category} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate flex-1">
                      {category.category}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      category.accuracy >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      category.accuracy >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {formatAccuracy(category.accuracy)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span>{t[currentLang].problemCount}: {category.problemCount}</span>
                    <span>{t[currentLang].answerCount}: {category.totalAnswered}</span>
                    <span>{t[currentLang].correctCount}: {category.totalCorrect}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        category.accuracy >= 80 ? 'bg-green-500' :
                        category.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(category.accuracy, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">{t[currentLang].noAnswersYet}</p>
              )}
            </div>
            
            {/* カテゴリ別グラフ */}
            {categoryStats.length > 0 && (
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">{language === 'ja' ? 'カテゴリ別正答率' : 'Category Accuracy'}</h3>
                <CategoryStatsChart
                  categoryStats={categoryStats}
                  isDarkMode={isDarkMode}
                />
              </div>
            )}
          </div>

          {/* 苦手問題 */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">{t[currentLang].worstProblems}</h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">{t[currentLang].worstProblemsDesc}</p>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {worstProblems.length > 0 ? worstProblems.map((item, index) => (
                <div key={item.problem.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs font-medium mr-2">
                          #{index + 1}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.problem.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                        {item.problem.question}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatAccuracy(item.accuracy)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.totalAnswered}{t[currentLang].timesWrong}{item.incorrectCount}{t[currentLang].timesWrongSuffix}
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">{t[currentLang].insufficientData}</p>
              )}
            </div>
          </div>
        </div>

        {/* 問題集統計 */}
        {quizSetStats.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-2">{t[currentLang].quizSetStats}</h2>
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">{t[currentLang].quizSetStatsDesc}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizSetStats.map((stats) => (
                <div key={stats.quizSet.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2 truncate">
                    {stats.quizSet.name}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>{t[currentLang].accuracy}:</span>
                      <span className="font-semibold">{formatAccuracy(stats.accuracy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t[currentLang].answersCount}:</span>
                      <span>{stats.totalAnswered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t[currentLang].correctAnswers}:</span>
                      <span>{stats.totalCorrect}</span>
                    </div>
                    {stats.lastPlayed && (
                      <div className="flex justify-between">
                        <span>{t[currentLang].lastPlayed}:</span>
                        <span>{formatDate(stats.lastPlayed)}</span>
                      </div>
                    )}
                  </div>
                  {onStartQuizSetWorstProblems && stats.totalAnswered > 0 && (
                    <div className="mt-3 space-y-2">
                      <button
                        onClick={() => onStartQuizSetWorstProblems(stats.quizSet.id!, true)}
                        className="quiz-action-button w-full px-3 py-2 rounded-md transition-colors text-sm"
                      >
                        {t[currentLang].weakProblemsLatest}
                      </button>
                      <button
                        onClick={() => onStartQuizSetWorstProblems(stats.quizSet.id!, false)}
                        className="quiz-action-button w-full px-3 py-2 rounded-md transition-colors text-sm"
                      >
                        {t[currentLang].weakProblemsAll}
                      </button>
                    </div>
                  )}
                  {onOpenQuizSetStats && (
                    <div className="mt-2">
                      <button
                        onClick={() => onOpenQuizSetStats(stats.quizSet.id!)}
                        className="quiz-action-button w-full px-3 py-2 rounded-md transition-colors text-sm bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {t[currentLang].detailedStats}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 問題集別グラフ */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">{t[currentLang].accuracyRanking}</h3>
              <QuizSetStatsChart
                quizSetStats={quizSetStats}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        )}

        {/* 問題集別間違いが多い問題 */}
        {quizSetWorstProblems.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">{t[currentLang].worstByQuizSet}</h2>
            <div className="space-y-6">
              {quizSetWorstProblems.map((quizSetData) => (
                <div key={quizSetData.quizSetId} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">{quizSetData.quizSetName}</h3>
                    <button
                      onClick={() => copyToClipboard(formatQuizSetStatistics(quizSetData), `${quizSetData.quizSetName}${language === 'ja' ? 'の統計' : ' statistics'}`)}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                    >
                      📋 コピー
                    </button>
                  </div>
                  <div className="space-y-3">
                    {quizSetData.problems.slice(0, 3).map((problemStat) => (
                      <div key={problemStat.problem.id} className="border-l-4 border-red-400 pl-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{problemStat.problem.question}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t[currentLang].category}: {problemStat.problem.category} |
                          {t[currentLang].wrongCount}: {problemStat.incorrectCount}{t[currentLang].times} |
                          {t[currentLang].accuracy}: {formatAccuracy(problemStat.accuracy)}
                        </div>
                      </div>
                    ))}
                    {quizSetData.problems.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {t[currentLang].others} {quizSetData.problems.length - 3}{t[currentLang].problemsViewAll}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* カテゴリー別間違いが多い問題 */}
        {categoryWorstProblems.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20 border border-teal-200 dark:border-teal-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-teal-900 dark:text-teal-100 mb-4">{t[currentLang].worstByCategory}</h2>
            <div className="space-y-6">
              {categoryWorstProblems.map((categoryData) => (
                <div key={categoryData.category} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">{categoryData.category}</h3>
                    <button
                      onClick={() => copyToClipboard(formatCategoryStatistics(categoryData), `${categoryData.category}${language === 'ja' ? 'の統計' : ' statistics'}`)}
                      className="px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                    >
                      📋 コピー
                    </button>
                  </div>
                  <div className="space-y-3">
                    {categoryData.problems.slice(0, 3).map((problemStat) => (
                      <div key={problemStat.problem.id} className="border-l-4 border-red-400 pl-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{problemStat.problem.question}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t[currentLang].wrongCount}: {problemStat.incorrectCount}{t[currentLang].times} |
                          {t[currentLang].accuracy}: {formatAccuracy(problemStat.accuracy)}
                        </div>
                      </div>
                    ))}
                    {categoryData.problems.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {t[currentLang].others} {categoryData.problems.length - 3}{t[currentLang].problemsViewAll}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 選択された問題集の詳細統計 */}
        {selectedQuizSetStats && (
          <div className="mt-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-green-900 dark:text-green-100">{t[currentLang].detailedStatsTitle} {selectedQuizSetStats.quizSetName}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(formatSelectedQuizSetStatistics(), `${selectedQuizSetStats.quizSetName}${language === 'ja' ? 'の詳細統計' : ' detailed statistics'}`)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  📋 {t[currentLang].detailsCopy}
                </button>
                <button
                  onClick={() => setSelectedQuizSetId(null)}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  {t[currentLang].close}
                </button>
              </div>
            </div>

            {/* 全体成績 */}
            {(() => {
              const quizSetStat = quizSetStats.find(stat => stat.quizSet.id === selectedQuizSetId);
              return quizSetStat ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].overallPerformance}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{quizSetStat.totalAnswered}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].answersTotal}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{quizSetStat.totalCorrect}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].correctTotal}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatAccuracy(quizSetStat.accuracy)}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].accuracyTotal}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-green-600 dark:text-green-400">
                        {quizSetStat.lastPlayed ? formatDate(quizSetStat.lastPlayed) : t[currentLang].unplayed}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].lastPlayedDate}</div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* 間違いが多い問題 */}
            {selectedQuizSetStats.problems.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].mostWrongProblems} {t[currentLang].topProblems}{Math.min(selectedQuizSetStats.problems.length, 5)}</h3>
                <div className="space-y-3">
                  {selectedQuizSetStats.problems.slice(0, 5).map((problemStat) => (
                    <div key={problemStat.problem.id} className="border-l-4 border-red-400 pl-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{problemStat.problem.question}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {t[currentLang].category}: {problemStat.problem.category}
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <div className="text-sm font-bold text-red-600">{t[currentLang].wrongCount} {problemStat.incorrectCount}{t[currentLang].times}</div>
                          <div className="text-xs text-gray-500">{t[currentLang].accuracy} {formatAccuracy(problemStat.accuracy)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedQuizSetStats.problems.length > 5 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {t[currentLang].others} {selectedQuizSetStats.problems.length - 5} {language === 'ja' ? '問（詳細統計コピーで全て確認できます）' : 'problems (copy detailed stats to view all)'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  {t[currentLang].noStatsData}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 最近の活動 */}
        {recentActivity.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100 mb-4">{t[currentLang].recentActivity}</h2>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {recentActivity.map((activity) => (
                <div key={activity.date} className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {new Date(activity.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  </div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {activity.totalAnswered}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {formatAccuracy(activity.accuracy)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* トレンドグラフ */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-4">{t[currentLang].learningTrend}</h3>
              <TrendChart
                recentActivity={recentActivity}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}