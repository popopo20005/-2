import { useState, useEffect } from 'react';
import { statisticsService } from '../lib/database';
import type { Problem, QuizSet } from '../types';

interface StatisticsProps {
  onBack: () => void;
  onStartQuizSetWorstProblems?: (quizSetId: number, useLatestOnly: boolean) => void;
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

export function Statistics({ onBack, onStartQuizSetWorstProblems }: StatisticsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
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
    } catch (error) {
      console.error('統計データの読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAccuracy = (accuracy: number): string => {
    return `${accuracy.toFixed(1)}%`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ja-JP');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">統計データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="quiz-action-button mb-4 px-4 py-2 rounded-lg transition-colors"
          >
            ← メインメニューに戻る
          </button>
          <h1 className="text-3xl font-bold text-orange-900 dark:text-orange-100">📊 学習統計</h1>
        </header>

        {/* 全体統計 */}
        {overallStats && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-6">🎯 全体統計</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{overallStats.totalProblems}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">総問題数</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{overallStats.totalCategories}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">カテゴリ数</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{overallStats.totalQuizSets}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">問題集数</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{overallStats.totalAnswered}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">回答数</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{overallStats.totalCorrect}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">正解数</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatAccuracy(overallStats.overallAccuracy)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">総正答率</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* カテゴリ別統計 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">📚 カテゴリ別成績</h2>
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
                    <span>問題数: {category.problemCount}</span>
                    <span>回答数: {category.totalAnswered}</span>
                    <span>正解: {category.totalCorrect}</span>
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
                <p className="text-gray-500 dark:text-gray-400 text-center">まだクイズに回答していません</p>
              )}
            </div>
          </div>

          {/* 苦手問題 */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">🔥 苦手問題トップ10</h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">正答率の低い問題（2回以上回答）</p>
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
                        {item.totalAnswered}回中{item.incorrectCount}回間違い
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">データが不十分です（2回以上回答された問題が必要）</p>
              )}
            </div>
          </div>
        </div>

        {/* 問題集統計 */}
        {quizSetStats.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-2">📖 問題集別成績</h2>
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">各問題集で苦手問題のみを厳選してプレイできます</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizSetStats.map((stats) => (
                <div key={stats.quizSet.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2 truncate">
                    {stats.quizSet.name}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>正答率:</span>
                      <span className="font-semibold">{formatAccuracy(stats.accuracy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>回答数:</span>
                      <span>{stats.totalAnswered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>正解数:</span>
                      <span>{stats.totalCorrect}</span>
                    </div>
                    {stats.lastPlayed && (
                      <div className="flex justify-between">
                        <span>最終プレイ:</span>
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
                        🔥 苦手問題で復習（最新版）
                      </button>
                      <button
                        onClick={() => onStartQuizSetWorstProblems(stats.quizSet.id!, false)}
                        className="quiz-action-button w-full px-3 py-2 rounded-md transition-colors text-sm"
                      >
                        📚 苦手問題で復習（全履歴）
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近の活動 */}
        {recentActivity.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100 mb-4">📈 最近7日間の活動</h2>
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
          </div>
        )}
      </div>
    </div>
  );
}