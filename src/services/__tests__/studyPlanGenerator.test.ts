/**
 * studyPlanGenerator.ts Unit Tests
 *
 * getTodayTasksDetailed()関数のテストケース
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTodayTasksDetailed } from '../studyPlanGenerator';
import { db } from '../../lib/database';
import type { StudyPlan, DailyGoal } from '../../types/studyPlan';
import type { SpacedRepetitionCard } from '../../types';

// モック用のヘルパー関数
async function clearDatabase() {
  await db.studyPlans.clear();
  await db.dailyGoals.clear();
  await db.spacedRepetitionCards.clear();
}

async function createMockPlan(data: Partial<StudyPlan> = {}): Promise<number> {
  const today = new Date();
  const examDate = new Date(today);
  examDate.setDate(examDate.getDate() + 30);

  const plan: StudyPlan = {
    name: 'テストプラン',
    examDate,
    examType: 'other',
    targetScore: 80,
    currentLevel: 3,
    targetCategories: [],
    availableTimePerDay: 60,
    studyDaysOfWeek: [1, 2, 3, 4, 5], // 月-金
    studyMode: 'balanced',
    newToReviewRatio: 0.6,
    prioritizeWeakness: false,
    totalProblemsTarget: 500,
    dailyGoalIds: [],
    progress: {
      totalDays: 30,
      elapsedDays: 1,
      remainingDays: 29,
      completedDays: 0,
      totalProblemsTarget: 500,
      completedProblems: 0,
      remainingProblems: 500,
      progressPercentage: 0,
      averageAccuracy: 0,
      averageDailyProblems: 0,
      averageStudyTime: 0,
      projectedCompletionDate: examDate,
      projectedScore: 0,
      daysAheadOrBehind: 0,
      riskLevel: 'low',
      onTrack: true,
      riskFactors: [],
      weeklyStats: [],
    },
    linkedGoalIds: [],
    includeSpacedRepetition: true,
    isActive: true,
    isCompleted: false,
    createdAt: today,
    updatedAt: today,
    linkedQuizSetIds: [],
    ...data,
  } as StudyPlan;

  return await db.studyPlans.add(plan);
}

async function createMockDailyGoal(
  planId: number,
  data: Partial<DailyGoal> = {}
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const goal: DailyGoal = {
    planId,
    date: today,
    dayNumber: 1,
    isStudyDay: true,
    newProblemsTarget: 15,
    reviewProblemsTarget: 8,
    totalProblemsTarget: 23,
    categories: [
      { name: '公衆栄養学', problemCount: 8, priority: 5, reason: '弱点強化' },
      { name: '臨床栄養学', problemCount: 7, priority: 3, reason: '均等強化' },
      { name: '基礎栄養学', problemCount: 8, priority: 2, reason: '均等強化' },
    ],
    estimatedTime: 69,
    isCompleted: false,
    actualNewProblems: 0,
    actualReviewProblems: 0,
    createdAt: today,
    updatedAt: today,
    ...data,
  };

  return await db.dailyGoals.add(goal);
}

async function createMockSM2Card(
  isDue: boolean = true,
  data: Partial<SpacedRepetitionCard> = {}
): Promise<number> {
  const today = new Date();
  const nextReviewDate = new Date(today);
  if (isDue) {
    nextReviewDate.setDate(nextReviewDate.getDate() - 1); // 昨日期限
  } else {
    nextReviewDate.setDate(nextReviewDate.getDate() + 1); // 明日期限
  }

  const card: SpacedRepetitionCard = {
    problemId: Math.floor(Math.random() * 10000),
    quizSetId: 1,
    name: 'テスト問題',
    category: '公衆栄養学',
    easinessFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate,
    isDue,
    isNew: false,
    lastReviewDate: new Date(),
    totalReviews: 0,
    correctReviews: 0,
    accuracy: 0,
    isLearning: false,
    createdAt: new Date(),
    ...data,
  } as SpacedRepetitionCard;

  return await db.spacedRepetitionCards.add(card);
}

// ============================================================
// テストスイート
// ============================================================

describe('getTodayTasksDetailed', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  // ============================================================
  // Test Case 1: アクティブなプランがない場合
  // ============================================================
  it('should return empty tasks when no active plans', async () => {
    const result = await getTodayTasksDetailed();

    expect(result.goals).toHaveLength(0);
    expect(result.totalProblems).toBe(0);
    expect(result.estimatedTime).toBe(0);
    expect(result.planNames.size).toBe(0);
    expect(result.categoryBreakdown.size).toBe(0);
    expect(result.urgencyLevel).toBe('low');
    expect(result.multiplePlans).toBe(false);
    expect(result.todayStudyDayCount).toBe(0);
  });

  // ============================================================
  // Test Case 2: 単一プランの基本ケース
  // ============================================================
  it('should return correct data for single plan with today goal', async () => {
    const planId = await createMockPlan({ name: '臨床栄養学 期末試験対策' });
    await createMockDailyGoal(planId);

    const result = await getTodayTasksDetailed();

    expect(result.goals).toHaveLength(1);
    expect(result.totalProblems).toBe(23);
    expect(result.estimatedTime).toBe(69);
    expect(result.planNames.get(planId)).toBe('臨床栄養学 期末試験対策');
    expect(result.multiplePlans).toBe(false);
    expect(result.todayStudyDayCount).toBe(1);
  });

  // ============================================================
  // Test Case 3: 緊急度判定 - high
  // ============================================================
  it('should calculate urgency level correctly - high (many problems)', async () => {
    const planId = await createMockPlan();
    await createMockDailyGoal(planId, {
      newProblemsTarget: 40,
      reviewProblemsTarget: 15,
      totalProblemsTarget: 55,
      estimatedTime: 165,
    });

    const result = await getTodayTasksDetailed();

    expect(result.urgencyLevel).toBe('high');
    expect(result.totalProblems).toBe(55);
  });

  it('should calculate urgency level correctly - high (long estimated time)', async () => {
    const planId = await createMockPlan();
    await createMockDailyGoal(planId, {
      newProblemsTarget: 35,
      reviewProblemsTarget: 20,
      totalProblemsTarget: 55,
      estimatedTime: 165, // 2時間45分
    });

    const result = await getTodayTasksDetailed();

    expect(result.urgencyLevel).toBe('high');
    expect(result.estimatedTime).toBe(165);
  });

  it('should calculate urgency level correctly - high (many SM-2 due cards)', async () => {
    const planId = await createMockPlan();
    await createMockDailyGoal(planId);

    // 30枚以上の期限切れカード作成
    for (let i = 0; i < 35; i++) {
      await createMockSM2Card(true);
    }

    const result = await getTodayTasksDetailed();

    expect(result.urgencyLevel).toBe('high');
    expect(result.sm2DueCount).toBeGreaterThanOrEqual(30);
  });

  // ============================================================
  // Test Case 4: 緊急度判定 - medium
  // ============================================================
  it('should calculate urgency level correctly - medium', async () => {
    const planId = await createMockPlan();
    await createMockDailyGoal(planId, {
      newProblemsTarget: 25,
      reviewProblemsTarget: 10,
      totalProblemsTarget: 35,
      estimatedTime: 105,
    });

    const result = await getTodayTasksDetailed();

    expect(result.urgencyLevel).toBe('medium');
    expect(result.totalProblems).toBe(35);
  });

  // ============================================================
  // Test Case 5: 緊急度判定 - low
  // ============================================================
  it('should calculate urgency level correctly - low', async () => {
    const planId = await createMockPlan();
    await createMockDailyGoal(planId, {
      newProblemsTarget: 15,
      reviewProblemsTarget: 8,
      totalProblemsTarget: 23,
      estimatedTime: 69,
    });

    const result = await getTodayTasksDetailed();

    expect(result.urgencyLevel).toBe('low');
  });

  // ============================================================
  // Test Case 6: カテゴリー集計
  // ============================================================
  it('should aggregate categories correctly', async () => {
    const planId = await createMockPlan();
    await createMockDailyGoal(planId, {
      categories: [
        { name: '公衆栄養学', problemCount: 8, priority: 5, reason: '弱点強化' },
        { name: '臨床栄養学', problemCount: 7, priority: 3, reason: '均等強化' },
        { name: '基礎栄養学', problemCount: 4, priority: 2, reason: '均等強化' },
      ],
    });

    const result = await getTodayTasksDetailed();

    expect(result.categoryBreakdown.size).toBe(3);
    expect(result.categoryBreakdown.get('公衆栄養学')).toBe(8);
    expect(result.categoryBreakdown.get('臨床栄養学')).toBe(7);
    expect(result.categoryBreakdown.get('基礎栄養学')).toBe(4);
  });

  // ============================================================
  // Test Case 7: 複数プラン対応
  // ============================================================
  it('should handle multiple plans correctly', async () => {
    const plan1Id = await createMockPlan({ name: 'プラン1' });
    const plan2Id = await createMockPlan({ name: 'プラン2' });

    await createMockDailyGoal(plan1Id, {
      newProblemsTarget: 10,
      totalProblemsTarget: 15,
      estimatedTime: 45,
      categories: [{ name: 'カテゴリA', problemCount: 15, priority: 5, reason: '弱点' }],
    });

    await createMockDailyGoal(plan2Id, {
      newProblemsTarget: 12,
      totalProblemsTarget: 18,
      estimatedTime: 54,
      categories: [{ name: 'カテゴリB', problemCount: 18, priority: 4, reason: '均等' }],
    });

    const result = await getTodayTasksDetailed();

    expect(result.goals).toHaveLength(2);
    expect(result.multiplePlans).toBe(true);
    expect(result.todayStudyDayCount).toBe(2);
    expect(result.totalProblems).toBe(33);
    expect(result.estimatedTime).toBe(99);
    expect(result.planNames.size).toBe(2);
    expect(result.categoryBreakdown.get('カテゴリA')).toBe(15);
    expect(result.categoryBreakdown.get('カテゴリB')).toBe(18);
  });

  // ============================================================
  // Test Case 8: SM-2期限切れカード数の確認
  // ============================================================
  it('should count SM-2 due cards correctly', async () => {
    const planId = await createMockPlan();
    await createMockDailyGoal(planId);

    // 期限切れカード5枚
    for (let i = 0; i < 5; i++) {
      await createMockSM2Card(true);
    }

    // 期限前カード3枚
    for (let i = 0; i < 3; i++) {
      await createMockSM2Card(false);
    }

    const result = await getTodayTasksDetailed();

    expect(result.sm2DueCount).toBe(5);
  });

  // ============================================================
  // Test Case 9: 非アクティブなプランは除外
  // ============================================================
  it('should exclude inactive plans', async () => {
    const activePlanId = await createMockPlan({ name: 'アクティブ', isActive: true });
    const inactivePlanId = await createMockPlan({ name: '非アクティブ', isActive: false });

    await createMockDailyGoal(activePlanId);
    await createMockDailyGoal(inactivePlanId);

    const result = await getTodayTasksDetailed();

    expect(result.goals).toHaveLength(1);
    expect(result.planNames.get(activePlanId)).toBe('アクティブ');
    expect(result.planNames.has(inactivePlanId)).toBe(false);
  });

  // ============================================================
  // Test Case 10: 今日以外の目標は除外
  // ============================================================
  it('should exclude goals not for today', async () => {
    const planId = await createMockPlan();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    await createMockDailyGoal(planId); // 今日の目標
    await createMockDailyGoal(planId, { date: tomorrow }); // 明日の目標

    const result = await getTodayTasksDetailed();

    expect(result.goals).toHaveLength(1);
    expect(result.goals[0].date.toDateString()).toBe(new Date().toDateString());
  });
});
