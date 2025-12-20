/**
 * 統計データ集計の型定義
 */

/**
 * 日次統計
 */
export interface DailyStatistics {
  date: Date;
  problemsSolved: number; // 解答数
  correctCount: number; // 正解数
  accuracy: number; // 正解率 (0-1)
  studyTime: number; // 学習時間（秒）
  categories: string[]; // 学習したカテゴリー
}

/**
 * 週次統計
 */
export interface WeeklyStatistics {
  weekStart: Date; // 週の開始日
  weekEnd: Date; // 週の終了日
  totalProblems: number; // 総解答数
  totalCorrect: number; // 総正解数
  averageAccuracy: number; // 平均正解率 (0-1)
  totalStudyTime: number; // 総学習時間（秒）
  studyDays: number; // 学習日数
  dailyStats: DailyStatistics[]; // 日別統計
  topCategories: { category: string; count: number }[]; // よく学習したカテゴリーTOP5
}

/**
 * 月次統計
 */
export interface MonthlyStatistics {
  year: number;
  month: number; // 1-12
  totalProblems: number;
  totalCorrect: number;
  averageAccuracy: number;
  totalStudyTime: number;
  studyDays: number;
  weeklyStats: WeeklyStatistics[]; // 週別統計
  bestWeek: WeeklyStatistics | null; // 最も成果の出た週
  categoryBreakdown: { category: string; count: number; accuracy: number }[];
}

/**
 * トレンドデータポイント
 */
export interface TrendDataPoint {
  date: Date;
  value: number;
  movingAverage?: number; // 移動平均
}

/**
 * トレンド分析結果
 */
export interface TrendAnalysis {
  metric: 'accuracy' | 'problemCount' | 'studyTime';
  dataPoints: TrendDataPoint[];
  trend: 'improving' | 'stable' | 'declining'; // トレンド傾向
  changeRate: number; // 変化率（%）
  prediction?: number; // 次の予測値
}

/**
 * パフォーマンス予測
 */
export interface PerformancePrediction {
  targetDate: Date; // 予測日
  predictedAccuracy: number; // 予測正解率
  predictedProblemsPerDay: number; // 1日あたりの予測解答数
  confidence: number; // 信頼度 (0-1)
  recommendation: string; // 推奨アクション
}

/**
 * 総合統計サマリー
 */
export interface StatisticsSummary {
  allTime: {
    totalProblems: number;
    totalCorrect: number;
    accuracy: number;
    totalStudyTime: number; // 秒
    studyDays: number;
    startDate: Date | null;
  };
  thisWeek: WeeklyStatistics | null;
  thisMonth: MonthlyStatistics | null;
  trends: {
    accuracy: TrendAnalysis;
    activity: TrendAnalysis;
  };
  prediction: PerformancePrediction | null;
}

/**
 * カテゴリー別統計
 */
export interface CategoryStatistics {
  category: string;
  totalProblems: number;
  correctCount: number;
  accuracy: number;
  averageTimePerProblem: number; // 秒
  lastStudied: Date | null;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * エクスポート用統計データ
 */
export interface ExportStatistics {
  exportDate: Date;
  summary: StatisticsSummary;
  dailyHistory: DailyStatistics[];
  categoryStats: CategoryStatistics[];
  goals: any[]; // Goal[]の型
  weaknesses: any[]; // WeakArea[]の型
}
