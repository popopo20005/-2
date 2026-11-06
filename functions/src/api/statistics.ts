/**
 * Statistics API - 学習統計集計（読み取り専用）
 *
 * エンドポイント:
 *   GET /apiGetStatistics   — 日次/週次/月次の学習統計
 *   GET /apiGetCategoryStats — カテゴリ別正答率・問題数
 */

import * as functions from 'firebase-functions/v2';
import {
  db,
  createHandler,
  sendSuccess,
  sendError,
} from './middleware';
import {
  ApiDailyStatistics,
  ApiWeeklyStatistics,
  ApiMonthlyStatistics,
  StatisticsSummary,
  CategoryStat,
} from './types';

// ============================================================
// GET /apiGetStatistics
// ============================================================

export const apiGetStatistics = functions.https.onRequest(
  { cors: false, timeoutSeconds: 60 },
  createHandler({ methods: ['GET'], rateLimit: 60 }, async (req, res, uid) => {
    const period = (req.query.period as string) || 'weekly';
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (!['daily', 'weekly', 'monthly', 'all'].includes(period)) {
      sendError(res, 400, 'period must be daily, weekly, monthly, or all', 'VALIDATION_ERROR');
      return;
    }

    // Historyコレクションからデータ取得
    let query = db.collection(`users/${uid}/history`)
      .orderBy('timestamp', 'asc');

    if (from) {
      query = query.where('timestamp', '>=', from);
    }
    if (to) {
      query = query.where('timestamp', '<=', to);
    }

    const snapshot = await query.get();

    // 日次集計
    const dailyMap = new Map<string, {
      problemsSolved: number;
      correctCount: number;
      studyTime: number;
      categories: Set<string>;
    }>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp as string;
      if (!timestamp) return;

      const dateKey = toJstDate(timestamp);
      const entry = dailyMap.get(dateKey) || {
        problemsSolved: 0,
        correctCount: 0,
        studyTime: 0,
        categories: new Set<string>(),
      };

      entry.problemsSolved++;
      if (data.isCorrect) entry.correctCount++;
      if (data.responseTime) entry.studyTime += (data.responseTime as number) / 1000;
      if (data.category) entry.categories.add(data.category as string);

      dailyMap.set(dateKey, entry);
    });

    // 日次データを配列に変換
    const dailyStats: ApiDailyStatistics[] = [];
    dailyMap.forEach((value, date) => {
      dailyStats.push({
        date,
        problemsSolved: value.problemsSolved,
        correctCount: value.correctCount,
        accuracy: value.problemsSolved > 0 ? value.correctCount / value.problemsSolved : 0,
        studyTime: Math.round(value.studyTime),
        categories: [...value.categories],
      });
    });

    // サマリー計算
    const summary: StatisticsSummary = {
      totalProblems: dailyStats.reduce((sum, d) => sum + d.problemsSolved, 0),
      totalCorrect: dailyStats.reduce((sum, d) => sum + d.correctCount, 0),
      accuracy: 0,
      totalStudyTime: dailyStats.reduce((sum, d) => sum + d.studyTime, 0),
      studyDays: dailyStats.length,
    };
    summary.accuracy = summary.totalProblems > 0
      ? summary.totalCorrect / summary.totalProblems
      : 0;

    const result: Record<string, unknown> = { summary };

    if (period === 'daily' || period === 'all') {
      result.daily = dailyStats;
    }

    if (period === 'weekly' || period === 'all') {
      result.weekly = aggregateWeekly(dailyStats);
    }

    if (period === 'monthly' || period === 'all') {
      result.monthly = aggregateMonthly(dailyStats);
    }

    sendSuccess(res, result);
  })
);

// ============================================================
// GET /apiGetCategoryStats
// ============================================================

export const apiGetCategoryStats = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['GET'], rateLimit: 60 }, async (_req, res, uid) => {
    const snapshot = await db.collection(`users/${uid}/history`).get();

    const categoryMap = new Map<string, {
      totalProblems: number;
      correctCount: number;
      lastStudied: string | null;
    }>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const category = data.category as string;
      if (!category) return;

      const entry = categoryMap.get(category) || {
        totalProblems: 0,
        correctCount: 0,
        lastStudied: null,
      };

      entry.totalProblems++;
      if (data.isCorrect) entry.correctCount++;

      const timestamp = data.timestamp as string;
      if (timestamp && (!entry.lastStudied || timestamp > entry.lastStudied)) {
        entry.lastStudied = timestamp;
      }

      categoryMap.set(category, entry);
    });

    const categories: CategoryStat[] = [];
    categoryMap.forEach((value, category) => {
      categories.push({
        category,
        totalProblems: value.totalProblems,
        correctCount: value.correctCount,
        accuracy: value.totalProblems > 0 ? value.correctCount / value.totalProblems : 0,
        lastStudied: value.lastStudied,
      });
    });

    // 正答率の低い順にソート（弱点優先）
    categories.sort((a, b) => a.accuracy - b.accuracy);

    sendSuccess(res, { categories });
  })
);

// ============================================================
// ヘルパー
// ============================================================

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 解答時刻（UTCのISO文字列）を日本時間の日付にする。朝9時前の解答が前日に入るのを防ぐ */
function toJstDate(timestamp: string): string {
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return timestamp.substring(0, 10);
  return new Date(time + JST_OFFSET_MS).toISOString().substring(0, 10);
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(date);
  monday.setDate(diff);
  return monday.toISOString().substring(0, 10);
}

function aggregateWeekly(dailyStats: ApiDailyStatistics[]): ApiWeeklyStatistics[] {
  const weeklyMap = new Map<string, ApiDailyStatistics[]>();

  for (const day of dailyStats) {
    const weekStart = getWeekStart(day.date);
    const week = weeklyMap.get(weekStart) || [];
    week.push(day);
    weeklyMap.set(weekStart, week);
  }

  const result: ApiWeeklyStatistics[] = [];
  weeklyMap.forEach((days, weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const totalProblems = days.reduce((s, d) => s + d.problemsSolved, 0);
    const totalCorrect = days.reduce((s, d) => s + d.correctCount, 0);

    result.push({
      weekStart,
      weekEnd: weekEnd.toISOString().substring(0, 10),
      totalProblems,
      totalCorrect,
      averageAccuracy: totalProblems > 0 ? totalCorrect / totalProblems : 0,
      totalStudyTime: days.reduce((s, d) => s + d.studyTime, 0),
      studyDays: days.length,
      dailyStats: days,
    });
  });

  return result.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function aggregateMonthly(dailyStats: ApiDailyStatistics[]): ApiMonthlyStatistics[] {
  const monthlyMap = new Map<string, ApiDailyStatistics[]>();

  for (const day of dailyStats) {
    const monthKey = day.date.substring(0, 7); // YYYY-MM
    const month = monthlyMap.get(monthKey) || [];
    month.push(day);
    monthlyMap.set(monthKey, month);
  }

  const result: ApiMonthlyStatistics[] = [];
  monthlyMap.forEach((days, monthKey) => {
    const [yearStr, monthStr] = monthKey.split('-');
    const totalProblems = days.reduce((s, d) => s + d.problemsSolved, 0);
    const totalCorrect = days.reduce((s, d) => s + d.correctCount, 0);

    result.push({
      year: parseInt(yearStr, 10),
      month: parseInt(monthStr, 10),
      totalProblems,
      totalCorrect,
      averageAccuracy: totalProblems > 0 ? totalCorrect / totalProblems : 0,
      totalStudyTime: days.reduce((s, d) => s + d.studyTime, 0),
      studyDays: days.length,
    });
  });

  return result.sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));
}
