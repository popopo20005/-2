/**
 * Study Plan Generator - 試験日ベース学習プラン生成アルゴリズム
 *
 * 試験日から逆算し、SM-2スペースドリピティション、弱点分析、
 * 問題推奨エンジンと統合して最適な学習スケジュールを自動生成します。
 *
 * アルゴリズム概要:
 * 1. 試験日までの学習可能日数を計算
 * 2. 現在のパフォーマンスを分析（正答率・弱点）
 * 3. 目標達成に必要な問題数を逆算
 * 4. カテゴリーごとに問題を配分（弱点優先）
 * 5. SM-2復習スケジュールと統合して日次目標を生成
 * 6. リスク評価と調整提案を算出
 */

import type {
  StudyPlan,
  DailyGoal,
  Milestone,
  StudyPlanGenerationParams,
  StudyPlanProgress,
  StudyPlanAdjustmentSuggestion,
  RiskLevel,
  WeaknessInfo,
  TodayTasksDetail,
  TodayRecommendedProblems,
} from '../types/studyPlan';
import { studyPlanService, dailyGoalService, spacedRepetitionService, problemService, milestoneService } from '../lib/database';
import { db } from '../lib/database';
import { detectTopWeaknesses } from './weaknessDetectionService';
import { analyzeUserPerformance, generateRecommendedProblems } from './recommendationEngine';
import {
  buildSubjectsFromCategories,
  calculatePriorityScore,
} from './multiSubjectPlanner';
import type { ImportanceMode, ImportanceLevel, PriorityScoreBreakdown } from '../types/multiSubject';

// ============================================================
// 定数
// ============================================================

/** 正答率1%向上に必要な正答問題の概算値 */
const PROBLEMS_PER_PERCENT_IMPROVEMENT = 15;

/** SM-2復習の1日あたりの最大問題数（オーバーロード防止） */
const MAX_DAILY_REVIEW_PROBLEMS = 30;

/** 1問あたりの平均解答時間（分） */
const AVERAGE_TIME_PER_PROBLEM_MINUTES = 3;

/** リスク判定閾値 - 予定より遅れている日数 */
const RISK_THRESHOLDS = {
  low: 0,       // 計画通り
  medium: 2,    // 2日以上遅延
  high: 5,      // 5日以上遅延
  critical: 10, // 10日以上遅延
};

/** 弱点スコアの閾値（0-100スコアで、この以上が弱点扱い） */
const WEAKNESS_THRESHOLD = 40;

// ============================================================
// ユーティリティ関数
// ============================================================

/**
 * 2つの日付間の日数を計算
 */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diffMs / msPerDay));
}

/**
 * 日付に曜日を加算して次の学習日を求める
 * @param startDate 開始日
 * @param endDate 終了日
 * @param studyDaysOfWeek 学習曜日の配列 [0-6] (0=日)
 * @returns 学習日の日付配列
 */
function getStudyDates(startDate: Date, endDate: Date, studyDaysOfWeek: number[]): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    if (studyDaysOfWeek.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * リスクレベルを判定
 */
function calculateRiskLevel(daysAheadOrBehind: number, progressPercentage: number, remainingDays: number): RiskLevel {
  // 残り日数がなくて目標未達成
  if (remainingDays <= 0 && progressPercentage < 100) return 'critical';

  // ペースによるリスク判定
  if (daysAheadOrBehind >= RISK_THRESHOLDS.critical) return 'critical';
  if (daysAheadOrBehind >= RISK_THRESHOLDS.high) return 'high';
  if (daysAheadOrBehind >= RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * カテゴリーごとの問題数を弱点スコアに基づいて配分
 * 弱点スコアが高いカテゴリーに多い問題を割り当てる
 */
function distributeProblemsAcrossCategories(
  categories: string[],
  weaknesses: WeaknessInfo[],
  totalProblems: number,
  prioritizeWeakness: boolean
): Array<{ name: string; problemCount: number; priority: number; reason: string }> {
  if (categories.length === 0) return [];

  // カテゴリーごとの配分スコアを計算
  const categoryScores = categories.map((cat) => {
    const weakness = weaknesses.find((w) => w.category === cat);
    const weaknessScore = weakness?.weaknessScore ?? 20; // デフォルト
    return {
      name: cat,
      weaknessScore,
      isWeak: weaknessScore >= WEAKNESS_THRESHOLD,
    };
  });

  // スコアの合計
  const totalScore = categoryScores.reduce((sum, c) => sum + Math.max(c.weaknessScore, 1), 0);

  return categoryScores.map((cat) => { // cat has { name: string, weaknessScore, isWeak }
    let problemCount: number;
    let priority: number;
    let reason: string;

    if (prioritizeWeakness && cat.isWeak) {
      // 弱点優先モード: 弱点カテゴリーに多い問題を割り当てる
      const normalizedScore = cat.weaknessScore / totalScore;
      problemCount = Math.max(1, Math.round(totalProblems * normalizedScore * 1.3)); // 1.3倍ブースト
      priority = 5;
      reason = '弱点強化';
    } else if (cat.isWeak) {
      // 弱点だが優先モードでない場合
      const normalizedScore = cat.weaknessScore / totalScore;
      problemCount = Math.max(1, Math.round(totalProblems * normalizedScore));
      priority = 3;
      reason = '弱点改善';
    } else {
      // 通常カテゴリー
      const normalizedScore = Math.max(cat.weaknessScore, 1) / totalScore;
      problemCount = Math.max(1, Math.round(totalProblems * normalizedScore));
      priority = 2;
      reason = '均等強化';
    }

    return { name: cat.name, problemCount, priority, reason };
  });
}

/**
 * Phase 1-3: 優先度スコアベースのカテゴリー配分
 *
 * multiSubjectPlanner の calculatePriorityScore を使って、
 * 残日数・苦手・重要度・未学習量の4係数から問題数を配分する。
 *
 * 優先度スコア = 残日数係数 × 苦手係数 × 重要度係数 × 未学習量係数
 *
 * @param categories 対象カテゴリー名
 * @param totalProblems プラン全体の目標問題総数
 * @param daysUntilExam 試験日までの日数
 * @param importanceMode 重要度設定モード
 * @param options プリセットID / 手動重要度
 * @returns カテゴリー配分（studyPlanGeneratorの既存形式に合わせる）
 */
export async function distributeProblemsByPriorityScore(
  categories: string[],
  totalProblems: number,
  daysUntilExam: number,
  importanceMode: ImportanceMode,
  options: {
    presetId?: string;
    manualWeights?: Record<string, ImportanceLevel | number>;
    presetMapping?: Record<string, string>;
    examId?: string;
  }
): Promise<Array<{ name: string; problemCount: number; priority: number; reason: string }>> {
  if (categories.length === 0) return [];

  // === Step 1: カテゴリーからSubject配列を構築（履歴集計済み） ===
  const subjects = await buildSubjectsFromCategories(categories);

  if (subjects.length === 0) {
    // Subjectを構築できない → 均等配分にフォールバック
    return categories.map((cat) => ({
      name: cat,
      problemCount: Math.max(1, Math.round(totalProblems / categories.length)),
      priority: 3,
      reason: '均等配分',
    }));
  }

  // === Step 2: カスタムプリセットの場合、weightsを事前解決 ===
  let resolvedWeights: Record<string, number> | undefined;
  if (importanceMode === 'preset' && options.presetId?.startsWith('custom_')) {
    const { getPresetWeights } = await import('../lib/presetRegistry');
    resolvedWeights = await getPresetWeights(options.presetId);
  }

  // === Step 2b: analyzed モードの場合、分析データから重みを構築 ===
  let analyzedWeights: Record<string, number> | undefined;
  if (importanceMode === 'analyzed' && options.examId) {
    const { buildAnalyzedWeights } = await import('./multiSubjectPlanner');
    analyzedWeights = await buildAnalyzedWeights(options.examId, categories);
  }

  // === Step 3: 各科目の優先度スコアを算出 ===
  const breakdowns: PriorityScoreBreakdown[] = subjects.map((subject) =>
    calculatePriorityScore(subject, daysUntilExam, importanceMode, {
      presetId: options.presetId,
      manualWeights: options.manualWeights,
      presetMapping: options.presetMapping,
      resolvedWeights,
      analyzedWeights,
    })
  );

  // === Step 3: 合計スコアでtotalProblemsを按分 ===
  // allocateProblemsByScore は "1日あたり" の配分用なので
  // 総問題数ベースで再計算する
  const totalScore = breakdowns.reduce((sum, b) => sum + b.finalScore, 0);

  if (totalScore <= 0) {
    return categories.map((cat) => ({
      name: cat,
      problemCount: Math.max(1, Math.round(totalProblems / categories.length)),
      priority: 3,
      reason: '均等配分',
    }));
  }

  // スコアの高い順にソート
  const sortedBreakdowns = [...breakdowns].sort((a, b) => b.finalScore - a.finalScore);
  const distribution: Array<{ name: string; problemCount: number; priority: number; reason: string }> = [];
  let allocated = 0;

  for (const breakdown of sortedBreakdowns) {
    const subject = subjects.find((s) => s.id === breakdown.subjectId);
    if (!subject) continue;

    const ratio = breakdown.finalScore / totalScore;
    const problemCount = Math.max(1, Math.round(totalProblems * ratio));
    allocated += problemCount;

    // スコア → 優先度（1-5）への変換
    // 最大スコアは ~16 (2×2×2×2)、標準は ~1 前後
    let priority: number;
    if (breakdown.finalScore >= 8) priority = 5;
    else if (breakdown.finalScore >= 4) priority = 4;
    else if (breakdown.finalScore >= 2) priority = 3;
    else if (breakdown.finalScore >= 1) priority = 2;
    else priority = 1;

    // 理由文字列を生成
    const reasons: string[] = [];
    if (breakdown.daysRemainingFactor >= 2.0) reasons.push('試験間近');
    if (breakdown.weaknessFactor >= 2.0) reasons.push('苦手分野');
    else if (breakdown.weaknessFactor >= 1.5) reasons.push('改善余地');
    if (breakdown.importanceFactor >= 1.8) reasons.push('最重要');
    else if (breakdown.importanceFactor >= 1.4) reasons.push('重要');
    if (breakdown.incompleteFactor >= 1.8) reasons.push('未学習');
    else if (breakdown.incompleteFactor >= 1.4) reasons.push('進捗途中');

    distribution.push({
      name: subject.categoryName,
      problemCount,
      priority,
      reason: reasons.length > 0 ? reasons.join('/') : '通常学習',
    });
  }

  // 端数調整: 不足 or 超過分を最高スコアカテゴリーに加減算
  const diff = totalProblems - allocated;
  if (diff !== 0 && distribution.length > 0) {
    distribution[0].problemCount = Math.max(1, distribution[0].problemCount + diff);
  }

  // Subject化できなかったカテゴリー（DBに問題が0件など）を均等配分で補填
  const coveredNames = new Set(distribution.map((d) => d.name));
  for (const cat of categories) {
    if (!coveredNames.has(cat)) {
      distribution.push({
        name: cat,
        problemCount: 1,
        priority: 1,
        reason: '問題データなし',
      });
    }
  }

  return distribution;
}

// ============================================================
// コア アルゴリズム
// ============================================================

/**
 * 目標達成に必要な問題数を計算
 *
 * 正答率の向上には「正答の積み重ね」が必要で、
 * 1%向上あたりに約15問の正答が必要とされる。
 */
function calculateRequiredProblems(
  currentLevel: number,
  targetScore: number,
  totalProblemsInDB: number
): number {
  const requiredImprovement = Math.max(0, targetScore - currentLevel);

  if (requiredImprovement === 0) {
    // 既に目標達成 → 維持のためのリビュー量
    return Math.max(20, Math.floor(totalProblemsInDB * 0.3));
  }

  // 必要な問題数 = 改善率 × 問題あたりの係数
  const rawNeeded = requiredImprovement * PROBLEMS_PER_PERCENT_IMPROVEMENT;

  // ユニーク問題数にキャップ（SM-2が復習タイミングを自動管理するため反復水増し不要）
  return Math.round(Math.min(rawNeeded, totalProblemsInDB));
}

/**
 * SM-2復習スケジュールを取得
 * 各日付に対して、その日に复習すべきカードを計算する
 */
async function getSM2ReviewSchedule(
  startDate: Date,
  endDate: Date,
  targetCategories: string[]
): Promise<Map<string, number>> {
  // dateKey -> 復習問題数のマップ
  const reviewSchedule = new Map<string, number>();

  try {
    // SM-2カードを取得
    let cards = await db.spacedRepetitionCards.toArray();

    // カテゴリーフィルタ
    if (targetCategories.length > 0) {
      cards = cards.filter(
        (c) => !c.category || targetCategories.includes(c.category)
      );
    }

    // 各カードの次の復習日を確認
    for (const card of cards) {
      if (!card.nextReviewDate) continue;

      const reviewDate = new Date(card.nextReviewDate);
      // 期間内の復習のみ対象
      if (reviewDate < startDate || reviewDate > endDate) continue;

      const dateKey = reviewDate.toISOString().split('T')[0];
      const current = reviewSchedule.get(dateKey) || 0;
      reviewSchedule.set(dateKey, Math.min(current + 1, MAX_DAILY_REVIEW_PROBLEMS));
    }
  } catch (e) {
    console.warn('SM-2スケジュール取得エラー:', e);
  }

  return reviewSchedule;
}

/**
 * 日次目標を生成
 *
 * 学習日のリスト、カテゴリー配分、SM-2スケジュールを組み合わせて
 * 各日の目標を設定する。
 */
export function generateDailyGoals(params: {
  planId: number;
  studyDates: Date[];
  startDate: Date;
  endDate: Date;
  totalProblemsTarget?: number; // 未使用（互換性のため残す）
  categoryDistribution: Array<{ name: string; problemCount: number; priority: number; reason: string }>;
  sm2ReviewSchedule: Map<string, number>;
  allCategoriesReviewSchedule: Map<string, number>; // 全カテゴリのSM-2復習（枠埋め用）
  availableTimePerDay: number;
}): Omit<DailyGoal, 'id'>[] {
  const {
    planId,
    studyDates,
    startDate,
    endDate,
    categoryDistribution,
    sm2ReviewSchedule,
    allCategoriesReviewSchedule,
    availableTimePerDay,
  } = params;

  const goals: Omit<DailyGoal, 'id'>[] = [];

  // 1日の最大問題数 = 利用可能時間から算出
  const maxProblemsPerDay = Math.floor(availableTimePerDay / AVERAGE_TIME_PER_PROBLEM_MINUTES);

  // 残り配分用のカテゴリートラッカー
  const categoryRemaining = categoryDistribution.map((c) => ({
    ...c,
    remaining: c.problemCount,
  }));

  // SM-2復習インターバル（日数）: 新規問題を学習した日からの復習予定
  const SM2_REVIEW_INTERVALS = [1, 3, 7, 16, 35];

  // 学習日のdateKeyリスト（高速ルックアップ用）
  const studyDateKeys = new Set(studyDates.map((d) => d.toISOString().split('T')[0]));

  // SM-2復習の予測マップ: dateKey → 推定復習問題数
  // 既存のsm2ReviewScheduleに加え、新規学習から発生する復習を推計
  const estimatedReviewMap = new Map<string, number>();

  // 既存のSM-2復習スケジュールをコピー
  for (const [key, val] of sm2ReviewSchedule) {
    estimatedReviewMap.set(key, val);
  }

  // === Pass 1: 新規問題の配分を先に計算（復習推計に必要） ===
  // 方針: 復習を優先し、残りの時間枠を全て新規問題に充てる（均等配分しない）
  // これにより毎日の学習時間をフル活用し、計画をどんどん進められる
  const tempCategoryRemaining = categoryDistribution.map((c) => ({
    ...c,
    remaining: c.problemCount,
  }));

  {
    const tempCurrent = new Date(startDate);
    tempCurrent.setHours(0, 0, 0, 0);
    while (tempCurrent <= endDate) {
      const dateKey = tempCurrent.toISOString().split('T')[0];
      if (studyDateKeys.has(dateKey)) {
        // この日の推定復習数（既存SM-2 + これまでに新規学習した分の復習）
        const estimatedReview = estimatedReviewMap.get(dateKey) || 0;
        const reviewCount = Math.min(estimatedReview, maxProblemsPerDay);

        // 全カテゴリのSM-2復習も考慮（枠埋め用）
        const allCatReview = allCategoriesReviewSchedule.get(dateKey) || 0;
        const targetCatReview = sm2ReviewSchedule.get(dateKey) || 0;
        const otherCatReview = Math.max(0, allCatReview - targetCatReview);
        const totalReviewEstimate = Math.min(reviewCount + otherCatReview, maxProblemsPerDay);

        const remainingStudyDays = studyDates.filter((d) => d >= tempCurrent).length;
        const isLastDays = remainingStudyDays <= 3;

        // 新規問題の枠 = 1日の最大 - 全復習分（対象カテゴリ + 他カテゴリ）
        const slotsForNew = isLastDays ? 0 : Math.max(0, maxProblemsPerDay - totalReviewEstimate);

        let assigned = 0;
        const sorted = [...tempCategoryRemaining].sort((a, b) => b.priority - a.priority || b.remaining - a.remaining);
        for (const cat of sorted) {
          if (assigned >= slotsForNew) break;
          if (cat.remaining <= 0) continue;
          const perDay = Math.min(cat.remaining, slotsForNew - assigned);
          const idx = tempCategoryRemaining.findIndex((c) => c.name === cat.name);
          if (idx >= 0) {
            tempCategoryRemaining[idx].remaining = Math.max(0, tempCategoryRemaining[idx].remaining - perDay);
          }
          assigned += perDay;
        }

        // この日に新規学習した問題の復習予定をSM-2インターバルで推計
        if (assigned > 0) {
          for (const interval of SM2_REVIEW_INTERVALS) {
            const reviewDate = new Date(tempCurrent);
            reviewDate.setDate(reviewDate.getDate() + interval);
            const reviewKey = reviewDate.toISOString().split('T')[0];
            // 試験日以内のみ
            if (reviewDate <= endDate) {
              const prev = estimatedReviewMap.get(reviewKey) || 0;
              estimatedReviewMap.set(reviewKey, prev + assigned);
            }
          }
        }
      }
      tempCurrent.setDate(tempCurrent.getDate() + 1);
    }
  }

  // === Pass 2: 推定復習を含めた日次目標を生成 ===
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  let dayNumber = 0;

  while (current <= endDate) {
    dayNumber++;
    const dateKey = current.toISOString().split('T')[0];
    const isStudyDay = studyDateKeys.has(dateKey);

    if (isStudyDay) {
      // 推定復習問題数（既存SM-2 + 新規学習からの推計）
      const estimatedReview = estimatedReviewMap.get(dateKey) || 0;
      // 1日の最大問題数でキャップ
      const reviewCount = Math.min(estimatedReview, maxProblemsPerDay);

      const remainingStudyDays = studyDates.filter((d) => d >= current).length;
      const isLastDays = remainingStudyDays <= 3;

      // 新規問題の枠 = 1日の最大 - 復習分（均等配分の制限なし、残り枠を全て使う）
      const slotsForNew = isLastDays ? 0 : Math.max(0, maxProblemsPerDay - reviewCount);

      // 今日のカテゴリー配分
      const todayCategories: DailyGoal['categories'] = [];
      let assignedProblems = 0;

      // 優先度順にカテゴリーを配分（残り枠を全て新規問題に充てる）
      const sorted = [...categoryRemaining].sort((a, b) => b.priority - a.priority || b.remaining - a.remaining);
      for (const cat of sorted) {
        if (assignedProblems >= slotsForNew) break;
        if (cat.remaining <= 0) continue;

        const perDay = Math.min(cat.remaining, slotsForNew - assignedProblems);

        todayCategories.push({
          name: cat.name,
          problemCount: perDay,
          priority: cat.priority,
          reason: cat.reason,
        });

        // 残り更新
        const idx = categoryRemaining.findIndex((c) => c.name === cat.name);
        if (idx >= 0) {
          categoryRemaining[idx].remaining = Math.max(0, categoryRemaining[idx].remaining - perDay);
        }
        assignedProblems += perDay;
      }

      // 枠が余った場合の追加復習
      let extraReview = 0;
      const usedSlots = assignedProblems + reviewCount;
      if (usedSlots < maxProblemsPerDay) {
        let remainingSlots = maxProblemsPerDay - usedSlots;

        // 1) 今日学んだ新規問題のSM-2即時復習（同日復習）
        // 新規問題を学習した後、残り枠でその問題のSM-2復習に移行
        if (assignedProblems > 0 && remainingSlots > 0) {
          const sameDayReview = Math.min(assignedProblems, remainingSlots);
          extraReview += sameDayReview;
          remainingSlots -= sameDayReview;
        }

        // 2) さらに余った場合、全カテゴリのSM-2復習で埋める
        if (remainingSlots > 0) {
          const allCatReview = allCategoriesReviewSchedule.get(dateKey) || 0;
          const targetCatReview = sm2ReviewSchedule.get(dateKey) || 0;
          const otherCatReview = Math.max(0, allCatReview - targetCatReview);
          extraReview += Math.min(otherCatReview, remainingSlots);
        }
      }

      const totalReview = reviewCount + extraReview;
      const totalProblems = assignedProblems + totalReview;
      const estimatedTime = Math.round(totalProblems * AVERAGE_TIME_PER_PROBLEM_MINUTES);

      goals.push({
        planId,
        date: new Date(current),
        dayNumber,
        isStudyDay: true,
        newProblemsTarget: assignedProblems,
        reviewProblemsTarget: totalReview,
        totalProblemsTarget: totalProblems,
        categories: todayCategories,
        estimatedTime: Math.min(estimatedTime, availableTimePerDay),
        isCompleted: false,
        actualNewProblems: 0,
        actualReviewProblems: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    // else: 休日は日次目標を作成しない

    current.setDate(current.getDate() + 1);
  }

  return goals;
}

/**
 * プラン進捗の初期値を生成
 */
function createInitialProgress(params: {
  totalDays: number;
  studyDaysCount: number;
  totalProblemsTarget: number;
  examDate: Date;
}): StudyPlanProgress {
  return {
    totalDays: params.totalDays,
    elapsedDays: 0,
    remainingDays: params.totalDays,
    completedDays: 0,
    totalProblemsTarget: params.totalProblemsTarget,
    completedProblems: 0,
    completedNewProblems: 0,
    completedReviewProblems: 0,
    remainingProblems: params.totalProblemsTarget,
    progressPercentage: 0,
    reviewProgressPercentage: 0,
    averageAccuracy: 0,
    averageDailyProblems: 0,
    averageStudyTime: 0,
    projectedCompletionDate: params.examDate,
    projectedScore: 0,
    onTrack: true,
    daysAheadOrBehind: 0,
    riskLevel: 'low',
    riskFactors: [],
    weeklyStats: [],
  };
}

// ============================================================
// マイルストーン生成
// ============================================================

/**
 * プラン作成時に3つのマイルストーンを自動生成
 *
 * - 序盤終了: カバレッジ40% / スコア currentLevel + (target - current) × 0.3
 * - 中盤終了: カバレッジ70% / スコア currentLevel + (target - current) × 0.7
 * - 試験日:   カバレッジ100% / 目標スコア
 */
export function generateMilestones(
  planId: number,
  startDate: Date,
  examDate: Date,
  currentLevel: number,
  targetScore: number
): Omit<Milestone, 'id'>[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);

  const totalDays = Math.max(1, Math.floor((exam.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const scoreDiff = targetScore - currentLevel;

  // 序盤終了: 全期間の40%地点
  const earlyEndDate = new Date(start);
  earlyEndDate.setDate(earlyEndDate.getDate() + Math.floor(totalDays * 0.4));

  // 中盤終了: 全期間の70%地点
  const midEndDate = new Date(start);
  midEndDate.setDate(midEndDate.getDate() + Math.floor(totalDays * 0.7));

  const now = new Date();

  return [
    {
      planId,
      targetDate: earlyEndDate,
      phase: 'early',
      targetCoverage: 40,
      targetScore: Math.round(currentLevel + scoreDiff * 0.3),
      isAchieved: false,
      createdAt: now,
    },
    {
      planId,
      targetDate: midEndDate,
      phase: 'mid',
      targetCoverage: 70,
      targetScore: Math.round(currentLevel + scoreDiff * 0.7),
      isAchieved: false,
      createdAt: now,
    },
    {
      planId,
      targetDate: exam,
      phase: 'late',
      targetCoverage: 100,
      targetScore,
      isAchieved: false,
      createdAt: now,
    },
  ];
}

// ============================================================
// メイン生成関数
// ============================================================

/**
 * 学習プランを自動生成
 *
 * @param params - プラン生成パラメータ
 * @returns 生成されたStudyPlanのID
 */
export async function generateStudyPlan(
  params: StudyPlanGenerationParams
): Promise<{ planId: number; plan: StudyPlan; dailyGoals: DailyGoal[] }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // === Validation ===
  if (params.examDate <= today) {
    throw new Error('試験日は未来の日付である必要があります');
  }
  if (params.targetCategories.length === 0) {
    throw new Error('対象カテゴリーを1つ以上指定してください');
  }
  if (params.availableTimePerDay < 10) {
    throw new Error('1日の学習時間は最低10分以上必要です');
  }

  // === Step 1: 基本パラメータの計算 ===
  const totalDays = daysBetween(today, params.examDate);
  const studyDaysOfWeek = params.studyDaysOfWeek.length > 0
    ? params.studyDaysOfWeek
    : [1, 2, 3, 4, 5]; // デフォルト: 平日
  const studyDates = getStudyDates(today, params.examDate, studyDaysOfWeek);
  const studyDaysCount = studyDates.length;

  if (studyDaysCount === 0) {
    throw new Error('学習可能な日がありません。曜日設定を確認してください');
  }

  // === Step 2: 現在のパフォーマンス分析 ===
  let currentLevel = params.currentLevel ?? 50;
  let weaknesses: WeaknessInfo[] = [];

  try {
    // ユーザーパフォーマンス分析
    const performance = await analyzeUserPerformance();
    if (performance && typeof performance.overallAccuracy === 'number') {
      // overallAccuracyは比率(0-1)の場合とパーセント(0-100)の場合がある
      const accuracy = performance.overallAccuracy <= 1
        ? performance.overallAccuracy * 100
        : performance.overallAccuracy;
      currentLevel = params.currentLevel ?? accuracy;
    }

    // 弱点検出
    const topWeaknesses = await detectTopWeaknesses();
    if (topWeaknesses && Array.isArray(topWeaknesses)) {
      weaknesses = topWeaknesses.map((w: any) => ({
        category: w.category || '',
        accuracy: w.accuracy ?? 0,
        totalAnswered: w.totalAnswered ?? 0,
        weaknessScore: w.weaknessScore ?? 0,
        lastStudied: w.lastStudied,
        priorityLevel: w.weaknessScore >= 60 ? 5 : w.weaknessScore >= 40 ? 3 : 1,
      }));
    }
  } catch (e) {
    console.warn('パフォーマンス分析エラー（デフォルト値を使用）:', e);
  }

  const targetScore = params.targetScore ?? 80;
  const newToReviewRatio = params.newToReviewRatio ?? 0.6;
  const prioritizeWeakness = params.prioritizeWeakness ?? true;
  const studyMode = params.studyMode ?? 'balanced';

  // === Step 3: 必要な問題数の計算 ===
  // 対象カテゴリの問題数のみカウント（全DBではなく）
  let totalProblemsInDB = 0;
  try {
    if (params.targetCategories && params.targetCategories.length > 0) {
      const allProblems = await db.problems.toArray();
      const categorySet = new Set(params.targetCategories);
      totalProblemsInDB = allProblems.filter(p => p.category && categorySet.has(p.category)).length;
      // カテゴリに一致する問題がない場合は全問題数にフォールバック
      if (totalProblemsInDB === 0) {
        totalProblemsInDB = allProblems.length;
      }
    } else {
      totalProblemsInDB = await db.problems.count();
    }
  } catch (e) {
    totalProblemsInDB = 100;
  }

  const totalProblemsTarget = calculateRequiredProblems(
    currentLevel,
    targetScore,
    totalProblemsInDB
  );

  // === Step 4: カテゴリー配分 ===
  // Phase 4-1: 出題頻度重みの自動統合
  // importanceModeが未指定でも、過去問分析データがあれば自動的に'analyzed'モードを使用
  let effectiveImportanceMode = params.importanceMode;
  let frequencyWeightSource: 'historical' | 'category_stats' | undefined;

  if (!effectiveImportanceMode && params.targetCategories.length >= 2) {
    try {
      const { getAnalysis } = await import('./subtopicAnalysisService');
      let hasAnalysisData = false;
      for (const cat of params.targetCategories) {
        const analysis = await getAnalysis(params.importancePresetId || '', cat);
        if (analysis && analysis.totalProblemsAnalyzed > 0) {
          hasAnalysisData = true;
          break;
        }
      }
      if (hasAnalysisData) {
        effectiveImportanceMode = 'analyzed';
        frequencyWeightSource = 'historical';
      }
    } catch {
      // 分析データ取得失敗は無視
    }
  }

  // Phase 1-3: 多科目かつ importanceMode が指定されていれば優先度スコアベース配分を使用
  const useMultiSubjectAllocation =
    params.targetCategories.length >= 2 &&
    effectiveImportanceMode !== undefined &&
    effectiveImportanceMode !== 'uniform';

  let categoryDistribution: Array<{
    name: string;
    problemCount: number;
    priority: number;
    reason: string;
  }>;

  if (useMultiSubjectAllocation) {
    try {
      categoryDistribution = await distributeProblemsByPriorityScore(
        params.targetCategories,
        totalProblemsTarget,
        totalDays,
        effectiveImportanceMode!,
        {
          presetId: params.importancePresetId,
          manualWeights: params.importanceManualWeights,
          presetMapping: params.importancePresetMapping,
          examId: params.importancePresetId,
        }
      );
    } catch (e) {
      console.warn('優先度スコア配分エラー（弱点ベース配分にフォールバック）:', e);
      categoryDistribution = distributeProblemsAcrossCategories(
        params.targetCategories,
        weaknesses,
        totalProblemsTarget,
        prioritizeWeakness
      );
    }
  } else {
    categoryDistribution = distributeProblemsAcrossCategories(
      params.targetCategories,
      weaknesses,
      totalProblemsTarget,
      prioritizeWeakness
    );
  }

  // === Step 5: SM-2復習スケジュール取得 ===
  let sm2ReviewSchedule = new Map<string, number>();
  let allCategoriesReviewSchedule = new Map<string, number>();
  if (params.includeSpacedRepetition !== false) {
    sm2ReviewSchedule = await getSM2ReviewSchedule(
      today,
      params.examDate,
      params.targetCategories
    );
    // 全カテゴリのSM-2復習（枠が余った場合に埋める用）
    allCategoriesReviewSchedule = await getSM2ReviewSchedule(
      today,
      params.examDate,
      [] // 空配列 = 全カテゴリ
    );
  }

  // === Step 6: 日次目標生成 ===
  // 一時的なplanIdで日次目標を生成（後で更新）
  const tempPlanId = -1;
  const dailyGoalDrafts = generateDailyGoals({
    planId: tempPlanId,
    studyDates,
    startDate: today,
    endDate: params.examDate,
    totalProblemsTarget,
    categoryDistribution,
    sm2ReviewSchedule,
    allCategoriesReviewSchedule,
    availableTimePerDay: params.availableTimePerDay,
  });

  // === Step 7: 時間不足 / 問題数不足チェック ===
  const maxProblemsPerDay = Math.floor(params.availableTimePerDay / AVERAGE_TIME_PER_PROBLEM_MINUTES);
  const requiredDays = maxProblemsPerDay > 0 ? Math.ceil(totalProblemsTarget / maxProblemsPerDay) : Infinity;
  let timeWarning: string | undefined;
  if (requiredDays > studyDaysCount && studyDaysCount > 0) {
    const suggestedTime = Math.ceil((totalProblemsTarget / studyDaysCount) * AVERAGE_TIME_PER_PROBLEM_MINUTES);
    timeWarning = `全${totalProblemsTarget}問をカバーするには1日${suggestedTime}分の学習が必要です（現在${params.availableTimePerDay}分）`;
  }

  // 問題数が少なく、1日の学習時間を十分に活用できない場合の警告
  // SM-2復習では同じ問題を1日に複数回やっても効果がないため、
  // 問題数 < maxProblemsPerDay の場合、復習日に時間が余る
  if (totalProblemsInDB < maxProblemsPerDay && totalProblemsInDB > 0) {
    const usableMinutes = totalProblemsInDB * AVERAGE_TIME_PER_PROBLEM_MINUTES;
    const suggestedProblems = maxProblemsPerDay;
    const problemWarning = `問題数が${totalProblemsInDB}問のため、復習日は約${usableMinutes}分しか学習できません。${params.availableTimePerDay}分をフル活用するには${suggestedProblems}問以上の問題が必要です`;
    timeWarning = timeWarning ? `${timeWarning}。${problemWarning}` : problemWarning;
  }

  // === Step 8: プラン進捗の初期化 ===
  const progress = createInitialProgress({
    totalDays,
    studyDaysCount,
    totalProblemsTarget,
    examDate: params.examDate,
  });

  // 実効的な1日問題数（時間キャップ適用済み）
  const effectiveProbsPerDay = studyDaysCount > 0
    ? Math.min(Math.ceil(totalProblemsTarget / studyDaysCount), maxProblemsPerDay)
    : 0;

  // === Step 9: StudyPlanオブジェクトを作成してDB保存 ===
  const planData: Omit<StudyPlan, 'id'> = {
    name: params.name,
    examDate: params.examDate,
    examType: params.examType ?? 'other',
    examName: params.name,
    targetScore,
    currentLevel,
    targetCategories: params.targetCategories,
    availableTimePerDay: params.availableTimePerDay,
    studyDaysOfWeek,
    studyMode,
    problemsPerDay: effectiveProbsPerDay,
    newToReviewRatio,
    prioritizeWeakness,
    totalProblemsTarget,
    dailyGoalIds: [],
    progress,
    linkedGoalIds: [],
    linkedQuizSetIds: [],
    weaknessCategories: weaknesses,
    includeSpacedRepetition: params.includeSpacedRepetition !== false,
    spacedRepetitionWeight: 0.4,
    timeWarning,
    isActive: true,
    isCompleted: false,
    isPaused: false,
    description: `試験日: ${params.examDate.toLocaleDateString('ja-JP')} | 学習期間: ${totalDays}日 | 学習日: ${studyDaysCount}日`,
    enableReminders: true,
    autoRebalanceWeekly: true,
    frequencyWeightSource,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const planId = await studyPlanService.create(planData);

  // === Step 10: 日次目標をplanIdで更新して保存 ===
  const goalsWithPlanId = dailyGoalDrafts.map((g) => ({
    ...g,
    planId,
  }));

  const goalIds = await dailyGoalService.createBatch(goalsWithPlanId);

  // プランの日次目標IDを更新
  await studyPlanService.update(planId, { dailyGoalIds: goalIds });

  // === Step 10b: マイルストーン生成 ===
  try {
    const milestones = generateMilestones(planId, today, params.examDate, currentLevel, targetScore);
    await milestoneService.createBatch(milestones);
  } catch (e) {
    console.warn('マイルストーン生成エラー（プラン自体は作成済み）:', e);
  }

  // === Step 11: 完全なプランを取得して返す ===
  const createdPlan = await studyPlanService.getById(planId);
  const createdGoals = await dailyGoalService.getByPlanId(planId);

  if (!createdPlan) {
    throw new Error('プラン作成に失敗しました');
  }

  return {
    planId,
    plan: createdPlan,
    dailyGoals: createdGoals,
  };
}

// ============================================================
// プラン進捗の再計算
// ============================================================

/**
 * プlanの進捗を現在の実績データで再計算
 */
export async function recalculatePlanProgress(planId: number): Promise<StudyPlanProgress | null> {
  const plan = await studyPlanService.getById(planId);
  if (!plan) return null;

  const goals = await dailyGoalService.getByPlanId(planId);
  const completedGoals = goals.filter((g) => g.isCompleted);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = daysBetween(new Date(plan.createdAt), plan.examDate);
  const elapsedDays = daysBetween(new Date(plan.createdAt), today);
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  // 実績集計: #2 新規と復習を分離して進捗を2軸化
  const completedNewProblems = completedGoals.reduce(
    (sum, g) => sum + (g.actualNewProblems || 0), 0
  );
  const completedReviewProblems = completedGoals.reduce(
    (sum, g) => sum + (g.actualReviewProblems || 0), 0
  );
  const completedProblems = completedNewProblems + completedReviewProblems; // 後方互換
  const totalAccuracySum = completedGoals.reduce(
    (sum, g) => sum + (g.accuracy || 0), 0
  );
  const averageAccuracy = completedGoals.length > 0
    ? totalAccuracySum / completedGoals.length
    : 0;

  // メイン進捗: 新規問題ベース（targetは新規問題ベースで計算されているため）
  const progressPercentage = plan.totalProblemsTarget > 0
    ? Math.min(100, (completedNewProblems / plan.totalProblemsTarget) * 100)
    : 0;

  // 復習進捗: 復習目標ベース
  const totalReviewTarget = goals.reduce((sum, g) => sum + (g.reviewProblemsTarget || 0), 0);
  const reviewProgressPercentage = totalReviewTarget > 0
    ? Math.min(100, (completedReviewProblems / totalReviewTarget) * 100)
    : 0;

  // ペース分析: 予定ペースとの比較
  const studyDays = goals.filter((g) => g.isStudyDay);
  const elapsedStudyDays = studyDays.filter(
    (g) => new Date(g.date) <= today
  ).length;
  const expectedProblems = elapsedStudyDays > 0 && plan.totalProblemsTarget > 0
    ? (elapsedStudyDays / studyDays.length) * plan.totalProblemsTarget
    : 0;

  // 遅延日数を問題数ベースで換算
  const problemsDeficit = expectedProblems - completedProblems;
  const problemsPerStudyDay = studyDays.length > 0
    ? plan.totalProblemsTarget / studyDays.length
    : 1;
  const daysAheadOrBehind = problemsPerStudyDay > 0
    ? Math.round(problemsDeficit / problemsPerStudyDay)
    : 0;

  // リスク評価
  const riskLevel = calculateRiskLevel(daysAheadOrBehind, progressPercentage, remainingDays);
  const riskFactors: StudyPlanProgress['riskFactors'] = [];

  if (daysAheadOrBehind >= RISK_THRESHOLDS.medium) {
    riskFactors.push({
      factor: '学習遅延',
      severity: daysAheadOrBehind >= RISK_THRESHOLDS.high ? 'high' : 'medium',
      description: `予定より${daysAheadOrBehind}日分の問題が未完了です`,
    });
  }
  if (averageAccuracy > 0 && averageAccuracy < 60) {
    riskFactors.push({
      factor: '正答率低下',
      severity: averageAccuracy < 40 ? 'high' : 'medium',
      description: `平均正答率が${averageAccuracy.toFixed(1)}%で低い水準です`,
    });
  }

  // 予測スコア: 現在のペースで試験日までに達成できるスコア
  const projectedScore = averageAccuracy > 0
    ? Math.min(100, plan.currentLevel + (averageAccuracy - plan.currentLevel) * (progressPercentage / 100))
    : plan.currentLevel;

  const progress: StudyPlanProgress = {
    totalDays,
    elapsedDays,
    remainingDays,
    completedDays: completedGoals.length,
    totalProblemsTarget: plan.totalProblemsTarget,
    completedProblems,
    completedNewProblems,
    completedReviewProblems,
    remainingProblems: Math.max(0, plan.totalProblemsTarget - completedNewProblems),
    progressPercentage,
    reviewProgressPercentage,
    averageAccuracy,
    averageDailyProblems: completedGoals.length > 0
      ? completedProblems / completedGoals.length
      : 0,
    averageStudyTime: completedGoals.length > 0
      ? completedGoals.reduce((sum, g) => sum + (g.actualTime || 0), 0) / completedGoals.length
      : 0,
    projectedCompletionDate: plan.examDate,
    projectedScore: Math.round(projectedScore),
    onTrack: daysAheadOrBehind < RISK_THRESHOLDS.medium,
    daysAheadOrBehind,
    riskLevel,
    riskFactors,
    weeklyStats: [], // 別途計算
  };

  // プランに進捗を保存
  await studyPlanService.update(planId, { progress });

  return progress;
}

// ============================================================
// 調整提案生成
// ============================================================

/**
 * プランの調整提案を生成
 * 現在の進捗とパフォーマンスに基づいて改善策を提案する
 */
export async function generateAdjustmentSuggestions(
  planId: number
): Promise<StudyPlanAdjustmentSuggestion[]> {
  const plan = await studyPlanService.getById(planId);
  if (!plan) return [];

  const progress = plan.progress;
  const suggestions: StudyPlanAdjustmentSuggestion[] = [];

  // 提案1: ペース遅延時
  if (progress.daysAheadOrBehind >= RISK_THRESHOLDS.medium) {
    const currentProblemsPerDay = plan.problemsPerDay || 0;
    const suggestedIncrease = Math.ceil(currentProblemsPerDay * 1.3);

    suggestions.push({
      planId,
      type: 'pace',
      priority: progress.daysAheadOrBehind >= RISK_THRESHOLDS.high ? 'high' : 'medium',
      title: '1日あたりの問題数を増加',
      description: `現在${currentProblemsPerDay}問/日のペースでは試験日に間に合いません`,
      reason: `${progress.daysAheadOrBehind}日分の遅延があります`,
      suggestedChanges: [
        {
          field: 'problemsPerDay',
          currentValue: currentProblemsPerDay,
          suggestedValue: suggestedIncrease,
          expectedImpact: `${suggestedIncrease - currentProblemsPerDay}問/日増加で遅延を回復`,
        },
      ],
      createdAt: new Date(),
    });
  }

  // 提案2: 正答率低下時
  if (progress.averageAccuracy > 0 && progress.averageAccuracy < 60) {
    suggestions.push({
      planId,
      type: 'strategy',
      priority: 'high',
      title: '弱点強化モードに切り替え',
      description: `正答率が${progress.averageAccuracy.toFixed(1)}%で低い水準です。弱点カテゴリーに集中학習を推奨します`,
      reason: '正答率60%未満では学習効率が大幅に低下します',
      suggestedChanges: [
        {
          field: 'studyMode',
          currentValue: plan.studyMode,
          suggestedValue: 'weakness-focused',
          expectedImpact: '正答率に集中し効率的な学習が可能',
        },
        {
          field: 'prioritizeWeakness',
          currentValue: plan.prioritizeWeakness,
          suggestedValue: true,
          expectedImpact: '弱点カテゴリーの問題を優先表示',
        },
      ],
      createdAt: new Date(),
    });
  }

  // 提案3: 学習時間が短い場合
  if (progress.averageStudyTime > 0 && progress.averageStudyTime < plan.availableTimePerDay * 0.5) {
    suggestions.push({
      planId,
      type: 'time',
      priority: 'low',
      title: '学習時間を活用しているか確認',
      description: `設定された学習時間(${plan.availableTimePerDay}分)の半分以下しか使われていません`,
      reason: `平均学習時間が${progress.averageStudyTime.toFixed(0)}分です`,
      suggestedChanges: [
        {
          field: 'availableTimePerDay',
          currentValue: plan.availableTimePerDay,
          suggestedValue: Math.round(progress.averageStudyTime * 1.2),
          expectedImpact: '実際の学習時間に合わせてスケジュールを調整',
        },
      ],
      createdAt: new Date(),
    });
  }

  return suggestions;
}

// ============================================================
// 今日のタスク取得
// ============================================================

/**
 * 今日の学習タスクを取得（アクティブなプラン全体）
 */
export async function getTodaysTasks(): Promise<{
  goals: DailyGoal[];
  totalProblems: number;
  estimatedTime: number;
  planNames: Map<number, string>;
}> {
  const activePlans = await studyPlanService.getActivePlans();
  const todayGoals = await dailyGoalService.getTodayGoals();

  // アクティブなプランに属する今日の目標のみ
  const activePlanIds = new Set(activePlans.map((p) => p.id!));
  const filteredGoals = todayGoals.filter((g) => activePlanIds.has(g.planId));

  const planNames = new Map<number, string>();
  for (const plan of activePlans) {
    planNames.set(plan.id!, plan.name);
  }

  return {
    goals: filteredGoals,
    totalProblems: filteredGoals.reduce((sum, g) => sum + g.totalProblemsTarget, 0),
    estimatedTime: filteredGoals.reduce((sum, g) => sum + g.estimatedTime, 0),
    planNames,
  };
}

/**
 * 今日のタスク詳細情報を取得（TodayTasksCardコンポーネント用）
 *
 * アクティブなプラン全体から今日の学習タスクを集計し、
 * カテゴリー別の内訳、緊急度、SM-2復習期限切れカード数などの
 * 詳細情報を返します。
 *
 * アルゴリズム:
 * 1. アクティブプランを取得
 * 2. 今日の日次目標をフィルタリング
 * 3. カテゴリー集計（Map構造でO(n)）
 * 4. SM-2期限切れカード数を取得（IndexedDBクエリ1回）
 * 5. 緊急度判定ロジック:
 *    - totalProblems > 50 OR estimatedTime > 150min → high
 *    - totalProblems > 30 OR estimatedTime > 90min → medium
 *    - それ以外 → low
 *
 * @returns {Promise<TodayTasksDetail>} 今日のタスク詳細情報
 */
export async function getTodayTasksDetailed(): Promise<TodayTasksDetail> {
  // 1. アクティブプランと今日の目標を並列取得
  const [allActivePlans, todayGoals, dueCards] = await Promise.all([
    studyPlanService.getActivePlans(),
    dailyGoalService.getTodayGoals(),
    spacedRepetitionService.getDueCards(1000), // 十分大きな数で全件取得
  ]);

  // 試験日が過去のプランを除外
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const activePlans = allActivePlans.filter(p => {
    const examDate = new Date(p.examDate);
    examDate.setHours(23, 59, 59, 999);
    return examDate >= now;
  });

  // 2. アクティブなプランに属する今日の目標のみをフィルタリング
  const activePlanIds = new Set(activePlans.map((p) => p.id!));
  const filteredGoals = todayGoals.filter((g) => activePlanIds.has(g.planId));

  // 3. プラン名のマップを作成
  const planNames = new Map<number, string>();
  for (const plan of activePlans) {
    planNames.set(plan.id!, plan.name);
  }

  // 4. カテゴリー別問題数を集計
  const categoryBreakdown = new Map<string, number>();
  for (const goal of filteredGoals) {
    for (const cat of goal.categories) {
      const current = categoryBreakdown.get(cat.name) || 0;
      categoryBreakdown.set(cat.name, current + cat.problemCount);
    }
  }

  // 5. 合計問題数と推定時間を計算（完了分を差し引いて残り問題数を表示）
  const totalTarget = filteredGoals.reduce((sum, g) => sum + g.totalProblemsTarget, 0);
  const completedSoFar = filteredGoals.reduce((sum, g) => sum + (g.actualNewProblems || 0) + (g.actualReviewProblems || 0), 0);
  const totalProblems = Math.max(0, totalTarget - completedSoFar);
  const estimatedTime = filteredGoals.reduce((sum, g) => {
    const remaining = Math.max(0, g.totalProblemsTarget - (g.actualNewProblems || 0) - (g.actualReviewProblems || 0));
    return sum + Math.round(remaining * (g.estimatedTime / Math.max(1, g.totalProblemsTarget)));
  }, 0);

  // 6. SM-2期限切れカード数
  const sm2DueCount = dueCards.length;

  // 7. 緊急度を判定
  const urgencyLevel = calculateUrgencyLevel(totalProblems, estimatedTime, sm2DueCount);

  // 8. 複数プランがあるかどうか
  const uniquePlanIds = new Set(filteredGoals.map((g) => g.planId));
  const multiplePlans = uniquePlanIds.size > 1;

  // 9. 今日学習すべきプラン数
  const todayStudyDayCount = uniquePlanIds.size;

  // 10. 次の学習日を取得（今日の目標達成済み or 休息日の場合）
  let nextStudyDay: TodayTasksDetail['nextStudyDay'];
  const isTodayCompleted = filteredGoals.length > 0 && totalProblems === 0;
  const isRestDayCandidate = filteredGoals.length === 0 && activePlans.length > 0;
  if (isTodayCompleted || isRestDayCandidate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 全プランから未完了の将来の学習日を検索
    let nextDate: Date | null = null;
    let nextGoals: DailyGoal[] = [];

    for (const plan of activePlans) {
      const allGoals = await dailyGoalService.getByPlanId(plan.id!);
      for (const goal of allGoals) {
        const goalDate = new Date(goal.date);
        goalDate.setHours(0, 0, 0, 0);
        // totalProblemsTarget > 0 のゴールのみ対象（0問のゴールは先取り不要）
        if (goalDate > today && goal.isStudyDay && !goal.isCompleted && goal.totalProblemsTarget > 0) {
          if (!nextDate || goalDate < nextDate) {
            nextDate = goalDate;
            nextGoals = [goal];
          } else if (nextDate && goalDate.getTime() === nextDate.getTime()) {
            nextGoals.push(goal);
          }
        }
      }
    }

    if (nextDate && nextGoals.length > 0) {
      nextStudyDay = {
        goals: nextGoals,
        date: nextDate,
        totalProblems: nextGoals.reduce((sum, g) => sum + g.totalProblemsTarget, 0),
        estimatedTime: nextGoals.reduce((sum, g) => sum + g.estimatedTime, 0),
      };
    }
  }

  // 11. 休息日判定
  //   日次目標がない場合、アクティブプランがあるなら休息日と判定
  const isRestDay = filteredGoals.length === 0 && activePlans.length > 0;

  let restDayInfo: TodayTasksDetail['restDayInfo'];
  if (isRestDay) {
    // 次の学習日を検索（全プランの中で最も近い学習日）
    let nextStudyDate: Date | null = null;
    const allGoals = await Promise.all(
      activePlans.map(p => dailyGoalService.getByPlanId(p.id!))
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const goals of allGoals) {
      for (const goal of goals) {
        const goalDate = new Date(goal.date);
        goalDate.setHours(0, 0, 0, 0);
        if (goalDate > today && goal.isStudyDay && !goal.isCompleted) {
          if (!nextStudyDate || goalDate < nextStudyDate) {
            nextStudyDate = goalDate;
          }
        }
      }
    }

    const daysUntilNext = nextStudyDate
      ? Math.ceil((nextStudyDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      : -1;
    const isLongRest = daysUntilNext > 7 || daysUntilNext < 0;

    // 対象カテゴリのSM-2期限切れをフィルタ
    const planCategories = new Set(activePlans.flatMap(p => p.targetCategories || []));
    const planDueCards = dueCards.filter(card => {
      if (!card.category) return true; // カテゴリなしは含める
      return planCategories.has(card.category);
    });

    // メッセージ生成
    let message: string;
    if (planDueCards.length === 0) {
      message = nextStudyDate
        ? `今日は休息日です。次の学習日は${nextStudyDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}です`
        : '今日は休息日です。タスクはありません';
    } else if (isLongRest) {
      message = `休息期間が長いため、復習期限の問題(${planDueCards.length}問)を表示しています`;
    } else if (daysUntilNext === 1) {
      message = `今日は休息日ですが、復習期限の問題が${planDueCards.length}問あります`;
    } else {
      const nextDateStr = nextStudyDate!.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
      message = `次の学習日(${nextDateStr})までに期限切れになる問題が${planDueCards.length}問あります`;
    }

    restDayInfo = {
      nextStudyDate,
      daysUntilNext,
      planDueCount: planDueCards.length,
      isLongRest,
      message,
    };
  }

  return {
    goals: filteredGoals,
    totalProblems,
    estimatedTime,
    planNames,
    categoryBreakdown,
    sm2DueCount,
    urgencyLevel,
    multiplePlans,
    todayStudyDayCount,
    nextStudyDay,
    isRestDay,
    restDayInfo,
  };
}

/**
 * 緊急度を計算
 *
 * @param totalProblems 合計問題数
 * @param estimatedTime 推定学習時間（分）
 * @param sm2DueCount SM-2期限切れカード数
 * @returns 緊急度レベル
 */
function calculateUrgencyLevel(
  totalProblems: number,
  estimatedTime: number,
  sm2DueCount: number
): 'low' | 'medium' | 'high' {
  // 優先度1: SM-2期限切れが大量
  if (sm2DueCount >= 30) return 'high';

  // 優先度2: 問題数または時間が多い
  if (totalProblems > 50 || estimatedTime > 150) return 'high';
  if (totalProblems > 30 || estimatedTime > 90) return 'medium';

  return 'low';
}

// ============================================================
// 今日の推奨問題リスト取得
// ============================================================

/**
 * 今日の推奨問題リストを取得
 *
 * 今日の日次目標に基づいて、実際に解くべき問題のリストを
 * カテゴリー別・タイプ別（新規/復習/弱点）に整理して返します。
 *
 * アルゴリズム:
 * 1. getTodayTasksDetailed()で今日のタスク情報を取得
 * 2. SM-2期限切れカードから復習問題を取得
 * 3. 弱点検出から弱点カテゴリーの問題を優先取得
 * 4. 推奨エンジンで新規問題を取得
 * 5. カテゴリー別にサマリーを作成
 *
 * @returns {Promise<TodayRecommendedProblems>} 今日の推奨問題リスト
 */
export async function getRecommendedProblemsForToday(): Promise<TodayRecommendedProblems> {
  console.log('[StudyPlanGenerator] 今日の推奨問題を取得中...');

  // 1. 今日のタスク詳細を取得
  const todayTasks = await getTodayTasksDetailed();
  const hasGoals = todayTasks.goals.length > 0;

  // アクティブなプランの対象カテゴリを取得（プラン外の問題を除外するため）
  const activePlans = await studyPlanService.getActivePlans();
  const planTargetCategories = new Set<string>();
  for (const plan of activePlans) {
    if (plan.targetCategories) {
      for (const cat of plan.targetCategories) planTargetCategories.add(cat);
    }
  }
  // ゴールのカテゴリも追加
  for (const goal of todayTasks.goals) {
    for (const cat of goal.categories) planTargetCategories.add(cat.name);
  }
  const hasPlanFilter = planTargetCategories.size > 0;
  console.log(`[StudyPlanGenerator] プラン対象カテゴリ: ${[...planTargetCategories].join(', ')} (filter=${hasPlanFilter})`);

  // 2. SM-2復習問題を取得（期限切れカード）
  const dueCards = await spacedRepetitionService.getDueCards(100); // 最大100件
  const reviewProblems: TodayRecommendedProblems['reviewProblems'] = [];

  for (const card of dueCards) {
    const problem = await problemService.getById(card.problemId);
    if (!problem) continue;

    // プランの対象カテゴリ外の問題はスキップ
    if (hasPlanFilter && problem.category && !planTargetCategories.has(problem.category)) continue;

    // 優先度判定: 期限切れからの日数で決定
    const daysOverdue = card.nextReviewDate
      ? Math.floor((Date.now() - new Date(card.nextReviewDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (daysOverdue >= 7) priority = 'high';
    else if (daysOverdue < 2) priority = 'low';

    reviewProblems.push({
      problem,
      category: card.category || problem.category || 'その他',
      dueDate: card.nextReviewDate || new Date(),
      interval: card.interval || 1,
      repetitions: card.repetitions || 0,
      priority,
    });
  }

  // 優先度順にソート（high > medium > low）
  reviewProblems.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  console.log(`[StudyPlanGenerator] 復習問題: ${reviewProblems.length}件`);

  // 3. 弱点検出から弱点問題を取得
  const weaknesses = await detectTopWeaknesses();
  const weaknessProblems: TodayRecommendedProblems['weaknessProblems'] = [];

  // 弱点カテゴリーの問題を取得（上位3カテゴリー、プラン対象カテゴリに限定）
  const filteredWeaknesses = hasPlanFilter
    ? weaknesses.filter(w => planTargetCategories.has(w.category))
    : weaknesses;
  for (const weakness of filteredWeaknesses.slice(0, 3)) {
    const categoryProblems = await db.problems
      .where('category')
      .equals(weakness.category)
      .limit(10)
      .toArray();

    for (const problem of categoryProblems) {
      // 既に復習リストに含まれているものは除外
      const isInReview = reviewProblems.some((rp) => rp.problem.id === problem.id);
      if (isInReview) continue;

      weaknessProblems.push({
        problem,
        category: weakness.category,
        weaknessScore: weakness.weaknessScore,
        categoryAccuracy: weakness.accuracy,
        priority: weakness.weaknessScore >= 70 ? 'high' : weakness.weaknessScore >= 50 ? 'medium' : 'low',
      });
    }
  }

  // 弱点スコア順にソート
  weaknessProblems.sort((a, b) => b.weaknessScore - a.weaknessScore);

  console.log(`[StudyPlanGenerator] 弱点問題: ${weaknessProblems.length}件`);

  // 4. 新規問題を推奨エンジンから取得
  // 日次目標がない場合はデフォルト20問を推奨
  const newProblemCount = hasGoals
    ? todayTasks.goals.reduce((sum, g) => sum + g.newProblemsTarget, 0)
    : 20;
  const recommendedNewProblems = await generateRecommendedProblems(newProblemCount, {
    weaknessWeight: 0.4,
    timeWeight: 0.3,
    difficultyWeight: 0.3,
    maxRecommendations: newProblemCount,
    minScore: 30,
    targetAccuracy: 0.7,
  });

  const newProblems: TodayRecommendedProblems['newProblems'] = [];

  for (const recommended of recommendedNewProblems) {
    // プランの対象カテゴリ外の問題はスキップ
    if (hasPlanFilter && recommended.problem.category && !planTargetCategories.has(recommended.problem.category)) continue;
    // 既に復習または弱点リストに含まれているものは除外
    const isInReview = reviewProblems.some((rp) => rp.problem.id === recommended.problem.id);
    const isInWeakness = weaknessProblems.some((wp) => wp.problem.id === recommended.problem.id);
    if (isInReview || isInWeakness) continue;

    newProblems.push({
      problem: recommended.problem,
      category: recommended.problem.category || 'その他',
      reason: recommended.reason,
      priority: recommended.priority,
    });
  }

  console.log(`[StudyPlanGenerator] 新規問題: ${newProblems.length}件`);

  // 5. カテゴリー別サマリーを作成
  const categorySummary = new Map<string, {
    newCount: number;
    reviewCount: number;
    weaknessCount: number;
    totalCount: number;
  }>();

  // 新規問題をカウント
  for (const item of newProblems) {
    const cat = item.category;
    const current = categorySummary.get(cat) || { newCount: 0, reviewCount: 0, weaknessCount: 0, totalCount: 0 };
    current.newCount++;
    current.totalCount++;
    categorySummary.set(cat, current);
  }

  // 復習問題をカウント
  for (const item of reviewProblems) {
    const cat = item.category;
    const current = categorySummary.get(cat) || { newCount: 0, reviewCount: 0, weaknessCount: 0, totalCount: 0 };
    current.reviewCount++;
    current.totalCount++;
    categorySummary.set(cat, current);
  }

  // 弱点問題をカウント
  for (const item of weaknessProblems) {
    const cat = item.category;
    const current = categorySummary.get(cat) || { newCount: 0, reviewCount: 0, weaknessCount: 0, totalCount: 0 };
    current.weaknessCount++;
    current.totalCount++;
    categorySummary.set(cat, current);
  }

  // 6. 推奨学習順序を決定
  let recommendedOrder: TodayRecommendedProblems['recommendedOrder'] = 'mixed';

  if (reviewProblems.length > 20) {
    // 復習が大量にある場合は復習優先
    recommendedOrder = 'review-first';
  } else if (weaknessProblems.length > 10 && weaknesses[0]?.weaknessScore >= 70) {
    // 深刻な弱点がある場合は弱点優先
    recommendedOrder = 'weakness-first';
  } else if (newProblems.length > reviewProblems.length * 2) {
    // 新規問題が多い場合は新規優先
    recommendedOrder = 'new-first';
  }

  const totalCount = newProblems.length + reviewProblems.length + weaknessProblems.length;

  console.log(`[StudyPlanGenerator] 推奨問題合計: ${totalCount}件 (新規:${newProblems.length}, 復習:${reviewProblems.length}, 弱点:${weaknessProblems.length})`);
  console.log(`[StudyPlanGenerator] 推奨順序: ${recommendedOrder}`);

  return {
    newProblems,
    reviewProblems,
    weaknessProblems,
    categorySummary,
    totalCount,
    recommendedOrder,
  };
}
