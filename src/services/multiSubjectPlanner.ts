/**
 * Multi-Subject Planner Service - 多科目同時プランニングサービス
 *
 * マスタープラン Phase 1-3 の実装。
 * 複数科目の優先度を算出し、問題配分を自動生成する。
 *
 * === 優先度スコア算出式 ===
 *   優先度スコア = 残日数係数 × 苦手係数 × 重要度係数 × 未学習量係数
 *
 * === 係数の計算方法 ===
 * | 係数       | 計算方法                                      |
 * |-----------|----------------------------------------------|
 * | 残日数係数 | 〜30日:×2.0 / 31〜60日:×1.5 / 61日〜:×1.0      |
 * | 苦手係数   | 正答率〜40%:×2.0 / 41〜70%:×1.5 / 71%〜:×1.0   |
 * | 重要度係数 | プリセット / 手動 / 均等配分                    |
 * | 未学習量   | 進捗0%:×2.0 / 50%:×1.5 / 100%:×1.0            |
 *
 * === 重要度係数の設定方式 ===
 * 1. preset  : プリセットの配点データから変換
 * 2. manual  : 手動指定（low=1.2 / mid=1.5 / high=2.0 / カスタム数値）
 * 3. uniform : 全科目 1.0（デフォルト）
 *
 * @module multiSubjectPlanner
 */

import type {
  Subject,
  ImportanceMode,
  ImportanceLevel,
  PriorityScoreBreakdown,
  MultiSubjectAllocation,
  MultiSubjectPlanConfig,
  MultiSubjectPlanResult,
} from '../types/multiSubject';
import {
  getPresetById,
  convertPresetWeightsToCoefficients,
} from '../lib/examPresets';
import { db, problemService, historyService } from '../lib/database';
import { getAnalysis } from './subtopicAnalysisService';

// ============================================================
// 定数
// ============================================================

/** 手動モードのレベル → 係数マッピング */
const MANUAL_LEVEL_TO_COEFFICIENT: Record<ImportanceLevel, number> = {
  low: 1.2,
  mid: 1.5,
  high: 2.0,
};

/** デフォルト重要度係数（均等モード） */
const DEFAULT_IMPORTANCE_COEFFICIENT = 1.0;

/** 1問あたりの平均解答時間（分） - studyPlanGeneratorと同じ値 */
const AVERAGE_TIME_PER_PROBLEM_MINUTES = 3;

// ============================================================
// 係数計算関数（マスタープラン仕様に準拠）
// ============================================================

/**
 * 残日数係数を計算
 *
 * マスタープラン仕様:
 * - 〜30日: ×2.0
 * - 31〜60日: ×1.5
 * - 61日〜: ×1.0
 *
 * @param daysUntilExam 試験日までの日数
 * @returns 残日数係数
 */
export function calculateDaysRemainingFactor(daysUntilExam: number): number {
  if (daysUntilExam <= 0) return 2.0; // 試験日当日・過ぎている → 最優先
  if (daysUntilExam <= 30) return 2.0;
  if (daysUntilExam <= 60) return 1.5;
  return 1.0;
}

/**
 * 苦手係数を計算
 *
 * マスタープラン仕様:
 * - 正答率 0〜40%: ×2.0
 * - 正答率 41〜70%: ×1.5
 * - 正答率 71〜100%: ×1.0
 *
 * @param accuracy 現在の正答率（0-100）
 * @returns 苦手係数
 */
export function calculateWeaknessFactor(accuracy: number): number {
  // 未学習（データなし）は苦手と判定せず中間値
  if (accuracy < 0) return 1.5;
  if (accuracy <= 40) return 2.0;
  if (accuracy <= 70) return 1.5;
  return 1.0;
}

/**
 * 未学習量係数を計算
 *
 * マスタープラン仕様:
 * - 進捗 0%: ×2.0
 * - 進捗 50%: ×1.5
 * - 進捗 100%: ×1.0
 *
 * 補間: 0〜50%は2.0→1.5の線形、50〜100%は1.5→1.0の線形
 *
 * @param progressPercentage 進捗率（0-100）
 * @returns 未学習量係数
 */
export function calculateIncompleteFactor(progressPercentage: number): number {
  const clamped = Math.max(0, Math.min(100, progressPercentage));

  if (clamped <= 50) {
    // 0% → 2.0, 50% → 1.5 の線形補間
    return 2.0 - (clamped / 50) * 0.5;
  } else {
    // 50% → 1.5, 100% → 1.0 の線形補間
    return 1.5 - ((clamped - 50) / 50) * 0.5;
  }
}

/**
 * 手動重要度設定を数値に変換
 *
 * @param value ImportanceLevel ('low'|'mid'|'high') または 数値
 * @returns 重要度係数
 */
function resolveManualImportance(value: ImportanceLevel | number): number {
  if (typeof value === 'number') {
    // カスタム数値: 1.0〜2.0の範囲にクランプ
    return Math.max(1.0, Math.min(2.0, value));
  }
  return MANUAL_LEVEL_TO_COEFFICIENT[value] ?? DEFAULT_IMPORTANCE_COEFFICIENT;
}

/**
 * 重要度係数を解決する - 設定モードに応じて科目の重要度を決定
 *
 * @param subject 対象科目
 * @param mode 設定モード
 * @param options プリセットID または手動設定値
 * @returns 重要度係数
 */
export function resolveImportanceCoefficient(
  subject: Subject,
  mode: ImportanceMode,
  options?: {
    presetId?: string;
    manualWeights?: Record<string, ImportanceLevel | number>;
    presetMapping?: Record<string, string>;
    /** Pre-resolved weights for custom presets (async DB lookup done before calling) */
    resolvedWeights?: Record<string, number>;
    /** Weights computed from subtopic analysis data (analyzed mode) */
    analyzedWeights?: Record<string, number>;
  }
): number {
  switch (mode) {
    case 'preset': {
      if (!options?.presetId) return DEFAULT_IMPORTANCE_COEFFICIENT;

      // resolvedWeights があればそれを使う (カスタムプリセット対応)
      let coefficients: Record<string, number>;
      if (options.resolvedWeights) {
        coefficients = convertPresetWeightsToCoefficients(options.resolvedWeights);
      } else {
        const preset = getPresetById(options.presetId);
        if (!preset) return DEFAULT_IMPORTANCE_COEFFICIENT;
        coefficients = convertPresetWeightsToCoefficients(preset.weights);
      }

      // マッピングが指定されていればマッピング経由で探す
      if (options.presetMapping) {
        const mappedName =
          options.presetMapping[subject.name] ??
          options.presetMapping[subject.categoryName];
        if (mappedName && coefficients[mappedName] !== undefined) {
          return coefficients[mappedName];
        }
      }

      // フォールバック: 直接名前で探す
      return (
        coefficients[subject.name] ??
        coefficients[subject.categoryName] ??
        DEFAULT_IMPORTANCE_COEFFICIENT
      );
    }

    case 'manual': {
      if (!options?.manualWeights) return DEFAULT_IMPORTANCE_COEFFICIENT;
      const value =
        options.manualWeights[subject.id] ??
        options.manualWeights[subject.name] ??
        options.manualWeights[subject.categoryName];
      if (value === undefined) return DEFAULT_IMPORTANCE_COEFFICIENT;
      return resolveManualImportance(value);
    }

    case 'analyzed': {
      if (!options?.analyzedWeights) return DEFAULT_IMPORTANCE_COEFFICIENT;
      const weight =
        options.analyzedWeights[subject.name] ??
        options.analyzedWeights[subject.categoryName];
      if (weight === undefined) return DEFAULT_IMPORTANCE_COEFFICIENT;
      return Math.max(1.0, Math.min(2.0, weight));
    }

    case 'uniform':
    default:
      return DEFAULT_IMPORTANCE_COEFFICIENT;
  }
}

// ============================================================
// 分析データベースの重要度係数構築
// ============================================================

/**
 * サブトピック分析データからカテゴリーレベルの重要度係数を算出
 *
 * 各カテゴリーの分析済み問題数の相対比率で係数を決定:
 *   coefficient = 1.0 + (totalProblems / maxTotalProblems)
 *
 * @param examId プリセットID
 * @param categories 対象カテゴリー名配列
 * @returns カテゴリー名 → 重要度係数 (1.0〜2.0)
 */
export async function buildAnalyzedWeights(
  examId: string,
  categories: string[]
): Promise<Record<string, number>> {
  const weights: Record<string, number> = {};
  const totals: Record<string, number> = {};

  for (const category of categories) {
    const analysis = await getAnalysis(examId, category);
    if (analysis && analysis.totalProblemsAnalyzed > 0) {
      totals[category] = analysis.totalProblemsAnalyzed;
    }
  }

  const maxTotal = Math.max(...Object.values(totals), 1);

  for (const category of categories) {
    if (totals[category] !== undefined) {
      weights[category] = 1.0 + (totals[category] / maxTotal);
    } else {
      weights[category] = 1.0; // 分析データなし → 均等
    }
  }

  return weights;
}

// ============================================================
// 優先度スコア計算
// ============================================================

/**
 * 試験日までの残日数を計算
 */
function getDaysUntilExam(examDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(examDate);
  target.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / msPerDay));
}

/**
 * 単一科目の優先度スコアを算出
 *
 * 公式: 優先度スコア = 残日数係数 × 苦手係数 × 重要度係数 × 未学習量係数
 *
 * @param subject 対象科目
 * @param daysUntilExam 試験日までの日数
 * @param mode 重要度設定モード
 * @param options プリセット/手動設定
 * @returns スコア内訳
 */
export function calculatePriorityScore(
  subject: Subject,
  daysUntilExam: number,
  mode: ImportanceMode,
  options?: {
    presetId?: string;
    manualWeights?: Record<string, ImportanceLevel | number>;
    presetMapping?: Record<string, string>;
    resolvedWeights?: Record<string, number>;
    analyzedWeights?: Record<string, number>;
  }
): PriorityScoreBreakdown {
  // 4つの係数を個別に計算
  const daysRemainingFactor = calculateDaysRemainingFactor(daysUntilExam);
  const weaknessFactor = calculateWeaknessFactor(subject.currentAccuracy);
  const importanceFactor = resolveImportanceCoefficient(subject, mode, options);
  const incompleteFactor = calculateIncompleteFactor(subject.progressPercentage);

  // 最終スコア = 4係数の積
  const finalScore =
    daysRemainingFactor * weaknessFactor * importanceFactor * incompleteFactor;

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    finalScore,
    daysRemainingFactor,
    weaknessFactor,
    importanceFactor,
    incompleteFactor,
    inputs: {
      daysUntilExam,
      currentAccuracy: subject.currentAccuracy,
      progressPercentage: subject.progressPercentage,
    },
  };
}

// ============================================================
// 問題配分ロジック
// ============================================================

/**
 * 優先度スコアに基づいて問題数を配分
 *
 * 配分アルゴリズム:
 * 1. 各科目のスコア比率を計算
 * 2. 1日の総問題数をスコア比率で配分
 * 3. 各科目の最小保証問題数は1問/日
 * 4. 端数は最高スコアの科目に加算
 *
 * @param breakdowns 各科目のスコア内訳
 * @param totalProblemsPerDay 1日の総問題数
 * @param daysUntilExam 試験日までの日数
 * @returns 配分結果
 */
export function allocateProblemsByScore(
  breakdowns: PriorityScoreBreakdown[],
  totalProblemsPerDay: number,
  daysUntilExam: number
): Map<string, { perDay: number; total: number; percentage: number }> {
  const result = new Map<string, { perDay: number; total: number; percentage: number }>();

  if (breakdowns.length === 0 || totalProblemsPerDay <= 0) {
    return result;
  }

  // 合計スコア
  const totalScore = breakdowns.reduce((sum, b) => sum + b.finalScore, 0);
  if (totalScore <= 0) {
    // スコアゼロ → 均等配分
    const perDay = Math.floor(totalProblemsPerDay / breakdowns.length);
    const percentage = 100 / breakdowns.length;
    for (const b of breakdowns) {
      result.set(b.subjectId, {
        perDay: Math.max(1, perDay),
        total: Math.max(1, perDay) * daysUntilExam,
        percentage,
      });
    }
    return result;
  }

  // スコア比率で配分
  let allocated = 0;
  const sortedBreakdowns = [...breakdowns].sort((a, b) => b.finalScore - a.finalScore);

  for (const b of sortedBreakdowns) {
    const ratio = b.finalScore / totalScore;
    const perDay = Math.max(1, Math.round(totalProblemsPerDay * ratio));
    const percentage = ratio * 100;

    result.set(b.subjectId, {
      perDay,
      total: perDay * daysUntilExam,
      percentage,
    });
    allocated += perDay;
  }

  // 配分調整: 端数の吸収（最高スコア科目へ）
  const diff = totalProblemsPerDay - allocated;
  if (diff !== 0 && sortedBreakdowns.length > 0) {
    const topSubjectId = sortedBreakdowns[0].subjectId;
    const existing = result.get(topSubjectId);
    if (existing) {
      const adjustedPerDay = Math.max(1, existing.perDay + diff);
      result.set(topSubjectId, {
        ...existing,
        perDay: adjustedPerDay,
        total: adjustedPerDay * daysUntilExam,
      });
    }
  }

  return result;
}

/**
 * 推奨理由を生成（UI表示用）
 */
function generateReason(breakdown: PriorityScoreBreakdown): string {
  const reasons: string[] = [];

  if (breakdown.daysRemainingFactor >= 2.0) {
    reasons.push('試験日が近い');
  } else if (breakdown.daysRemainingFactor >= 1.5) {
    reasons.push('試験日まで余裕あり');
  }

  if (breakdown.weaknessFactor >= 2.0) {
    reasons.push('苦手分野');
  } else if (breakdown.weaknessFactor >= 1.5) {
    reasons.push('改善余地あり');
  }

  if (breakdown.importanceFactor >= 1.8) {
    reasons.push('最重要科目');
  } else if (breakdown.importanceFactor >= 1.4) {
    reasons.push('重要科目');
  }

  if (breakdown.incompleteFactor >= 1.8) {
    reasons.push('未学習');
  } else if (breakdown.incompleteFactor >= 1.4) {
    reasons.push('進捗途中');
  }

  return reasons.length > 0 ? reasons.join(' / ') : '通常学習';
}

// ============================================================
// メイン: マルチ科目プラン生成
// ============================================================

/**
 * マルチ科目学習プランを生成
 *
 * 複数科目の優先度スコアを算出し、問題配分を決定する。
 *
 * @param config プラン設定
 * @returns 生成結果
 */
export function generateMultiSubjectPlan(
  config: MultiSubjectPlanConfig
): MultiSubjectPlanResult {
  // === Validation ===
  if (config.subjects.length === 0) {
    throw new Error('対象科目を1つ以上指定してください');
  }
  if (config.totalTimePerDay < 10) {
    throw new Error('1日の学習時間は最低10分以上必要です');
  }

  const daysUntilExam = getDaysUntilExam(config.examDate);
  if (daysUntilExam <= 0) {
    throw new Error('試験日は未来の日付である必要があります');
  }

  // === Step 1: 全科目の優先度スコアを計算 ===
  const breakdowns: PriorityScoreBreakdown[] = config.subjects.map((subject) =>
    calculatePriorityScore(subject, daysUntilExam, config.importanceMode, {
      presetId: config.presetId,
      manualWeights: config.manualWeights,
    })
  );

  // === Step 2: 1日の総問題数を計算 ===
  const totalProblemsPerDay = Math.max(
    1,
    Math.floor(config.totalTimePerDay / AVERAGE_TIME_PER_PROBLEM_MINUTES)
  );

  // === Step 3: スコア比率で問題を配分 ===
  const allocationMap = allocateProblemsByScore(
    breakdowns,
    totalProblemsPerDay,
    daysUntilExam
  );

  // === Step 4: 配分結果を構造化 ===
  const allocations: MultiSubjectAllocation[] = config.subjects.map((subject) => {
    const breakdown = breakdowns.find((b) => b.subjectId === subject.id)!;
    const allocation = allocationMap.get(subject.id) ?? {
      perDay: 1,
      total: daysUntilExam,
      percentage: 0,
    };

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      categoryName: subject.categoryName,
      priorityScore: breakdown.finalScore,
      breakdown,
      totalProblemsAllocated: allocation.total,
      problemsPerDay: allocation.perDay,
      allocationPercentage: allocation.percentage,
      reason: generateReason(breakdown),
    };
  });

  // === Step 5: 優先度順にソート ===
  allocations.sort((a, b) => b.priorityScore - a.priorityScore);

  // === Step 6: 推奨順序を生成 ===
  const recommendedOrder = allocations.map((a) => a.subjectId);

  // === Step 7: 総問題数 ===
  const totalProblems = allocations.reduce(
    (sum, a) => sum + a.totalProblemsAllocated,
    0
  );

  return {
    allocations,
    totalProblems,
    daysUntilExam,
    recommendedOrder,
    generatedAt: new Date(),
  };
}

// ============================================================
// データ取得ヘルパー: 既存DBからSubject配列を構築
// ============================================================

/**
 * IndexedDBからSubject情報を自動構築
 *
 * 指定されたカテゴリー名のリストから、履歴と問題数を集計して
 * Subject配列を生成する。
 *
 * @param categoryNames 対象カテゴリー名の配列
 * @returns Subject配列
 */
export async function buildSubjectsFromCategories(
  categoryNames: string[]
): Promise<Subject[]> {
  const subjects: Subject[] = [];

  // 履歴を一括取得（効率化）
  const allHistory = await historyService.getAll();

  for (const categoryName of categoryNames) {
    // カテゴリー内の全問題数
    const categoryProblems = await problemService.getByCategory(categoryName);
    const totalProblemCount = categoryProblems.length;

    if (totalProblemCount === 0) continue;

    // 該当カテゴリーの問題IDセット
    const problemIds = new Set(
      categoryProblems.map((p) => p.id).filter((id): id is number => id !== undefined)
    );

    // 履歴からこのカテゴリーの解答を抽出
    const categoryHistory = allHistory.filter((h) =>
      problemIds.has(h.problemId)
    );

    // 解答済み問題IDのユニークセット
    const answeredProblemIds = new Set(categoryHistory.map((h) => h.problemId));
    const answeredCount = answeredProblemIds.size;

    // 正答率計算（全履歴の中での正解率）
    let currentAccuracy = 0;
    if (categoryHistory.length > 0) {
      const correctCount = categoryHistory.filter((h) => h.isCorrect).length;
      currentAccuracy = (correctCount / categoryHistory.length) * 100;
    }

    // 進捗率
    const progressPercentage =
      totalProblemCount > 0 ? (answeredCount / totalProblemCount) * 100 : 0;

    // 最終学習日
    let lastStudiedAt: Date | undefined;
    if (categoryHistory.length > 0) {
      const latestHistory = categoryHistory.reduce((latest, h) => {
        const hDate = new Date(h.timestamp);
        return hDate > latest ? hDate : latest;
      }, new Date(0));
      lastStudiedAt = latestHistory;
    }

    subjects.push({
      id: `subject_${categoryName}`,
      name: categoryName,
      categoryName,
      importanceCoefficient: DEFAULT_IMPORTANCE_COEFFICIENT,
      currentAccuracy,
      answeredCount,
      totalProblemCount,
      progressPercentage,
      lastStudiedAt,
    });
  }

  return subjects;
}

/**
 * 全カテゴリーからSubject配列を構築（便利関数）
 */
export async function buildAllSubjects(): Promise<Subject[]> {
  // 全問題から一意のカテゴリー一覧を取得
  const allProblems = await db.problems.toArray();
  const categorySet = new Set<string>();
  for (const p of allProblems) {
    if (p.category) categorySet.add(p.category);
  }

  return buildSubjectsFromCategories(Array.from(categorySet));
}
