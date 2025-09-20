import { useState, useEffect } from 'react';
import { statisticsService } from '../lib/database';
import type { Problem, QuizSet } from '../types';
import { CategoryStatsChart } from './charts/CategoryStatsChart';
import { OverallStatsChart } from './charts/OverallStatsChart';

interface QuizSetDetailStatsProps {
  quizSetId: number;
  onBack: () => void;
  isDarkMode?: boolean;
  language?: 'ja' | 'en';
}

interface QuizSetStats {
  quizSet: QuizSet;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  lastPlayed?: Date;
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

export function QuizSetDetailStats({ quizSetId, onBack, isDarkMode = false, language = 'ja' }: QuizSetDetailStatsProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      title: '📊 問題集詳細統計',
      backButton: '← 統計に戻る',
      loading: '統計データを読み込み中...',
      noDataFound: 'データが見つかりません',
      backButtonShort: '戻る',
      detailsSubtitle: '問題集詳細統計',
      basicStats: '📈 基本統計',
      totalProblems: '総問題数',
      totalAnswers: '回答数',
      totalCorrect: '正解数',
      accuracy: '正答率',
      accuracyDistribution: '正解率の分布',
      lastPlayed: '最終プレイ日',
      categoryPerformance: '📚 カテゴリ別成績',
      problemCount: '問題数',
      answerCount: '回答数',
      correctCount: '正解',
      categoryAccuracy: 'カテゴリ別正答率',
      noAnswersYet: 'まだクイズに回答していません',
      worstProblems: '🔥 苦手問題トップ10',
      worstProblemsDesc: '正答率の低い問題（2回以上回答）',
      timesWrong: '回中',
      timesWrongSuffix: '回間違い',
      explanation: '解説',
      insufficientData: 'データが不十分です（2回以上回答された問題が必要）'
    },
    en: {
      title: '📊 Quiz Set Detailed Statistics',
      backButton: '← Back to Statistics',
      loading: 'Loading statistics data...',
      noDataFound: 'No data found',
      backButtonShort: 'Back',
      detailsSubtitle: 'Quiz Set Detailed Statistics',
      basicStats: '📈 Basic Statistics',
      totalProblems: 'Total Problems',
      totalAnswers: 'Total Answers',
      totalCorrect: 'Correct Answers',
      accuracy: 'Accuracy',
      accuracyDistribution: 'Accuracy Distribution',
      lastPlayed: 'Last Played',
      categoryPerformance: '📚 Category Performance',
      problemCount: 'Problems',
      answerCount: 'Answers',
      correctCount: 'Correct',
      categoryAccuracy: 'Category Accuracy',
      noAnswersYet: 'No quiz answers yet',
      worstProblems: '🔥 Top 10 Worst Problems',
      worstProblemsDesc: 'Low accuracy problems (answered 2+ times)',
      timesWrong: ' out of ',
      timesWrongSuffix: ' wrong',
      explanation: 'Explanation',
      insufficientData: 'Insufficient data (problems answered 2+ times required)'
    }
  };

  const currentLang = language as keyof typeof t;
  const [isLoading, setIsLoading] = useState(true);
  const [quizSetStats, setQuizSetStats] = useState<QuizSetStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [worstProblems, setWorstProblems] = useState<WorstProblem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);

  useEffect(() => {
    loadQuizSetStats();
  }, [quizSetId]);

  const loadQuizSetStats = async () => {
    try {
      setIsLoading(true);
      
      // 問題集の基本統計を取得
      const allQuizSetStats = await statisticsService.getQuizSetStats();
      const currentQuizSetStats = allQuizSetStats.find(stats => stats.quizSet.id === quizSetId);
      
      if (!currentQuizSetStats) {
        console.error('問題集の統計が見つかりません:', quizSetId);
        return;
      }
      
      setQuizSetStats(currentQuizSetStats);
      
      // 問題集内のすべての問題を取得
      const problems = await statisticsService.getProblemsByQuizSetId(quizSetId);
      setAllProblems(problems);
      
      // 問題集内のカテゴリ別統計を計算
      const categoryStatsMap = new Map<string, {
        totalAnswered: number;
        totalCorrect: number;
        problemCount: number;
      }>();
      
      for (const problem of problems) {
        const category = problem.category;
        const stats = await statisticsService.getProblemStats(problem.id!);
        
        if (!categoryStatsMap.has(category)) {
          categoryStatsMap.set(category, {
            totalAnswered: 0,
            totalCorrect: 0,
            problemCount: 0
          });
        }
        
        const categoryData = categoryStatsMap.get(category)!;
        categoryData.totalAnswered += stats.totalAnswered;
        categoryData.totalCorrect += stats.totalCorrect;
        categoryData.problemCount += 1;
      }
      
      const categoryStatsArray: CategoryStats[] = Array.from(categoryStatsMap.entries()).map(([category, data]) => ({
        category,
        totalAnswered: data.totalAnswered,
        totalCorrect: data.totalCorrect,
        accuracy: data.totalAnswered > 0 ? (data.totalCorrect / data.totalAnswered) * 100 : 0,
        problemCount: data.problemCount
      }));
      
      setCategoryStats(categoryStatsArray);
      
      // 問題集内の苦手問題を取得
      const worstProblemsData = await statisticsService.getWorstProblemsByQuizSet(quizSetId, 10);
      setWorstProblems(worstProblemsData);
      
    } catch (error) {
      console.error('問題集統計の読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAccuracy = (accuracy: number): string => {
    return `${accuracy.toFixed(1)}%`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US');
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

  if (!quizSetStats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t[currentLang].noDataFound}</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t[currentLang].backButtonShort}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="quiz-action-button px-4 py-2 rounded-lg transition-colors"
            >
              {t[currentLang].backButton}
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
              📊 {quizSetStats.quizSet.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{t[currentLang].detailsSubtitle}</p>
          </div>
        </header>

        {/* 全体統計サマリー */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-6">{t[currentLang].basicStats}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{allProblems.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].totalProblems}</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{quizSetStats.totalAnswered}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].totalAnswers}</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{quizSetStats.totalCorrect}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].totalCorrect}</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatAccuracy(quizSetStats.accuracy)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].accuracy}</div>
            </div>
          </div>

          {/* 正答率ドーナツチャート */}
          {quizSetStats.totalAnswered > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">{t[currentLang].accuracyDistribution}</h3>
              <OverallStatsChart
                totalCorrect={quizSetStats.totalCorrect}
                totalIncorrect={quizSetStats.totalAnswered - quizSetStats.totalCorrect}
                isDarkMode={isDarkMode}
                language={language}
              />
            </div>
          )}

          {quizSetStats.lastPlayed && (
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              {t[currentLang].lastPlayed}: {formatDate(quizSetStats.lastPlayed)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* カテゴリ別統計 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">{t[currentLang].categoryPerformance}</h2>
            {categoryStats.length > 0 ? (
              <>
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {categoryStats.map((category) => (
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
                  ))}
                </div>
                
                {/* カテゴリ別グラフ */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">{t[currentLang].categoryAccuracy}</h3>
                  <CategoryStatsChart
                    categoryStats={categoryStats}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center">{t[currentLang].noAnswersYet}</p>
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
                  {item.problem.explanation && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                      <strong>{t[currentLang].explanation}:</strong> {item.problem.explanation}
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">{t[currentLang].insufficientData}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}