/**
 * 弱点検出システムの型定義
 */

/**
 * カテゴリー別統計情報
 */
export interface CategoryStat {
  id?: number; // IndexedDB用ID
  category: string; // カテゴリー名
  totalAttempts: number; // 総解答数
  correctAttempts: number; // 正解数
  accuracy: number; // 正解率 (0-1)
  lastStudyDate: Date; // 最終学習日
  daysSinceLastStudy: number; // 最終学習からの日数
  problemCount: number; // カテゴリー内の問題数
  analyzedAt?: Date; // 分析日時（IndexedDB保存時）
}

/**
 * 弱点分野
 */
export interface WeakArea {
  category: string; // カテゴリー名
  accuracy: number; // 正解率 (0-1)
  totalAttempts: number; // 総解答数
  weaknessScore: number; // 弱点スコア（高いほど苦手）
  recommendedProblemCount: number; // 推奨問題数
}

/**
 * 弱点サマリー
 */
export interface WeaknessSummary {
  topWeaknesses: WeakArea[]; // 上位3つの弱点分野
  overallAccuracy: number; // 全体正解率 (0-1)
  totalCategories: number; // 総カテゴリー数
  improvableAreas: number; // 改善可能な分野数（正解率60%未満）
  lastAnalyzedAt: Date; // 最終分析日時
}

/**
 * 推奨問題情報
 */
export interface RecommendedProblem {
  problemId: number; // 問題ID
  category: string; // カテゴリー
  accuracy: number; // この問題の正解率
  priority: number; // 優先度スコア（高いほど優先）
  reason: string; // 推奨理由
}
