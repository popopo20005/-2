/**
 * 目標管理システムの型定義
 */

/**
 * 目標の種類
 */
export type GoalType = 'short' | 'medium' | 'long';

/**
 * 目標の単位
 */
export type GoalUnit = 'problems' | 'hours' | 'streak' | 'accuracy' | 'quizSets';

/**
 * 目標のステータス
 */
export type GoalStatus = 'active' | 'completed' | 'expired' | 'abandoned';

/**
 * 目標オブジェクト
 */
export interface Goal {
  id?: number; // IndexedDB自動採番
  type: GoalType; // 短期・中期・長期
  title: string; // 目標のタイトル
  description?: string; // 詳細説明
  targetValue: number; // 目標値
  currentValue: number; // 現在値
  unit: GoalUnit; // 単位
  deadline?: Date; // 期限（任意）
  status: GoalStatus; // ステータス
  createdAt: Date; // 作成日時
  updatedAt: Date; // 更新日時
  completedAt?: Date; // 達成日時
  category?: string; // カテゴリー（任意）
  quizSetId?: number; // 問題セットID（任意）
}

/**
 * 目標の進捗情報
 */
export interface GoalProgress {
  goal: Goal;
  progress: number; // 進捗率 (0-100)
  remaining: number; // 残り
  daysRemaining?: number; // 残り日数
  isOnTrack: boolean; // 順調かどうか
  estimatedCompletionDate?: Date; // 完了予想日
}

/**
 * 目標サマリー
 */
export interface GoalSummary {
  totalGoals: number; // 総目標数
  activeGoals: number; // アクティブな目標数
  completedGoals: number; // 達成済み目標数
  completionRate: number; // 達成率 (0-100)
  expiredGoals: number; // 期限切れ目標数
  averageProgress: number; // 平均進捗率 (0-100)
}

/**
 * 目標作成用の入力データ
 */
export interface CreateGoalInput {
  type: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  unit: GoalUnit;
  deadline?: Date;
  category?: string;
  quizSetId?: number;
}

/**
 * 目標更新用の入力データ
 */
export interface UpdateGoalInput {
  title?: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  deadline?: Date;
  status?: GoalStatus;
  category?: string;
}

/**
 * 目標のプリセット
 */
export interface GoalPreset {
  type: GoalType;
  title: string;
  description: string;
  targetValue: number;
  unit: GoalUnit;
  suggestedDeadlineDays: number;
}

/**
 * よく使われる目標のプリセット
 */
export const GOAL_PRESETS: GoalPreset[] = [
  // 短期目標
  {
    type: 'short',
    title: '今日10問解く',
    description: '今日中に10問の問題を解く',
    targetValue: 10,
    unit: 'problems',
    suggestedDeadlineDays: 1,
  },
  {
    type: 'short',
    title: '30分学習する',
    description: '今日30分間学習する',
    targetValue: 0.5,
    unit: 'hours',
    suggestedDeadlineDays: 1,
  },
  {
    type: 'short',
    title: '3日連続学習',
    description: '3日連続で学習する',
    targetValue: 3,
    unit: 'streak',
    suggestedDeadlineDays: 3,
  },
  // 中期目標
  {
    type: 'medium',
    title: '1週間で50問解く',
    description: '1週間で50問の問題を解く',
    targetValue: 50,
    unit: 'problems',
    suggestedDeadlineDays: 7,
  },
  {
    type: 'medium',
    title: '正解率80%達成',
    description: '全体の正解率を80%以上にする',
    targetValue: 80,
    unit: 'accuracy',
    suggestedDeadlineDays: 14,
  },
  {
    type: 'medium',
    title: '5時間学習する',
    description: '今週5時間学習する',
    targetValue: 5,
    unit: 'hours',
    suggestedDeadlineDays: 7,
  },
  // 長期目標
  {
    type: 'long',
    title: '1ヶ月で200問解く',
    description: '1ヶ月間で200問の問題を解く',
    targetValue: 200,
    unit: 'problems',
    suggestedDeadlineDays: 30,
  },
  {
    type: 'long',
    title: '30日連続学習',
    description: '30日間連続で学習する',
    targetValue: 30,
    unit: 'streak',
    suggestedDeadlineDays: 30,
  },
  {
    type: 'long',
    title: '正解率90%達成',
    description: '全体の正解率を90%以上にする',
    targetValue: 90,
    unit: 'accuracy',
    suggestedDeadlineDays: 60,
  },
];
