/**
 * 統計データ集計サービス
 *
 * 週次・月次データ集計、トレンド分析、パフォーマンス予測
 */

import { historyService } from '../lib/database';
import { getTotalStudyTime, getDailyStudyTime } from '../lib/studyTimeService';
import { getAllGoals } from './goalService';
import { detectTopWeaknesses } from './weaknessDetectionService';
import type {
  DailyStatistics,
  WeeklyStatistics,
  MonthlyStatistics,
  TrendAnalysis,
  TrendDataPoint,
  PerformancePrediction,
  StatisticsSummary,
  CategoryStatistics,
  ExportStatistics,
} from '../types/statistics';

/**
 * 日次統計を計算
 */
export async function calculateDailyStatistics(date: Date): Promise<DailyStatistics> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const allHistories = await historyService.getAll();
    const dayHistories = allHistories.filter(h => {
      const historyDate = new Date(h.timestamp);
      return historyDate >= startOfDay && historyDate <= endOfDay;
    });

    const problemsSolved = dayHistories.length;
    const correctCount = dayHistories.filter(h => h.isCorrect).length;
    const accuracy = problemsSolved > 0 ? correctCount / problemsSolved : 0;

    const categories = [...new Set(dayHistories.map(h => h.category).filter(Boolean))];

    const studyTime = await getDailyStudyTime(date);

    return {
      date,
      problemsSolved,
      correctCount,
      accuracy,
      studyTime,
      categories: categories as string[],
    };
  } catch (error) {
    console.error('[StatisticsAggregator] 日次統計の計算に失敗:', error);
    throw error;
  }
}

/**
 * 週次統計を計算
 */
export async function calculateWeeklyStatistics(weekStart: Date): Promise<WeeklyStatistics> {
  try {
    console.log('[StatisticsAggregator] 週次統計を計算中...', weekStart);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // 日別統計を取得
    const dailyStats: DailyStatistics[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const stats = await calculateDailyStatistics(date);
      dailyStats.push(stats);
    }

    // 集計
    const totalProblems = dailyStats.reduce((sum, s) => sum + s.problemsSolved, 0);
    const totalCorrect = dailyStats.reduce((sum, s) => sum + s.correctCount, 0);
    const averageAccuracy = totalProblems > 0 ? totalCorrect / totalProblems : 0;
    const totalStudyTime = dailyStats.reduce((sum, s) => sum + s.studyTime, 0);
    const studyDays = dailyStats.filter(s => s.problemsSolved > 0).length;

    // カテゴリー集計
    const categoryMap = new Map<string, number>();
    for (const day of dailyStats) {
      for (const category of day.categories) {
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      }
    }

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      weekStart,
      weekEnd,
      totalProblems,
      totalCorrect,
      averageAccuracy,
      totalStudyTime,
      studyDays,
      dailyStats,
      topCategories,
    };
  } catch (error) {
    console.error('[StatisticsAggregator] 週次統計の計算に失敗:', error);
    throw error;
  }
}

/**
 * 月次統計を計算
 */
export async function calculateMonthlyStatistics(year: number, month: number): Promise<MonthlyStatistics> {
  try {
    console.log('[StatisticsAggregator] 月次統計を計算中...', { year, month });

    // 月の最初と最後の日を取得
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // 週別統計を計算
    const weeklyStats: WeeklyStatistics[] = [];
    let currentWeekStart = new Date(monthStart);

    // 週の開始を月曜日に調整
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);

    while (currentWeekStart <= monthEnd) {
      const weekStats = await calculateWeeklyStatistics(currentWeekStart);
      weeklyStats.push(weekStats);

      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    // 集計
    const totalProblems = weeklyStats.reduce((sum, w) => sum + w.totalProblems, 0);
    const totalCorrect = weeklyStats.reduce((sum, w) => sum + w.totalCorrect, 0);
    const averageAccuracy = totalProblems > 0 ? totalCorrect / totalProblems : 0;
    const totalStudyTime = weeklyStats.reduce((sum, w) => sum + w.totalStudyTime, 0);
    const studyDays = weeklyStats.reduce((sum, w) => sum + w.studyDays, 0);

    // 最も成果の出た週を見つける
    const bestWeek = weeklyStats.reduce((best, week) => {
      if (!best) return week;
      const bestScore = best.totalProblems * best.averageAccuracy;
      const weekScore = week.totalProblems * week.averageAccuracy;
      return weekScore > bestScore ? week : best;
    }, weeklyStats[0]);

    // カテゴリー別集計
    const categoryMap = new Map<string, { count: number; correct: number }>();
    const allHistories = await historyService.getAll();
    const monthHistories = allHistories.filter(h => {
      const historyDate = new Date(h.timestamp);
      return historyDate >= monthStart && historyDate <= monthEnd;
    });

    for (const history of monthHistories) {
      if (!history.category) continue;

      const current = categoryMap.get(history.category) || { count: 0, correct: 0 };
      current.count++;
      if (history.isCorrect) current.correct++;
      categoryMap.set(history.category, current);
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        accuracy: data.count > 0 ? data.correct / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      year,
      month,
      totalProblems,
      totalCorrect,
      averageAccuracy,
      totalStudyTime,
      studyDays,
      weeklyStats,
      bestWeek,
      categoryBreakdown,
    };
  } catch (error) {
    console.error('[StatisticsAggregator] 月次統計の計算に失敗:', error);
    throw error;
  }
}

/**
 * トレンド分析（移動平均）
 */
export async function analyzeTrend(
  metric: 'accuracy' | 'problemCount' | 'studyTime',
  days: number = 30
): Promise<TrendAnalysis> {
  try {
    console.log('[StatisticsAggregator] トレンド分析中...', { metric, days });

    // 過去N日分の日次統計を取得
    const dataPoints: TrendDataPoint[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dailyStats = await calculateDailyStatistics(date);

      let value = 0;
      switch (metric) {
        case 'accuracy':
          value = dailyStats.accuracy * 100;
          break;
        case 'problemCount':
          value = dailyStats.problemsSolved;
          break;
        case 'studyTime':
          value = dailyStats.studyTime / 60; // 分に変換
          break;
      }

      dataPoints.push({ date, value });
    }

    // 移動平均を計算（7日間）
    const windowSize = 7;
    for (let i = 0; i < dataPoints.length; i++) {
      if (i < windowSize - 1) {
        dataPoints[i].movingAverage = undefined;
        continue;
      }

      const window = dataPoints.slice(i - windowSize + 1, i + 1);
      const sum = window.reduce((acc, dp) => acc + dp.value, 0);
      dataPoints[i].movingAverage = sum / windowSize;
    }

    // トレンド判定（直近7日と前の7日を比較）
    const recentAvg =
      dataPoints
        .slice(-7)
        .reduce((sum, dp) => sum + dp.value, 0) / 7;

    const previousAvg =
      dataPoints
        .slice(-14, -7)
        .reduce((sum, dp) => sum + dp.value, 0) / 7;

    let trend: 'improving' | 'stable' | 'declining';
    const changeRate = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    if (changeRate > 5) {
      trend = 'improving';
    } else if (changeRate < -5) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // 簡易的な予測（移動平均から次の値を予測）
    const lastMovingAvg = dataPoints[dataPoints.length - 1].movingAverage;
    const prediction = lastMovingAvg !== undefined ? lastMovingAvg : recentAvg;

    console.log('[StatisticsAggregator] トレンド分析完了:', { trend, changeRate });

    return {
      metric,
      dataPoints,
      trend,
      changeRate,
      prediction,
    };
  } catch (error) {
    console.error('[StatisticsAggregator] トレンド分析に失敗:', error);
    throw error;
  }
}

/**
 * パフォーマンス予測
 */
export async function predictPerformance(daysAhead: number = 7): Promise<PerformancePrediction> {
  try {
    console.log('[StatisticsAggregator] パフォーマンス予測中...', { daysAhead });

    const accuracyTrend = await analyzeTrend('accuracy', 30);
    const activityTrend = await analyzeTrend('problemCount', 30);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    // 正解率の予測（トレンドから）
    const predictedAccuracy = (accuracyTrend.prediction || 70) / 100;

    // 1日あたりの解答数予測
    const predictedProblemsPerDay = activityTrend.prediction || 10;

    // 信頼度（データ量とトレンドの安定性から計算）
    const dataCount = accuracyTrend.dataPoints.filter(dp => dp.value > 0).length;
    const confidence = Math.min(1, dataCount / 30); // 30日分のデータで100%

    // 推奨アクション
    let recommendation = '';
    if (accuracyTrend.trend === 'declining') {
      recommendation = '正解率が低下傾向です。復習を強化しましょう。';
    } else if (activityTrend.trend === 'declining') {
      recommendation = '学習量が減少傾向です。毎日少しずつでも続けましょう。';
    } else if (accuracyTrend.trend === 'improving') {
      recommendation = '順調です！この調子を維持しましょう。';
    } else {
      recommendation = '安定しています。新しいカテゴリーに挑戦してみましょう。';
    }

    return {
      targetDate,
      predictedAccuracy,
      predictedProblemsPerDay,
      confidence,
      recommendation,
    };
  } catch (error) {
    console.error('[StatisticsAggregator] パフォーマンス予測に失敗:', error);
    throw error;
  }
}

/**
 * 総合統計サマリーを生成
 */
export async function generateStatisticsSummary(): Promise<StatisticsSummary> {
  try {
    console.log('[StatisticsAggregator] 統計サマリーを生成中...');

    const allHistories = await historyService.getAll();

    // 全期間の統計
    const totalProblems = allHistories.length;
    const totalCorrect = allHistories.filter(h => h.isCorrect).length;
    const accuracy = totalProblems > 0 ? totalCorrect / totalProblems : 0;

    const startDate =
      allHistories.length > 0
        ? new Date(Math.min(...allHistories.map(h => new Date(h.timestamp).getTime())))
        : null;

    const uniqueDays = new Set(
      allHistories.map(h => {
        const date = new Date(h.timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );
    const studyDays = uniqueDays.size;

    const totalStudyTime = startDate ? await getTotalStudyTime(startDate) : 0;

    // 今週の統計
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() + daysToMonday);
    thisWeekStart.setHours(0, 0, 0, 0);

    const thisWeek = await calculateWeeklyStatistics(thisWeekStart);

    // 今月の統計
    const thisMonth = await calculateMonthlyStatistics(today.getFullYear(), today.getMonth() + 1);

    // トレンド分析
    const accuracyTrend = await analyzeTrend('accuracy', 30);
    const activityTrend = await analyzeTrend('problemCount', 30);

    // パフォーマンス予測
    const prediction = await predictPerformance(7);

    return {
      allTime: {
        totalProblems,
        totalCorrect,
        accuracy,
        totalStudyTime,
        studyDays,
        startDate,
      },
      thisWeek,
      thisMonth,
      trends: {
        accuracy: accuracyTrend,
        activity: activityTrend,
      },
      prediction,
    };
  } catch (error) {
    console.error('[StatisticsAggregator] 統計サマリーの生成に失敗:', error);
    throw error;
  }
}

/**
 * カテゴリー別統計を生成
 */
export async function generateCategoryStatistics(): Promise<CategoryStatistics[]> {
  try {
    console.log('[StatisticsAggregator] カテゴリー別統計を生成中...');

    const allHistories = await historyService.getAll();
    const categoryMap = new Map<
      string,
      { total: number; correct: number; lastStudied: Date; recentCorrect: number; recentTotal: number }
    >();

    for (const history of allHistories) {
      if (!history.category) continue;

      const current = categoryMap.get(history.category) || {
        total: 0,
        correct: 0,
        lastStudied: new Date(0),
        recentCorrect: 0,
        recentTotal: 0,
      };

      current.total++;
      if (history.isCorrect) current.correct++;

      const historyDate = new Date(history.timestamp);
      if (historyDate > current.lastStudied) {
        current.lastStudied = historyDate;
      }

      categoryMap.set(history.category, current);
    }

    // 最近のトレンドを計算（直近20問）
    for (const [category, data] of categoryMap.entries()) {
      const categoryHistories = allHistories
        .filter(h => h.category === category)
        .slice(-20);

      data.recentTotal = categoryHistories.length;
      data.recentCorrect = categoryHistories.filter(h => h.isCorrect).length;
    }

    const result: CategoryStatistics[] = Array.from(categoryMap.entries()).map(
      ([category, data]) => {
        const accuracy = data.total > 0 ? data.correct / data.total : 0;
        const recentAccuracy =
          data.recentTotal > 0 ? data.recentCorrect / data.recentTotal : accuracy;

        let trend: 'improving' | 'stable' | 'declining';
        const diff = recentAccuracy - accuracy;
        if (diff > 0.05) {
          trend = 'improving';
        } else if (diff < -0.05) {
          trend = 'declining';
        } else {
          trend = 'stable';
        }

        return {
          category,
          totalProblems: data.total,
          correctCount: data.correct,
          accuracy,
          averageTimePerProblem: 60, // 仮の値（answerAnalyticsから取得すべき）
          lastStudied: data.lastStudied.getTime() > 0 ? data.lastStudied : null,
          trend,
        };
      }
    );

    console.log(`[StatisticsAggregator] ${result.length}カテゴリーの統計を生成しました`);
    return result;
  } catch (error) {
    console.error('[StatisticsAggregator] カテゴリー別統計の生成に失敗:', error);
    throw error;
  }
}

/**
 * エクスポート用統計データを生成
 */
export async function generateExportStatistics(): Promise<ExportStatistics> {
  try {
    console.log('[StatisticsAggregator] エクスポート用統計を生成中...');

    const summary = await generateStatisticsSummary();
    const categoryStats = await generateCategoryStatistics();

    // 全履歴の日次統計
    const dailyHistory: DailyStatistics[] = [];
    const today = new Date();
    const startDate = summary.allTime.startDate || today;
    const daysDiff = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (let i = 0; i <= Math.min(daysDiff, 365); i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const stats = await calculateDailyStatistics(date);
      if (stats.problemsSolved > 0) {
        dailyHistory.push(stats);
      }
    }

    // 目標と弱点データ
    const goals = await getAllGoals();
    const weaknesses = await detectTopWeaknesses();

    return {
      exportDate: new Date(),
      summary,
      dailyHistory,
      categoryStats,
      goals,
      weaknesses,
    };
  } catch (error) {
    console.error('[StatisticsAggregator] エクスポート統計の生成に失敗:', error);
    throw error;
  }
}
