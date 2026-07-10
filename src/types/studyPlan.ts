/**
 * Study Plan Types - 試験日ベース学習プランナー型定義
 *
 * このファイルは試験日を基準とした逆算学習プランニングシステムの
 * データモデルを定義します。既存のSM-2スペースドリピティション、
 * 弱点分析、目標管理機能と統合されます。
 */

/**
 * リスクレベル - 学習計画の進捗状況に基づくリスク評価
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 目標タイプ - 試験の種類や重要度
 */
export type ExamType = 'midterm' | 'final' | 'mock' | 'qualification' | 'entrance' | 'certification' | 'other';

/**
 * 学習モード - 問題の選択戦略
 */
export type StudyMode = 'balanced' | 'weakness-focused' | 'review-only' | 'new-only';

/**
 * 日次目標 - 1日あたりの学習目標
 *
 * SM-2復習スケジュールと統合され、新規学習と復習を
 * バランスよく配分します。
 */
export interface DailyGoal {
  id?: number;
  planId: number; // 所属する学習プランID

  // 日付情報
  date: Date; // 学習予定日
  dayNumber: number; // プラン開始からの経過日数 (1, 2, 3...)
  isStudyDay: boolean; // 学習予定日かどうか

  // 学習目標
  newProblemsTarget: number; // 新規問題目標数
  reviewProblemsTarget: number; // 復習問題目標数 (SM-2ベース)
  totalProblemsTarget: number; // 合計目標数

  // カテゴリー配分
  categories: Array<{
    name: string;
    problemCount: number;
    priority: number; // 1-5 (5が最優先)
    reason: string; // "弱点強化", "試験範囲", "復習期限"
  }>;

  // 時間見積もり
  estimatedTime: number; // 分
  estimatedStartTime?: Date; // 推奨開始時刻

  // 実績
  isCompleted: boolean;
  completedAt?: Date;
  actualNewProblems: number;
  actualReviewProblems: number;
  actualTime?: number; // 実際の学習時間（分）
  accuracy?: number; // 正答率 (0-100)

  // 模試フラグ
  isMockExamDay?: boolean; // 模試実施日

  // #11: 調整追跡（初期生成時の値を保持し、調整分を分離）
  originalNewTarget?: number;     // 初期生成時の新規目標（不変）
  originalReviewTarget?: number;  // 初期生成時の復習目標（不変）
  carriedOverProblems?: number;   // 前日繰越分
  expandedReview?: number;        // SM-2復習拡張分
  adjustmentReason?: string;      // 調整理由

  // メタデータ
  notes?: string; // ユーザーメモ
  createdAt: Date;
  updatedAt: Date;
}

// 模試結果
export interface MockExamResult {
  id?: number;
  planId: number;
  examDate: Date;
  scope: 'full' | 'short';
  totalQuestions: number;
  correctAnswers: number;
  score: number; // 0-100
  categoryBreakdown: Array<{
    category: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
  createdAt: Date;
}

// マイルストーン
export interface Milestone {
  id?: number;
  planId: number;
  targetDate: Date;
  phase: 'early' | 'mid' | 'late';
  targetCoverage: number; // 0-100
  targetScore: number; // 0-100
  achievedCoverage?: number;
  achievedScore?: number;
  isAchieved: boolean;
  createdAt: Date;
}

/**
 * 学習プラン進捗 - リアルタイム進捗追跡
 */
export interface StudyPlanProgress {
  // 全体進捗
  totalDays: number; // プラン全体の日数
  elapsedDays: number; // 経過日数
  remainingDays: number; // 残り日数
  completedDays: number; // 完了した学習日数

  // 問題進捗
  totalProblemsTarget: number; // 目標問題総数（新規ベース）
  completedProblems: number; // 完了問題数（新規+復習の合計、後方互換用）
  completedNewProblems: number; // 新規完了問題数（メイン進捗指標）
  completedReviewProblems: number; // 復習完了問題数（補助指標）
  remainingProblems: number; // 残り問題数（新規ベース）
  progressPercentage: number; // 進捗率 (0-100、新規問題ベース)
  reviewProgressPercentage: number; // 復習進捗率 (0-100)

  // パフォーマンス指標
  averageAccuracy: number; // 平均正答率
  averageDailyProblems: number; // 1日平均問題数
  averageStudyTime: number; // 1日平均学習時間（分）

  // 予測
  projectedCompletionDate: Date; // 現在のペースでの完了予定日
  projectedScore: number; // 予測スコア (0-100)
  onTrack: boolean; // 計画通りか
  daysAheadOrBehind: number; // 計画より何日進んでいる/遅れているか

  // リスク評価
  riskLevel: RiskLevel;
  riskFactors: Array<{
    factor: string; // "学習遅延", "正答率低下", "復習未実施"
    severity: RiskLevel;
    description: string;
  }>;

  // 週次統計
  weeklyStats: Array<{
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    completedDays: number;
    problemsSolved: number;
    accuracy: number;
    studyTime: number;
  }>;
}

/**
 * 弱点カテゴリー情報
 */
export interface WeaknessInfo {
  category: string;
  accuracy: number;
  totalAnswered: number;
  weaknessScore: number; // 0-100 (高いほど弱点)
  lastStudied?: Date;
  priorityLevel: number; // 1-5
}

/**
 * 学習プラン - 試験日ベース学習計画の中核データ構造
 *
 * 試験日から逆算して日次目標を自動生成し、
 * SM-2復習スケジュール、弱点分析、目標管理を統合します。
 */
export interface StudyPlan {
  id?: number;

  // 基本情報
  name: string; // プラン名 (例: "臨床栄養学 期末試験対策")
  examDate: Date; // 試験日
  examType: ExamType; // 試験タイプ
  examName?: string; // 試験の正式名称

  // 目標設定
  targetScore?: number; // 目標点数 (0-100)
  currentLevel: number; // 現在のレベル/正答率 (0-100)
  targetCategories: string[]; // 対象カテゴリー

  // 学習設定
  availableTimePerDay: number; // 1日の学習可能時間（分）
  studyDaysOfWeek: number[]; // 学習曜日 [0-6] (0=日, 1=月, ...)
  preferredStudyTime?: {
    start: string; // "09:00"
    end: string; // "22:00"
  };
  studyMode: StudyMode; // 学習モード

  // 問題配分設定
  problemsPerDay?: number; // 1日の目標問題数（自動計算 or 手動設定）
  newToReviewRatio: number; // 新規:復習の比率 (0.5 = 50%:50%)
  prioritizeWeakness: boolean; // 弱点優先するか

  // プラン構成
  totalProblemsTarget: number; // 目標問題総数
  dailyGoalIds: number[]; // 日次目標IDの配列

  // 進捗状況
  progress: StudyPlanProgress;

  // 統合機能
  linkedGoalIds: number[]; // 連携する StudyGoal の ID
  linkedQuizSetIds: number[]; // 関連する問題セット
  weaknessCategories: WeaknessInfo[]; // 弱点カテゴリー情報

  // 重要度設定
  importancePresetId?: string; // プリセットID
  importanceMode?: import('./multiSubject').ImportanceMode;

  // SM-2統合
  includeSpacedRepetition: boolean; // SM-2復習を含めるか
  spacedRepetitionWeight: number; // SM-2復習の重み (0-1)

  // 状態管理
  isActive: boolean; // アクティブなプランか
  isCompleted: boolean; // 完了したか
  isPaused: boolean; // 一時停止中か

  // メタデータ
  description?: string; // プランの説明
  notes?: string; // メモ
  color?: string; // UI表示用のカラー
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // 時間不足警告
  timeWarning?: string; // プラン作成時の時間不足メッセージ

  // 通知設定
  enableReminders: boolean; // リマインダー有効化
  reminderTime?: string; // 通知時刻 "20:00"

  // PDCA設定
  autoRebalanceWeekly?: boolean; // 週次自動リバランス（デフォルトtrue）
  lastWeeklyRebalance?: Date; // 最終リバランス日
  currentPhase?: 'early' | 'mid' | 'late'; // 現在のフェーズ
  mockExamScope?: 'full' | 'short'; // 模試規模
  frequencyWeightSource?: 'historical' | 'category_stats'; // 出題頻度重みの出典
  importanceManualWeights?: Record<string, number>; // 手動重み
  importancePresetMapping?: Record<string, string>; // プリセットマッピング
}

/**
 * 学習プラン生成パラメータ - プラン自動生成時の入力
 */
export interface StudyPlanGenerationParams {
  // 必須パラメータ
  name: string;
  examDate: Date;
  targetCategories: string[];

  // 学習設定
  availableTimePerDay: number;
  studyDaysOfWeek: number[];

  // オプション
  examType?: ExamType;
  targetScore?: number;
  currentLevel?: number;
  studyMode?: StudyMode;
  newToReviewRatio?: number;
  prioritizeWeakness?: boolean;
  includeSpacedRepetition?: boolean;

  // プラン生成戦略
  autoAdjustDifficulty?: boolean; // 難易度自動調整
  considerHistoricalPerformance?: boolean; // 過去の実績を考慮
  balanceCategories?: boolean; // カテゴリー均等配分

  // Phase 1-3: 多科目優先度スコアベースの配分（2科目以上で有効）
  /** 重要度係数の設定モード - 'preset' | 'manual' | 'uniform' */
  importanceMode?: import('./multiSubject').ImportanceMode;
  /** プリセットID (importanceMode === 'preset' の場合) */
  importancePresetId?: string;
  /** 手動設定値 (importanceMode === 'manual' の場合) */
  importanceManualWeights?: Record<string, import('./multiSubject').ImportanceLevel | number>;
  /** カテゴリー名マッピング (ユーザーカテゴリー → プリセット科目名) */
  importancePresetMapping?: Record<string, string>;
}

/**
 * 学習プラン統計 - 分析とレポート用
 */
export interface StudyPlanStatistics {
  planId: number;

  // 全体統計
  totalStudyDays: number;
  actualStudyDays: number;
  totalProblemsCompleted: number;
  totalStudyTimeMinutes: number;
  overallAccuracy: number;

  // カテゴリー別統計
  categoryStats: Array<{
    category: string;
    problemsSolved: number;
    accuracy: number;
    timeSpent: number;
    improvementRate: number; // 正答率の改善率 (%)
  }>;

  // 日別統計
  dailyStats: Array<{
    date: Date;
    problemsSolved: number;
    accuracy: number;
    studyTime: number;
    goalAchieved: boolean;
  }>;

  // 週別トレンド
  weeklyTrends: Array<{
    weekNumber: number;
    averageAccuracy: number;
    averageDailyProblems: number;
    trendDirection: 'improving' | 'stable' | 'declining';
  }>;

  // 成功指標
  consistencyScore: number; // 継続性スコア (0-100)
  efficiencyScore: number; // 効率スコア (正答率/時間)
  goalAchievementRate: number; // 目標達成率 (%)

  generatedAt: Date;
}

/**
 * 学習プラン調整提案 - AI/アルゴリズムベースの改善提案
 */
export interface StudyPlanAdjustmentSuggestion {
  planId: number;

  // 提案タイプ
  type: 'pace' | 'category' | 'difficulty' | 'time' | 'strategy';
  priority: 'high' | 'medium' | 'low';

  // 提案内容
  title: string;
  description: string;
  reason: string;

  // 具体的な変更提案
  suggestedChanges: {
    field: string; // "problemsPerDay", "studyMode", etc.
    currentValue: any;
    suggestedValue: any;
    expectedImpact: string;
  }[];

  // 予測効果
  estimatedImprovementPercentage?: number;

  createdAt: Date;
}

/**
 * 学習プラン比較 - 複数プランの比較分析
 */
export interface StudyPlanComparison {
  plans: Array<{
    planId: number;
    name: string;
  }>;

  // 比較指標
  metrics: {
    totalStudyTime: number[];
    averageAccuracy: number[];
    problemsCompleted: number[];
    goalAchievementRate: number[];
    consistencyScore: number[];
  };

  // 最良のプラン
  bestPerformer: {
    planId: number;
    metric: string; // どの指標で最良か
    value: number;
  };

  // 推奨事項
  recommendations: string[];

  generatedAt: Date;
}

// ============================================================
// ACTフェーズ: プラン自動調整
// ============================================================

/**
 * ACTトリガータイプ - プラン自動調整の発火条件
 */
export type AdjustmentTrigger =
  | 'low_achievement'      // トリガー1: 達成率<50% 2週連続
  | 'low_accuracy'         // トリガー2: 正答率が目標未達 3週連続
  | 'exam_90days'          // トリガー3: 試験90日前 → 頻出重視
  | 'exam_30days'          // トリガー4: 試験30日前 → 復習のみ
  | 'no_study_streak'      // トリガー5: 3日以上未学習
  | 'mastered_category'    // トリガー6: カテゴリー正答率>90% 3週連続
  | 'exam_date_changed'    // トリガー7: 試験日変更
  | 'quiz_complete'        // トリガー8: クイズ完了後の日次自動調整
  | 'weekly_rebalance'     // トリガー9: 週次リバランス
  | 'manual_rebalance';    // トリガー10: 手動リバランス

/**
 * プラン調整記録 - ACTフェーズの調整履歴
 */
export interface PlanAdjustmentRecord {
  id?: number;
  planId: number;
  trigger: AdjustmentTrigger;
  status: 'pending' | 'approved' | 'rejected' | 'auto_applied';
  title: string;
  description: string;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  createdAt: Date;
  resolvedAt?: Date;
}

/**
 * 今日のタスク詳細情報 - TodayTasksCardコンポーネント用
 *
 * getTodayTasksDetailed()関数の戻り値型。
 * アクティブなプラン全体から今日の学習タスクを集計し、
 * カテゴリー別の内訳、緊急度、SM-2復習期限切れカード数などの
 * 詳細情報を含みます。
 */
export interface TodayTasksDetail {
  /** 今日の日次目標（複数プランからの集計） */
  goals: DailyGoal[];

  /** 合計問題数（新規 + 復習） */
  totalProblems: number;

  /** 推定学習時間（分） */
  estimatedTime: number;

  /** プランID → プラン名のマップ */
  planNames: Map<number, string>;

  /** カテゴリー → 問題数のマップ（トップ3表示用） */
  categoryBreakdown: Map<string, number>;

  /** SM-2スペースドリピティションで期限切れのカード数 */
  sm2DueCount: number;

  /** 緊急度レベル（問題数・時間・SM-2期限切れ数から判定） */
  urgencyLevel: 'low' | 'medium' | 'high';

  /** 複数プランがあるかどうか */
  multiplePlans: boolean;

  /** 今日学習すべきプラン数 */
  todayStudyDayCount: number;

  /** 次の学習日情報（今日の目標達成済み時に表示） */
  nextStudyDay?: {
    /** 次の学習日の日次目標 */
    goals: DailyGoal[];
    /** 次の学習日の日付 */
    date: Date;
    /** 合計問題数 */
    totalProblems: number;
    /** 推定学習時間（分） */
    estimatedTime: number;
  };

  /** 休息日かどうか（アクティブプランはあるが学習予定日ではない） */
  isRestDay: boolean;

  /** 休息日情報（isRestDay=trueの場合に設定） */
  restDayInfo?: {
    /** 次の学習日 */
    nextStudyDate: Date | null;
    /** 次の学習日までの日数 */
    daysUntilNext: number;
    /** 対象カテゴリのSM-2期限切れ問題数 */
    planDueCount: number;
    /** 長期休息かどうか（次の学習日まで7日以上） */
    isLongRest: boolean;
    /** 休息日メッセージ */
    message: string;
  };
}

/**
 * 今日の推奨問題リスト - TodayTasksCard用の具体的な問題リスト
 *
 * getRecommendedProblemsForToday()関数の戻り値型。
 * 今日の日次目標に基づいて、実際に解くべき問題のリストを
 * カテゴリー別・タイプ別（新規/復習/弱点）に整理して返します。
 */
export interface TodayRecommendedProblems {
  /** 新規問題リスト */
  newProblems: Array<{
    problem: import('../types').Problem;
    category: string;
    reason: string; // "弱点強化", "バランス学習", "レベルアップ"
    priority: 'high' | 'medium' | 'low';
  }>;

  /** 復習問題リスト（SM-2期限切れ） */
  reviewProblems: Array<{
    problem: import('../types').Problem;
    category: string;
    dueDate: Date;
    interval: number; // 現在の復習間隔（日数）
    repetitions: number; // 復習回数
    priority: 'high' | 'medium' | 'low';
  }>;

  /** 弱点強化問題リスト */
  weaknessProblems: Array<{
    problem: import('../types').Problem;
    category: string;
    weaknessScore: number; // 弱点スコア (0-100)
    categoryAccuracy: number; // カテゴリー正答率 (0-1)
    priority: 'high' | 'medium' | 'low';
  }>;

  /** カテゴリー別サマリー */
  categorySummary: Map<string, {
    newCount: number;
    reviewCount: number;
    weaknessCount: number;
    totalCount: number;
  }>;

  /** 合計数 */
  totalCount: number;

  /** 推奨される学習順序 */
  recommendedOrder: 'review-first' | 'new-first' | 'mixed' | 'weakness-first';
}
