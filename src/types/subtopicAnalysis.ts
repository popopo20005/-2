/**
 * Subtopic Analysis Types - サブトピック頻出度分析の型定義
 *
 * 個人統計データを蓄積し、カテゴリー内のサブトピック別に
 * 重要度係数を成長させるための型定義。
 *
 * 成長モデル:
 *   信頼度 = f(セッション数, 分析済み問題数)
 *   low    : 1セッション or <150問
 *   medium : 2セッション and >=150問
 *   high   : 3+セッション and >=300問
 */

/**
 * 分析セッション - 1回の過去問分析の記録
 */
export interface AnalysisSession {
  /** セッション固有ID */
  id: string;

  /** セッション名 (例: "2023年度過去問") */
  sessionName: string;

  /** データソースの種類 */
  sourceType: 'past-exam' | 'mock-exam' | 'textbook' | 'question-bank' | 'other';

  /** 出題年度 (判明している場合) */
  sourceYear?: number;

  /** サブトピック別出現カウント */
  distribution: Record<string, number>;

  /** 分析した問題の総数 */
  totalProblems: number;

  /** 分析日時 */
  analyzedAt: Date;

  /** ユーザーメモ */
  notes?: string;

  /** 問題全文データ (個人ローカル統計用) */
  problemTexts?: AnalysisSessionProblem[];
}

/**
 * 分析セッション内の問題データ (頻出問題分析用)
 */
export interface AnalysisSessionProblem {
  /** 問題文 (全文) */
  questionText: string;

  /** サブトピック */
  subtopic: string;

  /** 選択肢 (あれば) */
  options?: string[];

  /** 正解 (あれば) */
  answer?: string;

  /** 出題年度 */
  year?: number;

  /** 出題番号 */
  questionNumber?: number;
}

/**
 * 信頼度レベル
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * 個人サブトピック分析 - カテゴリーごとの蓄積データ
 */
export interface PersonalSubtopicAnalysis {
  id?: number;

  /** 試験プリセットID (例: 'kanri_eiyoushi') or カスタムプリセットID */
  examId: string;

  /** カテゴリー名 (例: '臨床栄養学') */
  category: string;

  /** 蓄積した分析セッション */
  sessions: AnalysisSession[];

  /** マージ済み分布 (全セッション合算) */
  mergedDistribution: Record<string, number>;

  /** 分析済み問題の合計 */
  totalProblemsAnalyzed: number;

  /** 信頼度 */
  confidence: ConfidenceLevel;

  /** 作成日時 */
  createdAt: Date;

  /** 更新日時 */
  updatedAt: Date;
}

/**
 * サブトピック重要度の最終計算結果
 */
export interface SubtopicImportanceResult {
  /** サブトピック名 */
  name: string;

  /** 最終重要度 (1.0-2.0) */
  importance: number;

  /** ソース内訳 */
  source: string;

  /** 信頼度 */
  confidence: ConfidenceLevel | 'baseline';

  /** 出現カウント (個人データ) */
  personalCount?: number;

  /** 出現カウント (プリセット推定) */
  presetImportance?: number;

  /** ブレンド比率 (static:personal) */
  blendRatio?: { static: number; personal: number };
}

/**
 * 頻出問題グループ - 類似問題のクラスタリング結果
 */
export interface FrequentProblemGroup {
  /** グループID */
  id: string;

  /** サブトピック */
  subtopic: string;

  /** 代表的な問題文 */
  representativeText: string;

  /** 出現回数 (年度をまたいだカウント) */
  frequencyCount: number;

  /** 出現年度リスト */
  years: number[];

  /** 類似問題のテキスト一覧 */
  similarTexts: string[];

  /** 類似度スコア (0-1) */
  averageSimilarity: number;
}

/**
 * 頻出度分析結果 - カテゴリー全体のサマリー
 */
export interface FrequencyAnalysisResult {
  /** カテゴリー名 */
  category: string;

  /** サブトピック別重要度 */
  subtopicImportances: SubtopicImportanceResult[];

  /** 頻出問題グループ */
  frequentGroups: FrequentProblemGroup[];

  /** 分析対象の年度範囲 */
  yearRange: { min: number; max: number } | null;

  /** 分析対象の総問題数 */
  totalProblemsAnalyzed: number;

  /** 信頼度 */
  confidence: ConfidenceLevel;

  /** 生成日時 */
  generatedAt: Date;
}

// ============================================================
// バッチ分析用の拡張型
// ============================================================

/**
 * バッチ分析のAI応答 - 年度別分布を含む拡張版
 */
export interface BatchParsedAIResponse {
  /** 全年度合計のサブトピック分布 */
  distribution: Record<string, number>;
  /** 年度別のサブトピック分布 */
  yearDistribution?: Record<string, Record<string, number>>;
  /** 問題ごとの分類結果 */
  problems: AnalysisSessionProblem[];
  /** 総問題数 */
  totalProblems: number;
}

/**
 * マトリクス表示用データ
 */
export interface MatrixData {
  /** サブトピック名リスト（行） */
  subtopics: string[];
  /** 年度リスト（列） */
  years: number[];
  /** matrix[subtopicIndex][yearIndex] = 出現回数 */
  matrix: number[][];
  /** 合計 */
  totals: {
    bySubtopic: number[];
    byYear: number[];
  };
}
