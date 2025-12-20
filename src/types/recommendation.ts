/**
 * 推奨システムの型定義
 */

import type { Problem } from './index';

/**
 * 推奨スコアの構成要素
 */
export interface RecommendationScoreComponents {
  weaknessScore: number; // 弱点スコア (0-100)
  timeScore: number; // 復習時間スコア (0-100)
  difficultyScore: number; // 難易度適合スコア (0-100)
  totalScore: number; // 総合スコア (0-100)
}

/**
 * 推奨問題
 */
export interface RecommendedProblem {
  problem: Problem;
  score: RecommendationScoreComponents;
  reason: string; // 推奨理由
  priority: 'high' | 'medium' | 'low'; // 優先度
  estimatedDifficulty: number; // 推定難易度 (0-100)
}

/**
 * 推奨セット
 */
export interface RecommendationSet {
  id: string;
  title: string;
  description: string;
  problems: RecommendedProblem[];
  targetCategory?: string;
  estimatedTime: number; // 推定所要時間（分）
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
}

/**
 * ユーザーの学習パフォーマンス
 */
export interface UserPerformance {
  overallAccuracy: number; // 全体正解率 (0-1)
  recentAccuracy: number; // 最近の正解率 (0-1)
  averageTimePerProblem: number; // 平均解答時間（秒）
  totalProblems: number; // 総解答数
  streak: number; // 連続学習日数
  weakCategories: string[]; // 苦手カテゴリー
  strongCategories: string[]; // 得意カテゴリー
}

/**
 * 難易度レベル
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * ユーザーの難易度プロファイル
 */
export interface UserDifficultyProfile {
  currentLevel: DifficultyLevel;
  targetAccuracy: number; // 目標正解率 (0-1)
  adaptiveThreshold: number; // 難易度調整閾値 (0-1)
  categoryLevels: Map<string, DifficultyLevel>; // カテゴリー別レベル
}

/**
 * 推奨アルゴリズムの設定
 */
export interface RecommendationConfig {
  weaknessWeight: number; // 弱点の重み (0-1)
  timeWeight: number; // 時間の重み (0-1)
  difficultyWeight: number; // 難易度の重み (0-1)
  maxRecommendations: number; // 最大推奨数
  minScore: number; // 最小スコア閾値 (0-100)
  targetAccuracy: number; // 目標正解率 (0-1)
}

/**
 * デフォルト推奨設定
 */
export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  weaknessWeight: 0.4,
  timeWeight: 0.3,
  difficultyWeight: 0.3,
  maxRecommendations: 20,
  minScore: 20,
  targetAccuracy: 0.7,
};

/**
 * 難易度レベルの定義
 */
export const DIFFICULTY_LEVELS: Record<DifficultyLevel, { min: number; max: number; label: string }> = {
  beginner: { min: 0, max: 0.3, label: '初級' },
  intermediate: { min: 0.3, max: 0.6, label: '中級' },
  advanced: { min: 0.6, max: 0.85, label: '上級' },
  expert: { min: 0.85, max: 1.0, label: 'エキスパート' },
};
