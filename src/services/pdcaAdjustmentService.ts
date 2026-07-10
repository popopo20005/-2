/**
 * PDCA Adjustment Service
 *
 * 学習プランの日次調整・週次リバランス・問題優先度計算を担当
 *
 * - performDailyAdjustment: クイズ完了後の自動調整
 * - performWeeklyRebalance: 週次リバランス（自動 or 手動）
 * - calculateProblemPriority: フェーズ別問題優先度スコアリング
 */

import { db, dailyGoalService, studyPlanService, spacedRepetitionService, mockExamService, planAdjustmentService } from '../lib/database';
import { generateDailyGoals } from './studyPlanGenerator';
import type { DailyGoal, StudyPlan } from '../types/studyPlan';

// 定数
const AVERAGE_TIME_PER_PROBLEM_MINUTES = 3;
const CARRYOVER_MAX_RATIO = 0.5; // 翌日への繰越上限: 翌日枠の50%
const LOW_ACCURACY_THRESHOLD = 40; // 低正答率閾値

// #7: フェーズ別復習枠拡張パラメータ
const REVIEW_EXPANSION = {
  early: { threshold: 2.0, maxRatio: 0.5 },  // 序盤: 新規優先、拡張控えめ
  mid:   { threshold: 1.5, maxRatio: 0.7 },  // 中盤: バランス
  late:  { threshold: 1.2, maxRatio: 0.8 },  // 終盤: 忘却防止優先、積極拡張
} as const;

// フェーズ別重み
const PHASE_WEIGHTS = {
  early: { w1: 0.3, w2: 0.2, w3: 0.5 }, // 序盤: 出題頻度重視
  mid:   { w1: 0.5, w2: 0.3, w3: 0.2 }, // 中盤: 弱点重視
  late:  { w1: 0.2, w2: 0.6, w3: 0.2 }, // 終盤: 記憶定着重視
} as const;

// フェーズ別の新規:復習比率
const PHASE_NEW_REVIEW_RATIO = {
  early: 0.8, // 序盤: 新規80%
  mid:   0.5, // 中盤: 新規50%
  late:  0.2, // 終盤: 新規20%
} as const;

export interface DailyAdjustmentResult {
  carryOver: number;         // 繰越問題数
  reviewExpansion: number;   // 復習枠拡張数
  extraReviewAdded: boolean; // 低正答率カテゴリの追加復習
  adjustedGoalId?: number;   // 調整されたDailyGoalのID
}

export interface WeeklyRebalanceResult {
  phase: 'early' | 'mid' | 'late';
  deletedGoals: number;      // 削除された未来DailyGoal数
  regeneratedGoals: number;  // 再生成されたDailyGoal数
  summary: string;           // 変更点サマリ
}

/**
 * 現在のフェーズを判定（ヒステリシス付き）
 *
 * #5: 境界をまたぐ日の不連続な切り替えを防止するため、
 * 遷移方向のみ（early→mid→late）で、閾値にヒステリシスを設ける。
 * 一度遷移したフェーズには戻らない。
 *
 * 遷移閾値:
 *   early→mid: remainingRatio < 0.55（通常0.6より早めに遷移）
 *   mid→late:  remainingRatio < 0.25（通常0.3より早めに遷移）
 */
export function determinePhase(plan: StudyPlan): 'early' | 'mid' | 'late' {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const examDate = new Date(plan.examDate);
  examDate.setHours(0, 0, 0, 0);
  const created = new Date(plan.createdAt);
  created.setHours(0, 0, 0, 0);

  const totalDays = Math.max(1, Math.floor((examDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, Math.floor((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const remainingRatio = remainingDays / totalDays;

  const currentPhase = plan.currentPhase;

  // ヒステリシス: 一度遷移したら戻らない
  if (currentPhase === 'late') return 'late';
  if (currentPhase === 'mid') {
    // mid→late: 0.25未満で遷移（通常0.3の境界より厳しく）
    return remainingRatio < 0.25 ? 'late' : 'mid';
  }

  // currentPhase === 'early' or undefined
  // early→mid: 0.55未満で遷移（通常0.6の境界より厳しく）
  if (remainingRatio < 0.25) return 'late';
  if (remainingRatio < 0.55) return 'mid';
  return 'early';
}

/**
 * 問題の優先度スコアを計算
 *
 * @param weakness - 弱点度 (0-1): 1 - 個人正答率
 * @param forgetting - 忘却度 (0-1): SM-2期限切迫度
 * @param value - 出題価値 (0-1): frequencyWeight × 配点
 * @param phase - 学習フェーズ
 * @returns priority score (0-1)
 */
export function calculateProblemPriority(
  weakness: number,
  forgetting: number,
  value: number,
  phase: 'early' | 'mid' | 'late'
): number {
  const { w1, w2, w3 } = PHASE_WEIGHTS[phase];
  return w1 * weakness + w2 * forgetting + w3 * value;
}

/**
 * 次の学習日のDailyGoalを取得
 */
async function getNextStudyDayGoal(planId: number): Promise<DailyGoal | null> {
  const goals = await dailyGoalService.getByPlanId(planId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 今日より後の未完了学習日を検索
  const futureGoals = goals
    .filter(g => {
      const goalDate = new Date(g.date);
      goalDate.setHours(0, 0, 0, 0);
      return goalDate > today && g.isStudyDay && !g.isCompleted;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return futureGoals.length > 0 ? futureGoals[0] : null;
}

/**
 * 日次調整 - クイズ完了後に自動実行
 *
 * 1. 未消化タスクの繰越（翌日枠の50%が上限）
 * 2. SM-2復習枠の拡張（期限切れが1.5倍超過時）
 * 3. 低正答率カテゴリの追加復習（正答率40%未満）
 */
export async function performDailyAdjustment(planId: number): Promise<DailyAdjustmentResult> {
  const result: DailyAdjustmentResult = {
    carryOver: 0,
    reviewExpansion: 0,
    extraReviewAdded: false,
  };

  try {
    const plan = await studyPlanService.getById(planId);
    if (!plan || !plan.isActive || plan.isCompleted) return result;

    // フェーズ更新
    const currentPhase = determinePhase(plan);
    if (plan.currentPhase !== currentPhase) {
      await studyPlanService.update(planId, { currentPhase });
    }

    // 今日のDailyGoalを取得
    const todayGoals = await dailyGoalService.getTodayGoals();
    const todayGoal = todayGoals.find(g => g.planId === planId);
    if (!todayGoal) return result;

    // 翌日のDailyGoalを取得
    const nextGoal = await getNextStudyDayGoal(planId);
    if (!nextGoal || !nextGoal.id) return result;

    const maxProblemsPerDay = Math.floor(plan.availableTimePerDay / AVERAGE_TIME_PER_PROBLEM_MINUTES);

    // 1. 未消化タスクの繰越
    const actualTotal = (todayGoal.actualNewProblems || 0) + (todayGoal.actualReviewProblems || 0);
    const shortfall = Math.max(0, todayGoal.totalProblemsTarget - actualTotal);

    if (shortfall > 0) {
      const maxCarryOver = Math.floor(nextGoal.totalProblemsTarget * CARRYOVER_MAX_RATIO);
      const carryOver = Math.min(shortfall, maxCarryOver);

      if (carryOver > 0) {
        const newRatio = PHASE_NEW_REVIEW_RATIO[currentPhase];
        const carryNew = Math.floor(carryOver * newRatio);
        const carryReview = carryOver - carryNew;

        await dailyGoalService.update(nextGoal.id, {
          newProblemsTarget: nextGoal.newProblemsTarget + carryNew,
          reviewProblemsTarget: nextGoal.reviewProblemsTarget + carryReview,
          totalProblemsTarget: Math.min(nextGoal.totalProblemsTarget + carryOver, maxProblemsPerDay),
          // #11: 調整追跡
          originalNewTarget: nextGoal.originalNewTarget ?? nextGoal.newProblemsTarget,
          originalReviewTarget: nextGoal.originalReviewTarget ?? nextGoal.reviewProblemsTarget,
          carriedOverProblems: (nextGoal.carriedOverProblems || 0) + carryOver,
          adjustmentReason: [nextGoal.adjustmentReason, `繰越${carryOver}問`].filter(Boolean).join(', '),
          updatedAt: new Date(),
        });
        result.carryOver = carryOver;
        result.adjustedGoalId = nextGoal.id;
      }
    }

    // 2. SM-2復習枠の拡張（#7: フェーズ別パラメータ）
    const dueCards = await spacedRepetitionService.getDueCards(200);
    const planCategories = new Set(plan.targetCategories);
    const planDueCards = dueCards.filter(c => c.category && planCategories.has(c.category));
    const { threshold: reviewThreshold, maxRatio: reviewMaxRatio } = REVIEW_EXPANSION[currentPhase];

    if (planDueCards.length > nextGoal.reviewProblemsTarget * reviewThreshold) {
      const expandedReview = Math.min(planDueCards.length, Math.floor(maxProblemsPerDay * reviewMaxRatio));
      const expansion = expandedReview - nextGoal.reviewProblemsTarget;

      if (expansion > 0) {
        const newNewTarget = Math.max(0, maxProblemsPerDay - expandedReview);
        await dailyGoalService.update(nextGoal.id!, {
          reviewProblemsTarget: expandedReview,
          newProblemsTarget: newNewTarget,
          totalProblemsTarget: Math.min(newNewTarget + expandedReview, maxProblemsPerDay),
          // #11: 調整追跡
          originalNewTarget: nextGoal.originalNewTarget ?? nextGoal.newProblemsTarget,
          originalReviewTarget: nextGoal.originalReviewTarget ?? nextGoal.reviewProblemsTarget,
          expandedReview: (nextGoal.expandedReview || 0) + expansion,
          adjustmentReason: [nextGoal.adjustmentReason, `復習枠+${expansion}問`].filter(Boolean).join(', '),
          updatedAt: new Date(),
        });
        result.reviewExpansion = expansion;
        result.adjustedGoalId = nextGoal.id;
      }
    }

    // 3. 低正答率カテゴリの追加復習
    if (todayGoal.accuracy !== undefined && todayGoal.accuracy < LOW_ACCURACY_THRESHOLD) {
      // 正答率が低い場合、翌日に同カテゴリの復習を追加
      const existingCategories = nextGoal.categories || [];
      const todayCategories = todayGoal.categories || [];

      if (todayCategories.length > 0) {
        const lowAccuracyCategory = todayCategories[0]; // 主要カテゴリ
        const alreadyHas = existingCategories.some(c => c.name === lowAccuracyCategory.name);

        if (!alreadyHas) {
          const additionalReview = Math.min(5, Math.floor(maxProblemsPerDay * 0.2));
          const updatedCategories = [
            ...existingCategories,
            {
              name: lowAccuracyCategory.name,
              problemCount: additionalReview,
              priority: 5,
              reason: '低正答率復習',
            },
          ];

          await dailyGoalService.update(nextGoal.id!, {
            categories: updatedCategories,
            reviewProblemsTarget: nextGoal.reviewProblemsTarget + additionalReview,
            totalProblemsTarget: Math.min(
              nextGoal.totalProblemsTarget + additionalReview,
              maxProblemsPerDay
            ),
            updatedAt: new Date(),
          });
          result.extraReviewAdded = true;
          result.adjustedGoalId = nextGoal.id;
        }
      }
    }
    // #12: 調整ログを記録
    if (result.carryOver > 0 || result.reviewExpansion > 0 || result.extraReviewAdded) {
      const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
      if (result.carryOver > 0) {
        changes.push({ field: 'carryOver', oldValue: 0, newValue: result.carryOver });
      }
      if (result.reviewExpansion > 0) {
        changes.push({ field: 'reviewExpansion', oldValue: 0, newValue: result.reviewExpansion });
      }
      if (result.extraReviewAdded) {
        changes.push({ field: 'extraReview', oldValue: false, newValue: true });
      }
      try {
        await planAdjustmentService.add({
          planId,
          trigger: 'quiz_complete',
          status: 'auto_applied',
          title: '日次自動調整',
          description: [
            result.carryOver > 0 ? `繰越${result.carryOver}問` : '',
            result.reviewExpansion > 0 ? `復習枠+${result.reviewExpansion}問` : '',
            result.extraReviewAdded ? '低正答率復習追加' : '',
          ].filter(Boolean).join(' / '),
          changes,
          createdAt: new Date(),
        });
      } catch { /* ログ記録失敗は無視 */ }
    }
  } catch (error) {
    console.warn('日次調整エラー:', error);
  }

  return result;
}

/**
 * 週次リバランス - 自動(設定ON時) or 手動ボタンで実行
 *
 * 1. フェーズ判定（残り期間に応じてearly/mid/late）
 * 2. 未来のDailyGoalsを削除して再生成
 * 3. フェーズ別の新規:復習比率で配分
 */
export async function performWeeklyRebalance(planId: number): Promise<WeeklyRebalanceResult> {
  const plan = await studyPlanService.getById(planId);
  if (!plan) {
    return { phase: 'early', deletedGoals: 0, regeneratedGoals: 0, summary: 'プランが見つかりません' };
  }

  // 1. フェーズ判定
  const phase = determinePhase(plan);

  // 2. 未来の未完了DailyGoalsを削除
  const allGoals = await dailyGoalService.getByPlanId(planId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureIncompleteGoals = allGoals.filter(g => {
    const goalDate = new Date(g.date);
    goalDate.setHours(0, 0, 0, 0);
    return goalDate > today && !g.isCompleted;
  });

  // 削除
  for (const goal of futureIncompleteGoals) {
    if (goal.id) {
      await db.dailyGoals.delete(goal.id);
    }
  }

  // 3. 残りの学習日を再計算
  const examDate = new Date(plan.examDate);
  examDate.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 学習日を生成
  const studyDates: Date[] = [];
  const current = new Date(tomorrow);
  while (current <= examDate) {
    if (plan.studyDaysOfWeek.includes(current.getDay())) {
      studyDates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  if (studyDates.length === 0) {
    return {
      phase,
      deletedGoals: futureIncompleteGoals.length,
      regeneratedGoals: 0,
      summary: '残りの学習日がありません',
    };
  }

  // 4. 残りの問題数を計算（完了分を差し引き）
  const completedGoals = allGoals.filter(g => g.isCompleted);
  const completedNew = completedGoals.reduce((sum, g) => sum + (g.actualNewProblems || 0), 0);
  const remainingProblems = Math.max(0, plan.totalProblemsTarget - completedNew);

  // 5. カテゴリ配分を再計算
  const categoryDistribution = plan.weaknessCategories.length > 0
    ? plan.weaknessCategories.map(w => ({
        name: w.category,
        problemCount: Math.ceil(remainingProblems * (w.weaknessScore / 100)),
        priority: w.priorityLevel,
        reason: w.accuracy < 0.5 ? '弱点強化' : '試験範囲',
      }))
    : plan.targetCategories.map(cat => ({
        name: cat,
        problemCount: Math.ceil(remainingProblems / plan.targetCategories.length),
        priority: 3,
        reason: '試験範囲',
      }));

  // 6. SM-2復習スケジュール取得
  let sm2ReviewSchedule = new Map<string, number>();
  const allCategoriesReviewSchedule = new Map<string, number>();
  try {
    const cards = await db.spacedRepetitionCards.toArray();
    const planCategories = new Set(plan.targetCategories);

    for (const card of cards) {
      if (!card.nextReviewDate) continue;
      const reviewDate = new Date(card.nextReviewDate);
      if (reviewDate < tomorrow || reviewDate > examDate) continue;
      const dateKey = reviewDate.toISOString().split('T')[0];

      // 全カテゴリ
      const allPrev = allCategoriesReviewSchedule.get(dateKey) || 0;
      allCategoriesReviewSchedule.set(dateKey, allPrev + 1);

      // 対象カテゴリ
      if (!card.category || planCategories.has(card.category)) {
        const prev = sm2ReviewSchedule.get(dateKey) || 0;
        sm2ReviewSchedule.set(dateKey, prev + 1);
      }
    }
  } catch (e) {
    console.warn('SM-2スケジュール取得エラー:', e);
  }

  // 7. 日次目標を再生成
  const newGoals = generateDailyGoals({
    planId,
    studyDates,
    startDate: tomorrow,
    endDate: examDate,
    categoryDistribution,
    sm2ReviewSchedule,
    allCategoriesReviewSchedule,
    availableTimePerDay: plan.availableTimePerDay,
  });

  // 8. DBに保存
  for (const goal of newGoals) {
    await db.dailyGoals.add(goal);
  }

  // 9. プランのフェーズと最終リバランス日を更新
  await studyPlanService.update(planId, {
    currentPhase: phase,
    lastWeeklyRebalance: new Date(),
    updatedAt: new Date(),
  });

  const summaryParts = [
    `フェーズ: ${phase === 'early' ? '序盤' : phase === 'mid' ? '中盤' : '終盤'}`,
    `残り問題: ${remainingProblems}問`,
    `再生成: ${newGoals.length}日分`,
    `新規:復習 = ${Math.round(PHASE_NEW_REVIEW_RATIO[phase] * 100)}:${Math.round((1 - PHASE_NEW_REVIEW_RATIO[phase]) * 100)}`,
  ];

  const summary = summaryParts.join(' | ');

  // #12: リバランスログ記録
  try {
    await planAdjustmentService.add({
      planId,
      trigger: 'weekly_rebalance',
      status: 'auto_applied',
      title: '週次リバランス',
      description: summary,
      changes: [
        { field: 'phase', oldValue: plan.currentPhase || 'unknown', newValue: phase },
        { field: 'deletedGoals', oldValue: futureIncompleteGoals.length, newValue: 0 },
        { field: 'regeneratedGoals', oldValue: 0, newValue: newGoals.length },
        { field: 'remainingProblems', oldValue: plan.totalProblemsTarget, newValue: remainingProblems },
      ],
      createdAt: new Date(),
    });
  } catch { /* ログ記録失敗は無視 */ }

  return {
    phase,
    deletedGoals: futureIncompleteGoals.length,
    regeneratedGoals: newGoals.length,
    summary,
  };
}

/**
 * 週次リバランスが必要かチェック
 */
export function shouldAutoRebalance(plan: StudyPlan): boolean {
  if (!plan.autoRebalanceWeekly && plan.autoRebalanceWeekly !== undefined) return false;

  // デフォルトはtrue
  if (!plan.lastWeeklyRebalance) return true;

  const lastRebalance = new Date(plan.lastWeeklyRebalance);
  const daysSinceRebalance = Math.floor(
    (Date.now() - lastRebalance.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceRebalance >= 7;
}

// ──────────────────────────────────────────────
// 予測スコア計算
// ──────────────────────────────────────────────

export interface PredictedScoreResult {
  predictedScore: number;       // 予測スコア (0-100)
  latestMockScore: number;      // 最新模試スコア
  coverageProgress: number;     // カバレッジ進捗 (0-1)
  expectedGain: number;         // 予測上昇幅
  riskLevel: 'low' | 'medium' | 'high'; // リスクレベル
  confidence: number;           // 信頼度 (0-1): 模試回数が多いほど高い
}

/**
 * 予測スコアを計算
 *
 * 計算式: predictedScore = latestMockScore + (coverageProgress × expectedGain)
 * - coverageProgress: 完了済み問題数 / 全問題ターゲット
 * - expectedGain: (targetScore - latestMockScore) × remainingCoverageRatio
 *
 * リスクレベル:
 * - low:    predictedScore >= targetScore
 * - medium: predictedScore >= targetScore × 0.9
 * - high:   それ未満
 */
export async function calculatePredictedScore(planId: number): Promise<PredictedScoreResult | null> {
  try {
    const plan = await studyPlanService.getById(planId);
    if (!plan) return null;

    // 最新の模試結果を取得
    const latestMock = await mockExamService.getLatest(planId);
    if (!latestMock) {
      // 模試未実施の場合は初期推定
      return calculateInitialPrediction(plan);
    }

    // カバレッジ進捗の計算
    const allGoals = await dailyGoalService.getByPlanId(planId);
    const completedNew = allGoals.reduce((sum, g) => sum + (g.actualNewProblems || 0), 0);
    const coverageProgress = plan.totalProblemsTarget > 0
      ? Math.min(1, completedNew / plan.totalProblemsTarget)
      : 0;

    // 模試回数から信頼度を計算
    const allMocks = await mockExamService.getByPlanId(planId);
    const confidence = Math.min(1, allMocks.length * 0.2); // 5回で信頼度1.0

    // 予測上昇幅: 残りカバレッジ × トレンドに基づく上昇期待値
    const remainingCoverage = 1 - coverageProgress;
    const targetScore = plan.targetScore ?? 80;
    const latestScore = latestMock.score;

    // #6: 模試スコアのトレンドを計算（3回以上で線形回帰、2回未満は保守的推定）
    let trendGainPerCoverage = 0;
    if (allMocks.length >= 3) {
      // 直近3回の線形回帰
      const sorted = [...allMocks].sort(
        (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
      );
      const recent = sorted.slice(-3);
      // 簡易線形回帰: (最新 - 最古) / サンプル数で平均上昇幅
      const scoreDiff = recent[recent.length - 1].score - recent[0].score;
      const coverageDiff = coverageProgress;
      trendGainPerCoverage = coverageDiff > 0.1 ? scoreDiff / coverageDiff : 0;
    } else if (allMocks.length === 2) {
      // 2回のみ: 信頼性低いため50%に割引
      const sorted = [...allMocks].sort(
        (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
      );
      const scoreDiff = sorted[1].score - sorted[0].score;
      const coverageDiff = coverageProgress;
      trendGainPerCoverage = coverageDiff > 0.1 ? (scoreDiff / coverageDiff) * 0.5 : 0;
    }

    // 予測上昇幅（トレンドなしは保守的に50%、上限はtargetScore + 5）
    const rawGain = trendGainPerCoverage > 0
      ? trendGainPerCoverage * remainingCoverage
      : (targetScore - latestScore) * remainingCoverage * 0.5;
    const expectedGain = Math.min(rawGain, targetScore + 5 - latestScore); // 上限キャップ

    const predictedScore = Math.min(100, Math.max(0, Math.round(latestScore + expectedGain)));

    // リスクレベル判定
    let riskLevel: 'low' | 'medium' | 'high';
    if (predictedScore >= targetScore) {
      riskLevel = 'low';
    } else if (predictedScore >= targetScore * 0.9) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return {
      predictedScore,
      latestMockScore: latestScore,
      coverageProgress,
      expectedGain: Math.round(expectedGain),
      riskLevel,
      confidence,
    };
  } catch (error) {
    console.warn('予測スコア計算エラー:', error);
    return null;
  }
}

/**
 * 模試未実施時の初期予測
 */
async function calculateInitialPrediction(plan: StudyPlan): Promise<PredictedScoreResult> {
  const allGoals = await dailyGoalService.getByPlanId(plan.id!);
  const completedGoals = allGoals.filter(g => g.isCompleted);
  const avgAccuracy = completedGoals.length > 0
    ? completedGoals.reduce((sum, g) => sum + (g.accuracy || 0), 0) / completedGoals.length
    : 0;

  const completedNew = completedGoals.reduce((sum, g) => sum + (g.actualNewProblems || 0), 0);
  const coverageProgress = plan.totalProblemsTarget > 0
    ? Math.min(1, completedNew / plan.totalProblemsTarget)
    : 0;

  // DailyGoalの平均正答率から初期スコアを推定
  const estimatedScore = Math.round(avgAccuracy);
  const remainingCoverage = 1 - coverageProgress;
  const targetScore = plan.targetScore ?? 80;
  const expectedGain = Math.round((targetScore - estimatedScore) * remainingCoverage * 0.5);
  const predictedScore = Math.min(100, Math.max(0, estimatedScore + expectedGain));

  let riskLevel: 'low' | 'medium' | 'high';
  if (predictedScore >= targetScore) {
    riskLevel = 'low';
  } else if (predictedScore >= targetScore * 0.9) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    predictedScore,
    latestMockScore: estimatedScore,
    coverageProgress,
    expectedGain,
    riskLevel,
    confidence: 0.1, // 模試未実施なので低信頼度
  };
}
