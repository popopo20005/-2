/**
 * Multi-Subject Planner Types - 多科目同時プランニング型定義
 *
 * マスタープラン Phase 1-3 に基づく、複数科目の優先度スコア算出と
 * 重要度係数一般化（プリセット/手動/均等）のための型定義。
 *
 * 優先度スコア算出式:
 *   優先度スコア = 残日数係数 × 苦手係数 × 重要度係数 × 未学習量係数
 *
 * 係数の計算方法:
 * - 残日数係数: 〜30日:×2.0 / 31〜60日:×1.5 / 61日〜:×1.0
 * - 苦手係数:   正答率〜40%:×2.0 / 41〜70%:×1.5 / 71%〜:×1.0
 * - 重要度係数: プリセット / 手動 / 均等配分
 * - 未学習量係数: 進捗0%:×2.0 / 50%:×1.5 / 100%:×1.0
 */

/**
 * 重要度係数の設定方式
 */
export type ImportanceMode = 'preset' | 'manual' | 'uniform' | 'analyzed';

/**
 * 重要度レベル（手動モード用）
 */
export type ImportanceLevel = 'low' | 'mid' | 'high';

/**
 * 科目情報 - 多科目プランニングの最小単位
 */
export interface Subject {
  /** 科目ID（内部管理用） */
  id: string;

  /** 科目名（例: "臨床栄養学"） */
  name: string;

  /** 対応する問題カテゴリー名（IndexedDBの problem.category と一致） */
  categoryName: string;

  /** 重要度係数（1.0-2.0） */
  importanceCoefficient: number;

  /** 現在の正答率（0-100） - 履歴から自動集計 */
  currentAccuracy: number;

  /** 解答済み問題数 */
  answeredCount: number;

  /** 対象問題総数（カテゴリー内の問題数） */
  totalProblemCount: number;

  /** 進捗率（0-100） - answeredCount/totalProblemCount */
  progressPercentage: number;

  /** 最終学習日（未学習の場合 undefined） */
  lastStudiedAt?: Date;

  /** UI表示色（任意） */
  color?: string;
}

/**
 * 重要度プリセット - 試験種類ごとの配点データ
 */
export interface ExamPreset {
  /** プリセットID（例: "kanri_eiyoushi"） */
  id: string;

  /** 試験名（例: "管理栄養士国家試験"） */
  name: string;

  /** カテゴリー（例: "medical", "business", "language"） */
  category: 'medical' | 'business' | 'language' | 'other';

  /** 説明 */
  description?: string;

  /** 科目別配点: { "臨床栄養学": 35, "基礎栄養学": 15, ... } */
  weights: Record<string, number>;
}

/**
 * 優先度スコアの内訳 - デバッグ・UI表示用
 */
export interface PriorityScoreBreakdown {
  /** 科目ID */
  subjectId: string;

  /** 科目名 */
  subjectName: string;

  /** 最終優先度スコア */
  finalScore: number;

  /** 残日数係数 */
  daysRemainingFactor: number;

  /** 苦手係数 */
  weaknessFactor: number;

  /** 重要度係数 */
  importanceFactor: number;

  /** 未学習量係数 */
  incompleteFactor: number;

  /** 入力値 */
  inputs: {
    daysUntilExam: number;
    currentAccuracy: number;
    progressPercentage: number;
  };
}

/**
 * マルチ科目プランニング結果 - 各科目への問題数配分
 */
export interface MultiSubjectAllocation {
  /** 科目ID */
  subjectId: string;

  /** 科目名 */
  subjectName: string;

  /** カテゴリー名 */
  categoryName: string;

  /** 優先度スコア */
  priorityScore: number;

  /** 優先度スコア内訳 */
  breakdown: PriorityScoreBreakdown;

  /** 配分された問題数（試験日まで合計） */
  totalProblemsAllocated: number;

  /** 1日あたりの問題数 */
  problemsPerDay: number;

  /** 配分率（全体に対する%） */
  allocationPercentage: number;

  /** 推奨理由（UIで表示） */
  reason: string;
}

/**
 * マルチ科目プラン設定
 */
export interface MultiSubjectPlanConfig {
  /** 対象科目一覧 */
  subjects: Subject[];

  /** 試験日 */
  examDate: Date;

  /** 1日の総学習可能時間（分） */
  totalTimePerDay: number;

  /** 重要度係数の設定モード */
  importanceMode: ImportanceMode;

  /** プリセットID（importanceMode === 'preset' の場合） */
  presetId?: string;

  /** 手動設定値（importanceMode === 'manual' の場合） */
  manualWeights?: Record<string, ImportanceLevel | number>;
}

/**
 * マルチ科目プラン生成結果
 */
export interface MultiSubjectPlanResult {
  /** 科目ごとの配分 */
  allocations: MultiSubjectAllocation[];

  /** 総問題数 */
  totalProblems: number;

  /** 試験日までの日数 */
  daysUntilExam: number;

  /** 推奨順位（優先度スコア順） */
  recommendedOrder: string[]; // subjectId の配列

  /** 生成日時 */
  generatedAt: Date;
}
