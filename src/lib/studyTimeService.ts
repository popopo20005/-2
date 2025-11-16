/**
 * 学習時間トラッキングサービス
 * セッションの開始・一時停止・再開・終了を管理
 */

import { db } from './database';
import type { StudyTimeSession } from '../types';

/**
 * セッション管理用の内部状態
 */
interface ActiveSession {
  id: number;
  startTime: Date;
  pauseStartTime?: Date;
  totalPausedDuration: number; // 秒
}

// アクティブセッションのメモリキャッシュ
let activeSession: ActiveSession | null = null;

/**
 * 新しい学習セッションを開始
 */
export async function startSession(
  sessionType: 'quiz' | 'review' | 'spacedRepetition' | 'practice',
  quizSetId?: number,
  category?: string
): Promise<number> {
  // 既存のアクティブセッションがある場合は自動終了
  if (activeSession) {
    await endSession(activeSession.id, 0, 0);
  }

  const now = new Date();
  const sessionId = await db.studyTimeSessions.add({
    startTime: now,
    duration: 0,
    problemCount: 0,
    correctCount: 0,
    quizSetId,
    category,
    sessionType,
    isPaused: false,
    pausedDuration: 0,
    createdAt: now,
  });

  activeSession = {
    id: sessionId,
    startTime: now,
    totalPausedDuration: 0,
  };

  return sessionId;
}

/**
 * セッションを一時停止
 */
export async function pauseSession(sessionId: number): Promise<void> {
  if (!activeSession || activeSession.id !== sessionId) {
    throw new Error('No active session to pause');
  }

  if (activeSession.pauseStartTime) {
    throw new Error('Session is already paused');
  }

  activeSession.pauseStartTime = new Date();

  await db.studyTimeSessions.update(sessionId, {
    isPaused: true,
  });
}

/**
 * 一時停止中のセッションを再開
 */
export async function resumeSession(sessionId: number): Promise<void> {
  if (!activeSession || activeSession.id !== sessionId) {
    throw new Error('No active session to resume');
  }

  if (!activeSession.pauseStartTime) {
    throw new Error('Session is not paused');
  }

  const now = new Date();
  const pausedTime = Math.floor((now.getTime() - activeSession.pauseStartTime.getTime()) / 1000);
  activeSession.totalPausedDuration += pausedTime;
  activeSession.pauseStartTime = undefined;

  await db.studyTimeSessions.update(sessionId, {
    isPaused: false,
    pausedDuration: activeSession.totalPausedDuration,
  });
}

/**
 * セッションを終了して保存
 */
export async function endSession(
  sessionId: number,
  problemCount: number,
  correctCount: number
): Promise<void> {
  if (!activeSession || activeSession.id !== sessionId) {
    throw new Error('No active session to end');
  }

  // 一時停止中の場合は自動的に再開扱い
  if (activeSession.pauseStartTime) {
    const now = new Date();
    const pausedTime = Math.floor((now.getTime() - activeSession.pauseStartTime.getTime()) / 1000);
    activeSession.totalPausedDuration += pausedTime;
  }

  const endTime = new Date();
  const totalDuration = Math.floor((endTime.getTime() - activeSession.startTime.getTime()) / 1000);
  const actualDuration = totalDuration - activeSession.totalPausedDuration;

  await db.studyTimeSessions.update(sessionId, {
    endTime,
    duration: actualDuration,
    problemCount,
    correctCount,
    isPaused: false,
    pausedDuration: activeSession.totalPausedDuration,
  });

  activeSession = null;
}

/**
 * アクティブセッションの情報を取得
 */
export function getActiveSession(): ActiveSession | null {
  return activeSession;
}

/**
 * 今日の合計学習時間を取得（秒）
 */
export async function getTodayStudyTime(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sessions = await db.studyTimeSessions
    .where('startTime')
    .between(today, tomorrow, true, false)
    .toArray();

  return sessions.reduce((total, session) => total + session.duration, 0);
}

/**
 * 今週の学習時間を取得（曜日別）
 */
export async function getWeeklyStudyTime(): Promise<{
  dayOfWeek: number; // 0=日曜, 6=土曜
  date: Date;
  duration: number; // 秒
}[]> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const sessions = await db.studyTimeSessions
    .where('startTime')
    .between(weekStart, weekEnd, true, false)
    .toArray();

  // 曜日ごとに集計
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return {
      dayOfWeek: i,
      date,
      duration: 0,
    };
  });

  sessions.forEach((session) => {
    const sessionDate = new Date(session.startTime);
    const dayIndex = sessionDate.getDay();
    dailyData[dayIndex].duration += session.duration;
  });

  return dailyData;
}

/**
 * 指定期間のセッションを取得
 */
export async function getSessionsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<StudyTimeSession[]> {
  return await db.studyTimeSessions
    .where('startTime')
    .between(startDate, endDate, true, true)
    .toArray();
}

/**
 * セッションタイプ別の統計を取得
 */
export async function getSessionTypeStatistics(
  startDate: Date,
  endDate: Date
): Promise<{
  sessionType: string;
  totalDuration: number; // 秒
  sessionCount: number;
  avgDuration: number; // 秒
}[]> {
  const sessions = await getSessionsByDateRange(startDate, endDate);

  const stats = new Map<
    string,
    { totalDuration: number; sessionCount: number }
  >();

  sessions.forEach((session) => {
    const existing = stats.get(session.sessionType) || {
      totalDuration: 0,
      sessionCount: 0,
    };
    stats.set(session.sessionType, {
      totalDuration: existing.totalDuration + session.duration,
      sessionCount: existing.sessionCount + 1,
    });
  });

  return Array.from(stats.entries()).map(([sessionType, data]) => ({
    sessionType,
    totalDuration: data.totalDuration,
    sessionCount: data.sessionCount,
    avgDuration: Math.floor(data.totalDuration / data.sessionCount),
  }));
}

/**
 * カテゴリ別の学習時間を取得
 */
export async function getCategoryStudyTime(
  startDate: Date,
  endDate: Date
): Promise<{
  category: string;
  duration: number; // 秒
  sessionCount: number;
}[]> {
  const sessions = await getSessionsByDateRange(startDate, endDate);

  const stats = new Map<
    string,
    { duration: number; sessionCount: number }
  >();

  sessions.forEach((session) => {
    if (!session.category) return;
    const existing = stats.get(session.category) || {
      duration: 0,
      sessionCount: 0,
    };
    stats.set(session.category, {
      duration: existing.duration + session.duration,
      sessionCount: existing.sessionCount + 1,
    });
  });

  return Array.from(stats.entries()).map(([category, data]) => ({
    category,
    duration: data.duration,
    sessionCount: data.sessionCount,
  }));
}

/**
 * 学習時間を人間が読みやすい形式に変換
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}分`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${remainingMinutes}分`;
}
