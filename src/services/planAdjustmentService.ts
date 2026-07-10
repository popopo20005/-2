/**
 * PlanAdjustmentService - ACTフェーズ自動プラン調整サービス
 *
 * 7つのトリガー条件を評価し、学習プランの自動調整を行う。
 * - pending: ユーザー承認待ち（トリガー1,2,3,6）
 * - auto_applied: 即座に適用（トリガー4,5,7）
 */

import { studyPlanService, dailyGoalService, planAdjustmentService } from '../lib/database';
import { recalculatePlanProgress } from './studyPlanGenerator';
import { calculateCategoryStats } from './weaknessDetectionService';
import type { StudyPlan, PlanAdjustmentRecord, AdjustmentTrigger } from '../types/studyPlan';

// ============================================================
// 定数
// ============================================================

/** 達成率の閾値（トリガー1） */
const LOW_ACHIEVEMENT_THRESHOLD = 0.5;
/** 達成率チェック期間（週数）（トリガー1） */
const LOW_ACHIEVEMENT_WEEKS = 2;

/** 正答率チェック期間（週数）（トリガー2） */
const LOW_ACCURACY_WEEKS = 3;

/** 試験前の重要期間（日）（トリガー3,4） */
const EXAM_90_DAYS = 90;
const EXAM_30_DAYS = 30;

/** 未学習連続日数（トリガー5） */
const NO_STUDY_DAYS = 3;

/** カテゴリーマスター正答率（トリガー6） */
const MASTERED_ACCURACY = 0.9;
/** マスター判定期間（週数）（トリガー6） */
const MASTERED_WEEKS = 3;

// ============================================================
// メイン評価関数
// ============================================================

/**
 * アクティブなプランに対して全トリガーを評価
 */
export async function evaluateAllTriggers(plan: StudyPlan): Promise<PlanAdjustmentRecord[]> {
  if (!plan.id || !plan.isActive || plan.isCompleted || plan.isPaused) return [];

  const records: PlanAdjustmentRecord[] = [];

  // 進捗を最新化
  const progress = await recalculatePlanProgress(plan.id);
  if (!progress) return [];

  // 各トリガーを評価
  const checks = [
    checkLowAchievement(plan, progress),
    checkLowAccuracy(plan, progress),
    checkExam90Days(plan, progress),
    checkExam30Days(plan, progress),
    checkNoStudyStreak(plan),
    checkMasteredCategory(plan, progress),
  ];

  const results = await Promise.all(checks);
  for (const result of results) {
    if (result) records.push(result);
  }

  return records;
}

// ============================================================
// トリガー1: 達成率<50% 2週連続
// ============================================================

async function checkLowAchievement(
  plan: StudyPlan,
  progress: StudyPlan['progress']
): Promise<PlanAdjustmentRecord | null> {
  if (!plan.id) return null;

  // 重複チェック
  if (await planAdjustmentService.hasPendingTrigger(plan.id, 'low_achievement')) return null;

  const weeklyStats = progress.weeklyStats;
  if (weeklyStats.length < LOW_ACHIEVEMENT_WEEKS) return null;

  // 直近2週の達成率チェック
  const recentWeeks = weeklyStats.slice(-LOW_ACHIEVEMENT_WEEKS);
  const allLow = recentWeeks.every(week => {
    const studyDaysInWeek = plan.studyDaysOfWeek.length || 5;
    const achievementRate = week.completedDays / studyDaysInWeek;
    return achievementRate < LOW_ACHIEVEMENT_THRESHOLD;
  });

  if (!allLow) return null;

  const currentProblemsPerDay = plan.problemsPerDay || 10;
  const newProblemsPerDay = Math.max(5, Math.round(currentProblemsPerDay * 0.8));

  const record: Omit<PlanAdjustmentRecord, 'id'> = {
    planId: plan.id,
    trigger: 'low_achievement',
    status: 'pending',
    title: '達成率が低下しています',
    description: `直近${LOW_ACHIEVEMENT_WEEKS}週間の達成率が${Math.round(LOW_ACHIEVEMENT_THRESHOLD * 100)}%未満です。1日の問題数を${currentProblemsPerDay}問から${newProblemsPerDay}問に削減することを提案します。`,
    changes: [{
      field: 'problemsPerDay',
      oldValue: currentProblemsPerDay,
      newValue: newProblemsPerDay,
    }],
    createdAt: new Date(),
  };

  const id = await planAdjustmentService.add(record);
  return { ...record, id };
}

// ============================================================
// トリガー2: 正答率が目標未達 3週連続
// ============================================================

async function checkLowAccuracy(
  plan: StudyPlan,
  progress: StudyPlan['progress']
): Promise<PlanAdjustmentRecord | null> {
  if (!plan.id || !plan.targetScore) return null;
  if (await planAdjustmentService.hasPendingTrigger(plan.id, 'low_accuracy')) return null;

  const weeklyStats = progress.weeklyStats;
  if (weeklyStats.length < LOW_ACCURACY_WEEKS) return null;

  const recentWeeks = weeklyStats.slice(-LOW_ACCURACY_WEEKS);
  const allBelowTarget = recentWeeks.every(week =>
    week.accuracy > 0 && week.accuracy < plan.targetScore!
  );

  if (!allBelowTarget) return null;

  const avgAccuracy = recentWeeks.reduce((sum, w) => sum + w.accuracy, 0) / recentWeeks.length;

  const record: Omit<PlanAdjustmentRecord, 'id'> = {
    planId: plan.id,
    trigger: 'low_accuracy',
    status: 'pending',
    title: '正答率が目標を下回っています',
    description: `直近${LOW_ACCURACY_WEEKS}週間の正答率(${avgAccuracy.toFixed(1)}%)が目標(${plan.targetScore}%)を下回っています。弱点強化モードに切り替えることを提案します。`,
    changes: [
      {
        field: 'studyMode',
        oldValue: plan.studyMode,
        newValue: 'weakness-focused',
      },
      {
        field: 'prioritizeWeakness',
        oldValue: plan.prioritizeWeakness,
        newValue: true,
      },
    ],
    createdAt: new Date(),
  };

  const id = await planAdjustmentService.add(record);
  return { ...record, id };
}

// ============================================================
// トリガー3: 試験90日前 → 頻出重視
// ============================================================

async function checkExam90Days(
  plan: StudyPlan,
  progress: StudyPlan['progress']
): Promise<PlanAdjustmentRecord | null> {
  if (!plan.id) return null;
  if (await planAdjustmentService.hasPendingTrigger(plan.id, 'exam_90days')) return null;

  const remainingDays = progress.remainingDays;
  if (remainingDays > EXAM_90_DAYS || remainingDays <= EXAM_30_DAYS) return null;

  // analyzedモード以外の場合のみ提案
  if (plan.importanceMode === 'analyzed') return null;

  const record: Omit<PlanAdjustmentRecord, 'id'> = {
    planId: plan.id,
    trigger: 'exam_90days',
    status: 'pending',
    title: '試験まで90日以内です',
    description: `試験まで残り${remainingDays}日です。過去問分析データに基づく重要度配分に切り替えて、頻出分野を重点的に学習することを提案します。`,
    changes: [{
      field: 'importanceMode',
      oldValue: plan.importanceMode || 'uniform',
      newValue: 'analyzed',
    }],
    createdAt: new Date(),
  };

  const id = await planAdjustmentService.add(record);
  return { ...record, id };
}

// ============================================================
// トリガー4: 試験30日前 → 復習のみ（自動適用）
// ============================================================

async function checkExam30Days(
  plan: StudyPlan,
  progress: StudyPlan['progress']
): Promise<PlanAdjustmentRecord | null> {
  if (!plan.id) return null;
  if (await planAdjustmentService.hasPendingTrigger(plan.id, 'exam_30days')) return null;

  const remainingDays = progress.remainingDays;
  if (remainingDays > EXAM_30_DAYS) return null;

  // 既にreview-onlyなら不要
  if (plan.studyMode === 'review-only') return null;

  const record: Omit<PlanAdjustmentRecord, 'id'> = {
    planId: plan.id,
    trigger: 'exam_30days',
    status: 'auto_applied',
    title: '試験直前：復習モードに自動切替',
    description: `試験まで残り${remainingDays}日のため、新規問題の学習を停止し復習モードに自動切替しました。`,
    changes: [{
      field: 'studyMode',
      oldValue: plan.studyMode,
      newValue: 'review-only',
    }],
    createdAt: new Date(),
    resolvedAt: new Date(),
  };

  // 自動適用
  await studyPlanService.update(plan.id, { studyMode: 'review-only' });
  const id = await planAdjustmentService.add(record);
  return { ...record, id };
}

// ============================================================
// トリガー5: 3日以上未学習（自動適用）
// ============================================================

async function checkNoStudyStreak(
  plan: StudyPlan
): Promise<PlanAdjustmentRecord | null> {
  if (!plan.id) return null;
  if (await planAdjustmentService.hasPendingTrigger(plan.id, 'no_study_streak')) return null;

  const goals = await dailyGoalService.getByPlanId(plan.id);
  if (goals.length === 0) return null;

  // 直近NO_STUDY_DAYS日間の目標をチェック
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentGoals: typeof goals = [];
  for (let i = 1; i <= NO_STUDY_DAYS; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dayStart = checkDate.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const dayGoal = goals.find(g => {
      const gDate = new Date(g.date).getTime();
      return gDate >= dayStart && gDate < dayEnd && g.isStudyDay;
    });

    if (dayGoal) recentGoals.push(dayGoal);
  }

  // 学習日が3日未満ならチェック対象外
  if (recentGoals.length < NO_STUDY_DAYS) return null;

  // 全て未完了かチェック
  const allIncomplete = recentGoals.every(g => !g.isCompleted);
  if (!allIncomplete) return null;

  // 明日の目標を50%削減
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = tomorrow.getTime();
  const tomorrowEnd = tomorrowStart + 24 * 60 * 60 * 1000;

  const tomorrowGoal = goals.find(g => {
    const gDate = new Date(g.date).getTime();
    return gDate >= tomorrowStart && gDate < tomorrowEnd;
  });

  if (!tomorrowGoal || !tomorrowGoal.id) return null;

  const newTarget = Math.max(3, Math.round(tomorrowGoal.totalProblemsTarget * 0.5));

  const record: Omit<PlanAdjustmentRecord, 'id'> = {
    planId: plan.id,
    trigger: 'no_study_streak',
    status: 'auto_applied',
    title: '未学習期間の調整',
    description: `${NO_STUDY_DAYS}日連続で未学習のため、翌日の問題数を${tomorrowGoal.totalProblemsTarget}問から${newTarget}問に自動削減しました。`,
    changes: [{
      field: 'totalProblemsTarget',
      oldValue: tomorrowGoal.totalProblemsTarget,
      newValue: newTarget,
    }],
    createdAt: new Date(),
    resolvedAt: new Date(),
  };

  // 自動適用：翌日のDailyGoal更新
  await dailyGoalService.update(tomorrowGoal.id, {
    totalProblemsTarget: newTarget,
    newProblemsTarget: Math.round(newTarget * (plan.newToReviewRatio || 0.5)),
    reviewProblemsTarget: newTarget - Math.round(newTarget * (plan.newToReviewRatio || 0.5)),
  });

  const id = await planAdjustmentService.add(record);
  return { ...record, id };
}

// ============================================================
// トリガー6: カテゴリー正答率>90% 3週連続
// ============================================================

async function checkMasteredCategory(
  plan: StudyPlan,
  progress: StudyPlan['progress']
): Promise<PlanAdjustmentRecord | null> {
  if (!plan.id) return null;
  if (await planAdjustmentService.hasPendingTrigger(plan.id, 'mastered_category')) return null;

  const weeklyStats = progress.weeklyStats;
  if (weeklyStats.length < MASTERED_WEEKS) return null;

  // カテゴリー別の正答率を取得
  const categoryStats = await calculateCategoryStats();
  const masteredCategories: string[] = [];

  for (const stat of categoryStats) {
    if (stat.accuracy >= MASTERED_ACCURACY && stat.totalAttempts >= 20) {
      masteredCategories.push(stat.category);
    }
  }

  if (masteredCategories.length === 0) return null;

  // プラン対象カテゴリーとの交差
  const targetMastered = masteredCategories.filter(
    c => plan.targetCategories.includes(c)
  );

  if (targetMastered.length === 0) return null;

  const record: Omit<PlanAdjustmentRecord, 'id'> = {
    planId: plan.id,
    trigger: 'mastered_category',
    status: 'pending',
    title: `カテゴリーをマスターしました`,
    description: `「${targetMastered.join('」「')}」の正答率が${Math.round(MASTERED_ACCURACY * 100)}%を超えました。問題数を30%削減し、他カテゴリーに再配分することを提案します。`,
    changes: targetMastered.map(cat => ({
      field: `category:${cat}:reduction`,
      oldValue: 100,
      newValue: 70,
    })),
    createdAt: new Date(),
  };

  const id = await planAdjustmentService.add(record);
  return { ...record, id };
}

// ============================================================
// 調整適用
// ============================================================

/**
 * 承認された調整をプランに適用
 */
export async function applyAdjustment(recordId: number): Promise<boolean> {
  const records = await planAdjustmentService.getAllPending();
  const record = records.find(r => r.id === recordId);
  if (!record) return false;

  const plan = await studyPlanService.getById(record.planId);
  if (!plan || !plan.id) return false;

  // changes を適用
  const updates: Partial<StudyPlan> = {};

  for (const change of record.changes) {
    switch (change.field) {
      case 'problemsPerDay':
        updates.problemsPerDay = change.newValue;
        break;
      case 'studyMode':
        updates.studyMode = change.newValue;
        break;
      case 'prioritizeWeakness':
        updates.prioritizeWeakness = change.newValue;
        break;
      case 'importanceMode':
        updates.importanceMode = change.newValue;
        break;
    }
  }

  if (Object.keys(updates).length > 0) {
    await studyPlanService.update(plan.id, updates);
  }

  await planAdjustmentService.updateStatus(recordId, 'approved');
  return true;
}

/**
 * 調整を却下
 */
export async function rejectAdjustment(recordId: number): Promise<void> {
  await planAdjustmentService.updateStatus(recordId, 'rejected');
}

/**
 * トリガーのアイコンを取得
 */
export function getTriggerIcon(trigger: AdjustmentTrigger): string {
  switch (trigger) {
    case 'low_achievement': return '\u{1F4C9}'; // 📉
    case 'low_accuracy': return '\u{1F3AF}'; // 🎯
    case 'exam_90days': return '\u{1F4C5}'; // 📅
    case 'exam_30days': return '\u{26A0}'; // ⚠
    case 'no_study_streak': return '\u{1F4A4}'; // 💤
    case 'mastered_category': return '\u{1F451}'; // 👑
    case 'exam_date_changed': return '\u{1F504}'; // 🔄
    case 'quiz_complete': return '\u{2705}'; // ✅
    case 'weekly_rebalance': return '\u{1F4CA}'; // 📊
    case 'manual_rebalance': return '\u{1F527}'; // 🔧
    default: return '\u{2699}'; // ⚙
  }
}
